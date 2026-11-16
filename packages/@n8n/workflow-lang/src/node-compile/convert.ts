/**
 * The node compiler in the converter. A node that has no native form and no
 * library node is compiled from its n8n source for its parameters
 * (`specialise.ts`). When the source does not compile, the caller runs the
 * node in the fallback host, as before.
 */
import { compile } from '../compiler/index.ts';
import { getNodeParameters } from '../convert/node-parameters.ts';
import type { PublicCredential } from '../credentials/public.ts';
import type { NodeDescription } from '../convert/node-parameters.ts';
import { hasExpression, specialiseNode } from './specialise.ts';
import { VERIFIED } from './verified.generated.ts';

/** Where the converter finds the source and the description of a node type (`ConvertOptions.nodeSources`). */
export interface NodeSources {
	/** The path of the file that holds the node class, or undefined when the source is not there. */
	entry: (type: string, version: number) => string | undefined;
	readFile: (path: string) => string | undefined;
	/** The description of the node: the converter needs the defaults of its parameters. */
	description: (type: string, version: number) => NodeDescription | undefined;
	/** Import prefixes that are folders, for example `{ '@utils/': '/repo/nodes-base/utils/' }`. */
	aliases?: Record<string, string>;
	/**
	 * The operations that are checked against the v1 node, in place of the bundled list
	 * (`verified.generated.ts`): `type@version:resource.operation` gives the parameter names
	 * that the check set.
	 */
	verified?: Record<string, string[]>;
	/**
	 * The public part of a credential (`publicCredential` of its decrypted data), by the
	 * credential type and the id of the credential. Without it every credential field is a
	 * template, and node code that branches on a field does not compile.
	 */
	publicCredential?: (type: string, id: string | null) => PublicCredential | undefined;
}

/** The key of an operation in the verified list. */
export function verifiedKey(
	type: string,
	version: number,
	parameters: Record<string, unknown>,
): string {
	const text = (v: unknown) => (typeof v === 'string' ? v : '');
	return `${type}@${version}:${text(parameters.resource)}.${text(parameters.operation)}`;
}

/**
 * True when the v1 node is the reference of this node instance: its operation is in the
 * verified list, and it sets no parameter that the check did not set. A compiled node that
 * was never compared with v1 does not run.
 */
export function isVerified(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, compiled.resolved)];
	return names !== undefined && compiled.changed.every((name) => names.includes(name));
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

/** The most module texts whose check result is kept. */
const MAX_ACCEPTED = 4096;

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
	// The table has a limit: at the limit it starts again, and a module is checked once more.
	if (accepted.size >= MAX_ACCEPTED) accepted.clear();
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
	/** The parameters with the defaults of the description. */
	resolved: Record<string, unknown>;
	/** Names of the parameters whose value is not the default of the operation. */
	changed: string[];
}

/** Compiles a node from its source, or gives the reasons why it does not compile. */
export function compileNodeInstance(
	sources: NodeSources,
	node: { type: string; version: number; parameters: Record<string, unknown> },
	instanceId: string | null | undefined,
	/** The public part of the node's credentials, by credential type (`publicCredential`). */
	credentials: Record<string, PublicCredential> = {},
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
	// The parameters that the node sets: those that differ from the defaults of its operation.
	let changed: string[];
	try {
		const defaults =
			getNodeParameters(
				description.properties,
				{ resource: parameters.resource, operation: parameters.operation },
				true,
				false,
				node.version,
				description,
			) ?? {};
		changed = Object.keys(parameters).filter(
			(name) =>
				name !== 'resource' &&
				name !== 'operation' &&
				JSON.stringify(parameters[name]) !== JSON.stringify(defaults[name]),
		);
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
		credentialFields: Object.fromEntries(
			Object.entries(credentials).map(([type, c]) => [type, c.fields]),
		),
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
		resolved: parameters,
		// The classes of the credential fields count as set parameters: the branch that a field
		// selects must be one that was checked against v1.
		changed: [...changed, ...Object.values(credentials).flatMap((c) => c.classes)],
	};
}
