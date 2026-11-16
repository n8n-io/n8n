import { compile } from '../compiler/index.ts';
import { CREDENTIAL_FLAGS_PREFIX } from '../credentials/flags.ts';
import { getNodeParameters } from '../convert/node-parameters.ts';
import type { PublicCredential } from '../credentials/public.ts';
import type { NodeDescription } from '../convert/node-parameters.ts';
import type {
	CredentialDerivation,
	CredentialMint,
	ParameterKind,
	PublishFacts,
	RandomShape,
} from './specialise.ts';
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

	storesResponses?: boolean;

	runsInHost?: (nodeName: string) => boolean;
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
	if (names === undefined || !compiled.changed.every((name) => names.includes(name))) return false;
	if (
		!itemParameterNames(compiled).every((name) =>
			names.includes(itemParameterCondition(name, compiled.errorMode)),
		)
	)
		return false;
	return (
		compiled.flags.length === 0 || verifiedFlagKeys(sources, type, version, compiled).length > 0
	);
}

export function verifiedFlagKeys(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): string[] {
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, compiled.resolved)];
	const wanted = compiled.flags
		.map((flag) => flag.name)
		.sort()
		.join(',');
	const flagsOf = (key: string) =>
		key
			.slice(CREDENTIAL_FLAGS_PREFIX.length)
			.split(',')
			.map((part) => part.slice(0, part.indexOf(':')))
			.join(',');
	return (names ?? []).filter(
		(name) => name.startsWith(CREDENTIAL_FLAGS_PREFIX) && flagsOf(name) === wanted,
	);
}

export function flagGuard(
	compiled: CompiledNode,
	allowed: string[],
	node: string,
): CredentialDerivation {
	const flags = compiled.flags.map((flag) => flag.name).sort();
	return {
		name: `g${hashOf(JSON.stringify([flags, [...allowed].sort(), node]))}`,
		code: '',
		kind: 'guard',
		flags,
		allowed: [...allowed].sort(),
		node,
	};
}

export type ErrorMode = 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';

export const CONTINUE_MODES: ErrorMode[] = ['continueRegularOutput', 'continueErrorOutput'];

export const ERROR_ITEMS_BY_POSITION = '@errorItems=position';

export const CALL_FOR_EACH_ITEM = '@items=each';

export const ITEM_PARAMETER_PREFIX = '@each=';

export const ONE_CALL_PREFIX = '@oneCall=';

export const PAIRED_ITEMS = '@pairedItems';

export function itemParameterCondition(name: string, mode: ErrorMode = 'stopWorkflow'): string {
	return mode === 'stopWorkflow'
		? `${ITEM_PARAMETER_PREFIX}${name}`
		: `${ITEM_PARAMETER_PREFIX}${name}@${mode}`;
}

export function oneCallCondition(mode: ErrorMode): string {
	return `${ONE_CALL_PREFIX}${mode}`;
}

export function callsOnce(
	sources: NodeSources,
	type: string,
	version: number,
	resolved: Record<string, unknown>,
	mode: ErrorMode,
): boolean {
	if (mode === 'stopWorkflow') return true;
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, resolved)];
	return names?.includes(oneCallCondition(mode)) === true;
}

export function pairsAsV1(
	sources: NodeSources,
	type: string,
	version: number,
	resolved: Record<string, unknown>,
): boolean {
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, resolved)];
	return names?.includes(PAIRED_ITEMS) === true;
}

export function itemParameterNames(compiled: CompiledNode): string[] {
	return [...new Set(compiled.itemParameters.map((path) => path.split('.')[0]))].sort();
}

export function valueAtPath(parameters: Record<string, unknown>, path: string): unknown {
	let value: unknown = parameters;
	for (const key of path.split('.')) value = isRecord(value) ? value[key] : undefined;
	return value;
}

export function agreesForEachItem(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, compiled.resolved)];
	return names?.includes(CALL_FOR_EACH_ITEM) === true;
}

export function errorItemsByPosition(
	sources: NodeSources,
	type: string,
	version: number,
	compiled: CompiledNode,
): boolean {
	const names = (sources.verified ?? VERIFIED)[verifiedKey(type, version, compiled.resolved)];
	return names?.includes(ERROR_ITEMS_BY_POSITION) === true;
}

