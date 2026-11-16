/**
 * The node compiler in the converter. A node that has no native form and no
 * library node is compiled from its n8n source for its parameters
 * (`specialise.ts`). When the source does not compile, the caller runs the
 * node in the fallback host, as before.
 */
import { compile } from '../compiler/index.ts';
import { getNodeParameters } from '../convert/node-parameters.ts';
import type { NodeDescription } from '../convert/node-parameters.ts';
import { hasExpression, specialiseNode } from './specialise.ts';

/** Where the converter finds the source and the description of a node type (`ConvertOptions.nodeSources`). */
export interface NodeSources {
	/** The path of the file that holds the node class, or undefined when the source is not there. */
	entry: (type: string, version: number) => string | undefined;
	readFile: (path: string) => string | undefined;
	/** The description of the node: the converter needs the defaults of its parameters. */
	description: (type: string, version: number) => NodeDescription | undefined;
	/** Import prefixes that are folders, for example `{ '@utils/': '/repo/nodes-base/utils/' }`. */
	aliases?: Record<string, string>;
}

/** FNV-1a, as 8 hexadecimal digits: the name of a compiled module. */
function hashOf(text: string): string {
	let h = 0x811c9dc5;
	for (let k = 0; k < text.length; k++) {
		h ^= text.charCodeAt(k);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

/** Results of the subset compiler by module text: the same node instance compiles once. */
const accepted = new Map<string, string[]>();

/** The diagnostics of the subset compiler for a compiled module, as text. */
function subsetErrors(type: string, version: number, source: string): string[] {
	const known = accepted.get(source);
	if (known) return known;
	const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';
export default workflow({
	triggers: [webhook({ path: 'check' })],
	async run(ctx) {
		return await ctx.node({ name: 'Node', type: ${JSON.stringify(type)}, typeVersion: ${version}, parameters: {} });
	},
});
`;
	let errors: string[];
	try {
		const result = compile(workflow, { nodes: { 'nodes/compiled-check.ts': source } });
		errors = result.diagnostics.map((d) => `${d.code}: ${d.message}`);
	} catch (error) {
		errors = [error instanceof Error ? error.message : String(error)];
	}
	accepted.set(source, errors);
	return errors;
}

export interface CompiledNode {
	/** The type that the `ctx.node` call names: the node type and the hash of the module. */
	type: string;
	file: string;
	source: string;
	/** Names of the parameters that are expressions: the call passes their values. */
	dynamic: string[];
}

/** Compiles a node from its source, or gives the reasons why it does not compile. */
export function compileNodeInstance(
	sources: NodeSources,
	node: { type: string; version: number; parameters: Record<string, unknown> },
	instanceId: string | undefined,
): CompiledNode | { errors: string[] } {
	const entry = sources.entry(node.type, node.version);
	const description = sources.description(node.type, node.version);
	if (entry === undefined || description === undefined) {
		return { errors: ['the source or the description of the node is not there'] };
	}
	let parameters: Record<string, unknown>;
	try {
		// The parameters as n8n gives them to the node: with the defaults of the description.
		parameters =
			getNodeParameters(
				description.properties,
				node.parameters,
				true,
				false,
				node.version,
				description,
			) ?? {};
	} catch (error) {
		return { errors: [error instanceof Error ? error.message : String(error)] };
	}
	const input = {
		type: node.type,
		version: node.version,
		entry,
		readFile: sources.readFile,
		parameters,
		aliases: sources.aliases,
		instanceId,
	};
	let result = specialiseNode(input);
	if (result.source === undefined) return { errors: result.errors };
	// The module names itself with a type of its own, so that two nodes of one type
	// with other parameters link to their own modules.
	const type = `${node.type}#${hashOf(result.source)}`;
	result = specialiseNode({ ...input, moduleType: type });
	if (result.source === undefined) return { errors: result.errors };
	const errors = subsetErrors(type, node.version, result.source);
	if (errors.length > 0) return { errors };
	return {
		type,
		file: `nodes/compiled-${type.slice(type.indexOf('#') + 1)}.ts`,
		source: result.source,
		dynamic: Object.keys(parameters).filter((name) => hasExpression(parameters[name])),
	};
}
