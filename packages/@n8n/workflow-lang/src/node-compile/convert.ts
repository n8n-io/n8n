import { compile } from '../compiler/index.ts';
import { getNodeParameters } from '../convert/node-parameters.ts';
import type { PublicCredential } from '../credentials/public.ts';
import type { NodeDescription } from '../convert/node-parameters.ts';
import type { CredentialDerivation } from './specialise.ts';
import { hasExpression, specialiseNode } from './specialise.ts';
import { VERIFIED } from './verified.generated.ts';

export interface NodeSources {
	entry: (type: string, version: number) => string | undefined;
	readFile: (path: string) => string | undefined;

	description: (type: string, version: number) => NodeDescription | undefined;

	aliases?: Record<string, string>;

	verified?: Record<string, string[]>;

	publicCredential?: (type: string, id: string | null) => PublicCredential | undefined;

	evaluate?: (code: string) => unknown;

	credentialEntry?: (type: string) => string | undefined;
}

export function verifiedKey(
	type: string,
	version: number,
	parameters: Record<string, unknown>,
): string {
	const text = (v: unknown) => (typeof v === 'string' ? v : '');
	return `${type}@${version}:${text(parameters.resource)}.${text(parameters.operation)}`;
}

export function isVerified(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, compiled.resolved)];
	return names !== undefined && compiled.changed.every((name) => names.includes(name));
}

export function nodeDescriptionOf(value: unknown): NodeDescription | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const name: unknown = Reflect.get(value, 'name');
	const properties: unknown = Reflect.get(value, 'properties');
	if (typeof name !== 'string' || !Array.isArray(properties)) return undefined;
	return { name, properties };
}

function hashOf(text: string): string {
	let h = 0x811c9dc5;
	for (let k = 0; k < text.length; k++) {
		h ^= text.charCodeAt(k);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}

const MAX_ACCEPTED = 4096;

const accepted = new Map<string, string[]>();

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

	if (accepted.size >= MAX_ACCEPTED) accepted.clear();
	accepted.set(source, errors);
	return errors;
}

export interface CompiledNode {
	type: string;
	file: string;
	source: string;

	dynamic: string[];

	resolved: Record<string, unknown>;

	derivations: CredentialDerivation[];

	changed: string[];
}

export function compileNodeInstance(
	sources: NodeSources,
	node: { type: string; version: number; parameters: Record<string, unknown> },
	instanceId: string | null | undefined,

	credentials: Record<string, PublicCredential> = {},
	timezone?: string,
): CompiledNode | { errors: string[] } {
	const entry = sources.entry(node.type, node.version);
	const description = sources.description(node.type, node.version);
	if (entry === undefined || description === undefined) {
		return { errors: ['the source or the description of the node is not there'] };
	}
	let parameters: Record<string, unknown>;
	try {
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
		evaluate: sources.evaluate,
		credentialEntry: sources.credentialEntry,
		timezone,
		instanceId,
		credentialFields: Object.fromEntries(
			Object.entries(credentials).map(([type, c]) => [type, c.fields]),
		),
	};
	let result = specialiseNode(input);
	if (result.source === undefined) return { errors: result.errors };

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
		derivations: result.derivations ?? [],

		changed: [...changed, ...Object.values(credentials).flatMap((c) => c.classes)],
	};
}