export function errorModeCondition(mode: ErrorMode): string[] {
	return mode === 'stopWorkflow' ? [] : [`@onError=${mode}`];
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

	itemParameters: string[];

	firstItemParameters: string[];

	deferred: string[];

	errorMode: ErrorMode;

	pairedOutput: boolean;

	resolved: Record<string, unknown>;

	derivations: CredentialDerivation[];

	flags: CredentialDerivation[];

	mints: CredentialMint[];

	randoms: RandomShape[];
	binary: boolean;

	storesResponses: boolean;

	changed: string[];

	zones: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function kindOf(property: unknown): ParameterKind | undefined {
	if (!isRecord(property) || typeof property.type !== 'string') return undefined;
	const kind: ParameterKind = { type: property.type, extract: Boolean(property.extractValue) };
	if (property.type !== 'resourceLocator') return kind;
	if (!Array.isArray(property.modes)) return undefined;
	const modes: NonNullable<ParameterKind['modes']> = {};
	for (const mode of property.modes) {
		if (!isRecord(mode) || typeof mode.name !== 'string' || mode.name in modes) return undefined;
		const rule = mode.extractValue;
		if (!rule) {
			modes[mode.name] = null;
			continue;
		}
		if (!isRecord(rule) || rule.type !== 'regex') return undefined;
		if (typeof rule.regex === 'string') modes[mode.name] = { pattern: rule.regex, flags: '' };
		else if (rule.regex instanceof RegExp)
			modes[mode.name] = { pattern: rule.regex.source, flags: rule.regex.flags };
		else return undefined;
	}
	return { ...kind, modes };
}

export function parameterKindOf(
	description: NodeDescription,
	name: string,
): ParameterKind | undefined {
	const kinds = description.properties.filter((p) => p.name === name).map(kindOf);
	const first = kinds[0];
	if (first === undefined) return undefined;
	const text = JSON.stringify(first);
	return kinds.every((kind) => kind !== undefined && JSON.stringify(kind) === text)
		? first
		: undefined;
}

export function compileNodeInstance(
	sources: NodeSources,
	node: { type: string; version: number; parameters: Record<string, unknown> },
	instanceId: string | null | undefined,

	credentials: Record<string, PublicCredential> = {},
	timezone?: string,
	facts?: PublishFacts,
	errorMode: ErrorMode = 'stopWorkflow',
	deferred: string[] = [],
	pairedOutput = false,
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
		parameterKind: (name: string) => parameterKindOf(description, name),
		evaluate: sources.evaluate,
		credentialEntry: sources.credentialEntry,
		timezone,
		instanceId,
		facts,
		continueOnFail: errorMode !== 'stopWorkflow',
		deferredParameters: deferred,
		pairedOutput,
		credentialFields: Object.fromEntries(
			Object.entries(credentials).map(([type, c]) => [type, c.fields]),
		),
	};
	const result = specialiseNode(input);
	if (result.source === undefined || result.retyped === undefined) return { errors: result.errors };

	const type = `${node.type}#${hashOf(result.source)}`;
	const source = result.retyped(type);
	const errors = subsetErrors(type, node.version, source);
	if (errors.length > 0) return { errors };
	return {
		type,
		file: `nodes/compiled-${type.slice(type.indexOf('#') + 1)}.ts`,
		source,
		dynamic: Object.keys(parameters).filter((name) => hasExpression(parameters[name])),
		itemParameters: result.itemParameters ?? [],
		firstItemParameters: result.firstItemParameters ?? [],
		deferred: (result.itemParameters ?? []).filter((path) => deferred.includes(path)),
		errorMode,
		pairedOutput,
		resolved: parameters,
		derivations: (result.derivations ?? []).filter((d) => d.kind === undefined),
		flags: (result.derivations ?? []).filter((d) => d.kind === 'flag'),
		mints: result.mints ?? [],
		zones: result.zones ?? [],
		randoms: result.randoms ?? [],
		binary: result.binary === true,
		storesResponses: result.storesResponses === true,

		changed: [
			...changed,
			...Object.values(credentials).flatMap((c) => c.classes),
			...errorModeCondition(errorMode),
		],
	};
}
