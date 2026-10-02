import { createHash, verify } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import {
	UnexpectedError,
	UserError,
	type IDataObject,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { usesBinary, usesHostImports, usesProviders, type ContractDocument } from './define';
import { legacyManifestSchema, versionManifestSchema } from './manifest';
import { hasPageValue, type JsonSchema } from './schema';
import { providedOf } from './providers';
import { matches } from './validate';

/**
 * A Node Contract version, `major.minor.patch`: the one version of the spec (`spec/wit` and
 * `spec/manifest.schema.json`). Its semver does not follow the n8n version: a minor adds an
 * optional import, export or field, a major breaks. `@since` in the spec tells what each minor
 * adds.
 * 2.1.0 adds the current input item, the batch cardinality, and named outputs.
 * 2.2.0 adds binary data.
 * 2.3.0 adds the optional host imports (data tables, code, wait, the input of an item), named
 * inputs, and providers (`provider.input()`).
 * 2.4.0 adds the `list` binding, which the host pages through, and `t.pageValue()` inputs, which the
 * host reads unresolved.
 * 2.5.0 adds the manifest format with `kind`, `sdk` and credential majors, credential
 * manifests, and the trigger, credential and provider interfaces.
 * A bundle of the 1.x major runs through the adapter `action-api-v1.ts`.
 */
export type NodeContractVersion = `${number}.${number}.${number}`;

/** The newest version this host implements. */
export const NODE_CONTRACT_VERSION: NodeContractVersion = '2.5.0';

/** The newest version of each major that this host runs. */
export const IMPLEMENTED_NODE_CONTRACTS: readonly NodeContractVersion[] = [
	'1.0.0',
	NODE_CONTRACT_VERSION,
];

/** The versions a host accepts when its config sets no range. */
export const DEFAULT_NODE_CONTRACT_RANGE = '>=1.0.0 <3.0.0';

export const isNodeContractVersion = (value: unknown): value is NodeContractVersion =>
	typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);

/** The kind of a contract: a trigger starts executions, a provider supplies a capability. */
export const manifestKindOf = (
	contract: Pick<ContractDocument, 'trigger' | 'output'>,
): VersionManifest['kind'] =>
	contract.trigger !== undefined
		? 'trigger'
		: providedOf(contract.output) !== undefined
			? 'provider'
			: 'action';

/**
 * The version `freezeAction` writes: the lowest minor that has what the action declares, so an
 * older host still runs every bundle that does not need the newer features. The 2.1.0 features
 * (the current item) are used in code, so the contract cannot show a lower minimum. The contract
 * does not record the binding, so `list` tells it. A trigger runs in JS as an action does, so it
 * needs no newer minor.
 */
export const requiredNodeContractOf = (
	contract: Pick<ContractDocument, 'input' | 'output' | 'imports' | 'inputs'>,
	list = false,
): NodeContractVersion =>
	list || hasPageValue(contract.input)
		? '2.4.0'
		: usesHostImports(contract) || usesProviders(contract)
			? '2.3.0'
			: usesBinary(contract)
				? '2.2.0'
				: '2.1.0';

/**
 * The version a manifest states: `nodeContract`, or for a manifest frozen before it the
 * `apiVersion: "n8n:action@x.y.z"` or `abi: 1 | 2`. The action API versions are the Node
 * Contract versions of the same number.
 */
export function declaredNodeContractOf(
	value: Record<string, unknown>,
): NodeContractVersion | undefined {
	if (isNodeContractVersion(value.nodeContract)) return value.nodeContract;
	const legacy =
		typeof value.apiVersion === 'string'
			? /^n8n:action@(.*)$/.exec(value.apiVersion)?.[1]
			: undefined;
	if (isNodeContractVersion(legacy)) return legacy;
	return value.abi === 1 || value.abi === 2 ? `${value.abi}.0.0` : undefined;
}

/** A newer minor than the host has uses imports or fields that the host lacks. */
export const implementsNodeContract = (version: NodeContractVersion) => {
	const { major, minor } = parseSemver(version);
	return IMPLEMENTED_NODE_CONTRACTS.some((implemented) => {
		const known = parseSemver(implemented);
		return known.major === major && known.minor >= minor;
	});
};

// One slot: the host sets its configured range once at start.
const nodeContractRange = new Map<
	'range',
	{ text: string; includes: (version: string) => boolean }
>();

/** Sets the Node Contract versions this host runs, e.g. `>=2.0.0 <3.0.0`. Throws for a bad range. */
export const setNodeContractRange = (range: string) => {
	nodeContractRange.set('range', { text: range, includes: semverRange(range) });
};

const rangeOf = () =>
	nodeContractRange.get('range') ?? {
		text: DEFAULT_NODE_CONTRACT_RANGE,
		includes: semverRange(DEFAULT_NODE_CONTRACT_RANGE),
	};

/** In the configured range, and implemented by this host. */
export const runsNodeContract = (version: NodeContractVersion) =>
	rangeOf().includes(version) && implementsNodeContract(version);

export function assertNodeContract({
	id,
	semver,
	nodeContract,
}: Pick<VersionManifest, 'id' | 'semver' | 'nodeContract'>) {
	if (runsNodeContract(nodeContract)) return;
	throw new UserError(
		`${id}@${semver} needs Node Contract ${nodeContract}. This host runs ${rangeOf().text} and implements ${IMPLEMENTED_NODE_CONTRACTS.join(', ')}.`,
	);
}

/** One frozen version of an action, trigger or provider. A published `id` and `semver` never change their bytes. */
export interface VersionManifest {
	readonly kind: 'action' | 'trigger' | 'provider';
	readonly id: string;
	/** `major.minor.patch`; the major is `contract.version` and the n8n `typeVersion`. */
	readonly semver: string;
	/** The lowest Node Contract version that has what the bundle uses. */
	readonly nodeContract: NodeContractVersion;
	/** The `@n8n/node-sdk` version that froze it, for traceability only. An older SDK did not write it. */
	readonly sdk?: string;
	/**
	 * `<name>@<major>` of each credential type of `contract.credentials` that has a credential
	 * manifest. A compat type has none: its legacy class defines it. Absent when none has one.
	 */
	readonly credentials?: readonly string[];
	/** The normative hash, see `contractHash`. */
	readonly contractHash: string;
	readonly bundleHash: string;
	readonly contract: ContractDocument;
	/** The node description at freeze time, so the UI of a version never changes. */
	readonly description: INodeTypeDescription;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const sortKeys = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(sortKeys)
		: isRecord(value)
			? Object.fromEntries(
					Object.keys(value)
						.sort()
						.map((key) => [key, sortKeys(value[key])]),
				)
			: value;

/** JSON with sorted object keys, so equal values give equal text. */
export const canonicalJson = (value: unknown) => JSON.stringify(sortKeys(value));

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

const PROSE_KEYWORDS = new Set(['title', 'description', 'x-n8n-hint', 'examples']);
const SCHEMA_MAPS = new Set(['properties', 'patternProperties', 'x-n8n-value-types']);

/** A schema without its prose keywords. Property names stay, also `description`. */
const normativeSchema = (schema: unknown): unknown =>
	isRecord(schema)
		? Object.fromEntries(
				Object.entries(schema)
					.filter(([keyword]) => !PROSE_KEYWORDS.has(keyword))
					.map(([keyword, value]) => [
						keyword,
						SCHEMA_MAPS.has(keyword) && isRecord(value)
							? Object.fromEntries(
									Object.entries(value).map(([name, child]) => [name, normativeSchema(child)]),
								)
							: Array.isArray(value) && (keyword === 'oneOf' || keyword === 'anyOf')
								? value.map(normativeSchema)
								: keyword === 'items' || keyword === 'additionalProperties'
									? normativeSchema(value)
									: value,
					]),
			)
		: schema;

/**
 * Hashes only what a workflow depends on. Prose (action, summary, hints) and minor and patch
 * stay outside, so a patch keeps the hash and a typo fix is no contract change.
 */
export const contractHash = (contract: ContractDocument) =>
	sha256(
		canonicalJson({
			id: contract.id,
			major: contract.version,
			node: contract.node,
			flow: contract.flow,
			credentials: contract.credentials,
			// Optional keys keep the hash of each contract that has neither. Scopes are a set.
			...(contract.scopes?.length ? { scopes: [...contract.scopes].sort() } : {}),
			...(contract.trigger ? { trigger: contract.trigger } : {}),
			input: normativeSchema(contract.input),
			output: normativeSchema(contract.output),
			// Only when set, so the hash of an action with one output stays the same.
			...(contract.outputs ? { outputs: contract.outputs } : {}),
			// The hosts an action may reach are a permission, so they are part of the contract. A set.
			...(contract.egress
				? { egress: { ...contract.egress, hosts: [...(contract.egress.hosts ?? [])].sort() } }
				: {}),
			// A host import is a permission, as a host is. A set.
			...(contract.imports?.length ? { imports: [...contract.imports].sort() } : {}),
			...(contract.inputs ? { inputs: contract.inputs } : {}),
		}),
	);

export interface Semver {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
}

export function parseSemver(text: string): Semver {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
	if (!match) throw new UserError(`${text} is not a major.minor.patch version`);
	return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** Negative when `a` is older than `b`. */
export function compareSemver(a: string, b: string): number {
	const [x, y] = [parseSemver(a), parseSemver(b)];
	return x.major - y.major || x.minor - y.minor || x.patch - y.patch;
}

const COMPARATORS: ReadonlyMap<string, (order: number) => boolean> = new Map([
	['>=', (order: number) => order >= 0],
	['>', (order: number) => order > 0],
	['<=', (order: number) => order <= 0],
	['<', (order: number) => order < 0],
	['=', (order: number) => order === 0],
]);

/**
 * A test for a semver range: comparator sets joined by `||`, e.g. `>=1.0.0 <3.0.0`. Each
 * comparator has a full `major.minor.patch` version.
 */
export function semverRange(range: string): (version: string) => boolean {
	const sets = range.split('||').map((set) =>
		set
			.trim()
			.split(/\s+/)
			.map((part) => {
				const [, operator = '=', bound = ''] = /^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/.exec(part) ?? [];
				const test = COMPARATORS.get(operator);
				if (!bound || !test) {
					throw new UserError(`"${range}" is not a semver range, for example ">=1.0.0 <3.0.0"`);
				}
				return (version: string) => test(compareSemver(version, bound));
			}),
	);
	return (version) => sets.some((set) => set.every((test) => test(version)));
}

/**
 * Reads a manifest of an action, trigger or provider. A manifest frozen by an older SDK gets its
 * `kind` from its contract and its `nodeContract` from `apiVersion` or `abi`.
 */
export function parseManifest(text: string): VersionManifest {
	const value: unknown = JSON.parse(text);
	const current = matches(versionManifestSchema, value) ? value : undefined;
	const legacy = !current && matches(legacyManifestSchema, value) ? value : undefined;
	const fields = current ?? legacy;
	const nodeContract = current?.nodeContract ?? (legacy && declaredNodeContractOf(legacy));
	if (
		!fields ||
		!nodeContract ||
		contractHash(fields.contract) !== fields.contractHash ||
		parseSemver(fields.semver).major !== fields.contract.version
	) {
		throw new UnexpectedError('The version manifest is not valid or its contract changed');
	}
	const { id, semver, contractHash: hash, bundleHash, contract, description } = fields;
	// Fields that this host does not know stay out.
	return {
		kind: current?.kind ?? manifestKindOf(contract),
		id,
		semver,
		nodeContract,
		...(current?.sdk === undefined ? {} : { sdk: current.sdk }),
		...(current?.credentials ? { credentials: current.credentials } : {}),
		contractHash: hash,
		bundleHash,
		contract,
		description,
	};
}

export type ChangeKind = 'patch' | 'minor' | 'major';

export interface ContractChange {
	readonly kind: Exclude<ChangeKind, 'patch'>;
	readonly text: string;
}

export interface ContractDiff {
	/** `patch` when nothing normative changed. */
	readonly kind: ChangeKind;
	/** True when some parameters valid for the old input fail the new one. */
	readonly breaksInput: boolean;
	readonly changes: readonly ContractChange[];
}

type Side = 'input' | 'output';

/** A narrower input rejects old parameters; a wider output drops a guarantee. */
const narrowed = (side: Side, narrower: boolean, text: string): ContractChange => ({
	kind: (side === 'input') === narrower ? 'major' : 'minor',
	text,
});

const major = (text: string): ContractChange => ({ kind: 'major', text });

const LOWER_BOUNDS = ['minLength', 'minimum', 'minItems'] as const;
const EXACT_KEYWORDS = [
	'const',
	'format',
	'pattern',
	'x-n8n-ref',
	'x-n8n-literal',
	'x-n8n-passed',
	'x-n8n-declared',
] as const;

function boundChanges(side: Side, at: string, prev: JsonSchema, next: JsonSchema) {
	const lower = LOWER_BOUNDS.flatMap((keyword) => {
		const [old, now] = [prev[keyword] ?? -Infinity, next[keyword] ?? -Infinity];
		return old === now ? [] : [narrowed(side, now > old, `${at} ${keyword} ${old} → ${now}`)];
	});
	const [oldMax, newMax] = [prev.maximum ?? Infinity, next.maximum ?? Infinity];
	const upper =
		oldMax === newMax
			? []
			: [narrowed(side, newMax < oldMax, `${at} maximum ${oldMax} → ${newMax}`)];
	const exact = EXACT_KEYWORDS.flatMap((keyword) => {
		const [old, now] = [prev[keyword], next[keyword]];
		if (canonicalJson(old) === canonicalJson(now)) return [];
		if (old === undefined) return [narrowed(side, true, `${at} adds ${keyword}`)];
		if (now === undefined) return [narrowed(side, false, `${at} drops ${keyword}`)];
		return [major(`${at} changes ${keyword}`)];
	});
	const closed = (schema: JsonSchema) => schema.additionalProperties === false;
	const additional =
		closed(prev) === closed(next)
			? []
			: [narrowed(side, closed(next), `${at} ${closed(next) ? 'closes' : 'opens'} properties`)];
	return [...lower, ...upper, ...exact, ...additional];
}

function enumChanges(side: Side, at: string, prev: JsonSchema, next: JsonSchema) {
	if (!prev.enum && !next.enum) return [];
	if (!prev.enum || !next.enum) return [narrowed(side, !prev.enum, `${at} enum added or removed`)];
	const [old, now] = [prev.enum, next.enum];
	const dropped = old.filter((value) => !now.includes(value));
	const added = now.filter((value) => !old.includes(value));
	return [
		...(dropped.length ? [narrowed(side, true, `${at} drops ${dropped.join(', ')}`)] : []),
		...(added.length ? [narrowed(side, false, `${at} adds ${added.join(', ')}`)] : []),
	];
}

const isRequired = (schema: JsonSchema, name: string) => (schema.required ?? []).includes(name);

function propertyChanges(side: Side, at: string, prev: JsonSchema, next: JsonSchema) {
	const [before, after] = [prev.properties ?? {}, next.properties ?? {}];
	const names = [...new Set([...Object.keys(before), ...Object.keys(after)])];
	return names.flatMap((name): ContractChange[] => {
		const [old, now, path] = [before[name], after[name], `${at}.${name}`];
		const required = isRequired(next, name);
		// n8n fills a default into old parameters, so a required field with one rejects nothing.
		const defaulted = side === 'input' && now?.default !== undefined;
		if (!now) return [major(`${path} removed`)];
		if (!old) {
			return [
				narrowed(side, required && !defaulted, `${path} added${required ? ' as required' : ''}`),
			];
		}
		const requiredChange =
			isRequired(prev, name) === required
				? []
				: [
						narrowed(
							side,
							required && !defaulted,
							`${path} is ${required ? 'required' : 'optional'}`,
						),
					];
		return [...requiredChange, ...schemaChanges(side, path, old, now)];
	});
}

function variantChanges(side: Side, at: string, prev: JsonSchema, next: JsonSchema) {
	return (['oneOf', 'anyOf'] as const).flatMap((keyword) => {
		const [old, now] = [prev[keyword] ?? [], next[keyword] ?? []];
		const count =
			old.length === now.length
				? []
				: [
						narrowed(
							side,
							now.length < old.length,
							`${at} ${keyword} ${old.length} → ${now.length}`,
						),
					];
		const shared = old.slice(0, now.length).flatMap((variant, index) => {
			const other = now[index];
			return other ? schemaChanges(side, `${at}.${keyword}[${index}]`, variant, other) : [];
		});
		return [...count, ...shared];
	});
}

/** Classifies one schema change by the rules of the contract diff engine. */
function schemaChanges(
	side: Side,
	at: string,
	prev: JsonSchema,
	next: JsonSchema,
): ContractChange[] {
	const itemChanges =
		prev.items && next.items
			? schemaChanges(side, `${at}[]`, prev.items, next.items)
			: prev.items || next.items
				? [narrowed(side, Boolean(next.items), `${at} items added or removed`)]
				: [];
	return [
		...(prev.type !== next.type ? [major(`${at} type ${prev.type} → ${next.type}`)] : []),
		// n8n saves no value equal to the default, so a new default changes old parameters.
		...(side === 'input' && canonicalJson(prev.default) !== canonicalJson(next.default)
			? [major(`${at} changes default`)]
			: []),
		...enumChanges(side, at, prev, next),
		...boundChanges(side, at, prev, next),
		...propertyChanges(side, at, prev, next),
		...itemChanges,
		...variantChanges(side, at, prev, next),
	];
}

const outputText = (outputs: ContractDocument['outputs']) =>
	outputs === undefined
		? 'one output'
		: 'each' in outputs
			? `one output per ${outputs.each} entry${outputs.then?.length ? `, then ${outputs.then.join(', ')}` : ''}`
			: outputs.join(', ');

/**
 * n8n saves a connection by output index. A removed, renamed, or moved output breaks a saved
 * connection. An added output also is major: a saved workflow leaves it unconnected, so the
 * items the new version routes there stop without an error.
 */
function outputChanges(prev: ContractDocument, next: ContractDocument): ContractChange[] {
	if (canonicalJson(prev.outputs) === canonicalJson(next.outputs)) return [];
	return [major(`outputs ${outputText(prev.outputs)} → ${outputText(next.outputs)}`)];
}

const egressSources = ({ egress }: ContractDocument) => [
	...(egress?.hosts ?? []),
	...(egress?.fromInput === undefined ? [] : [`the host of input.${egress.fromInput}`]),
];

/**
 * A new host is a new permission, as a new scope is, so a user must accept it: a major. A
 * removed host only narrows what the action reaches: a minor. A removed `egress` is a major:
 * without a base URL, an action without `egress` has no action limit.
 */
function egressChanges(prev: ContractDocument, next: ContractDocument): ContractChange[] {
	const [before, after] = [egressSources(prev), egressSources(next)];
	if (prev.egress && !next.egress) return [major('egress removed')];
	return [
		...after.filter((host) => !before.includes(host)).map((host) => major(`egress ${host} added`)),
		...before
			.filter((host) => !after.includes(host))
			.map((host): ContractChange => ({ kind: 'minor', text: `egress ${host} removed` })),
	];
}

/** n8n saves a connection by input index, as by output index. */
function inputChanges(prev: ContractDocument, next: ContractDocument): ContractChange[] {
	if (canonicalJson(prev.inputs) === canonicalJson(next.inputs)) return [];
	const text = (inputs: ContractDocument['inputs']) => inputs?.join(', ') ?? 'one input';
	return [major(`inputs ${text(prev.inputs)} → ${text(next.inputs)}`)];
}

/** A new host import is a new permission, as a new egress host is: a major. A removed one is a minor. */
function importChanges(prev: ContractDocument, next: ContractDocument): ContractChange[] {
	const [before, after] = [prev.imports ?? [], next.imports ?? []];
	return [
		...after.filter((name) => !before.includes(name)).map((name) => major(`import ${name} added`)),
		...before
			.filter((name) => !after.includes(name))
			.map((name): ContractChange => ({ kind: 'minor', text: `import ${name} removed` })),
	];
}

/**
 * Classifies the change between two versions of one action: additive optional input (or a
 * new required input with a default), a removed scope or a removed egress host is minor; a
 * new required input, a removed or narrowed output, a changed output list, a changed flow, a
 * new scope or a new egress host is major; no normative change is a patch.
 */
export function diffContracts(prev: ContractDocument, next: ContractDocument): ContractDiff {
	const input = schemaChanges('input', 'input', prev.input, next.input);
	const changes = [
		...(prev.id !== next.id || prev.node !== next.node ? [major('id or node changed')] : []),
		...(canonicalJson(prev.flow) !== canonicalJson(next.flow) ? [major('flow changed')] : []),
		...(prev.trigger !== next.trigger ? [major('trigger kind changed')] : []),
		// A saved credential may lack a new scope, so the workflow can fail: a major. A first
		// declaration only names what the action already needed: a minor.
		...(next.scopes ?? [])
			.filter((scope) => !(prev.scopes ?? []).includes(scope))
			.map(
				(scope): ContractChange =>
					prev.scopes
						? major(`scope ${scope} added`)
						: { kind: 'minor', text: `scope ${scope} declared` },
			),
		...(prev.scopes ?? [])
			.filter((scope) => !(next.scopes ?? []).includes(scope))
			.map((scope): ContractChange => ({ kind: 'minor', text: `scope ${scope} removed` })),
		...outputChanges(prev, next),
		...inputChanges(prev, next),
		...egressChanges(prev, next),
		...importChanges(prev, next),
		...prev.credentials
			.filter((type) => !next.credentials.includes(type))
			.map((type) => major(`credential ${type} removed`)),
		...next.credentials
			.filter((type) => !prev.credentials.includes(type))
			.map((type): ContractChange => ({ kind: 'minor', text: `credential ${type} added` })),
		...input,
		...schemaChanges('output', 'output', prev.output, next.output),
	];
	return {
		kind: changes.some(({ kind }) => kind === 'major')
			? 'major'
			: changes.length
				? 'minor'
				: 'patch',
		breaksInput: input.some(({ kind }) => kind === 'major'),
		changes,
	};
}

/** A file as n8n keeps it in memory: the bytes in base64 `data`. */
export interface FixtureBinary {
	readonly data: string;
	readonly mimeType: string;
	readonly fileName?: string;
}

/**
 * A recorded capability from a sub-node, for a root action: its data members (`model`, the
 * `name` of a tool), and the results of its method calls in call order.
 */
export interface FixtureSupply {
	readonly data?: Readonly<Record<string, unknown>>;
	readonly results: readonly unknown[];
}

/** One call of the capability a sub-node action supplies. */
export interface FixtureCall {
	readonly method: string;
	readonly args: readonly unknown[];
}

/** One recorded run. */
export type ExecutionFixture = {
	readonly name: string;
	/** Parameters as n8n stores them; the replay fills the description defaults. */
	readonly params: Readonly<Record<string, unknown>>;
	/** The input items (`json`). One empty item when omitted. */
	readonly items?: readonly IDataObject[];
	/** The binaries of the first input item, by field name. */
	readonly binary?: Readonly<Record<string, FixtureBinary>>;
	/** HTTP response bodies, in request order. A `response: 'binary'` request gets a `FixtureBinary`. */
	readonly responses: readonly unknown[];
	/** The items of each named input. They replace `items`. */
	readonly inputs?: ReadonlyArray<readonly IDataObject[]>;
	/**
	 * The answers of the host imports, in call order: one for each data table call (`columns`,
	 * `rows`, `insert`, `update`, `upsert`, `delete`, `clear`, `rename`, `drop`, `list`,
	 * `create`) and each code run. Opening a table and a wait answer at once.
	 */
	readonly imports?: readonly unknown[];
	/** The message of the error the run ends with. The output is then empty. */
	readonly error?: string;
	/** What the sub-nodes supply, by input field: one capability, or a list. */
	readonly supplied?: Readonly<Record<string, FixtureSupply | readonly FixtureSupply[]>>;
	/** For a sub-node action: the calls of its capability. `output` holds their results. */
	readonly calls?: readonly FixtureCall[];
	/** Stored credential fields that code reads, e.g. a server URL. Never a secret. */
	readonly credential?: Readonly<Record<string, unknown>>;
} & (
	| {
			/** The expected output items (`json`) of an action with one output. */
			readonly output: readonly unknown[];
			/** The expected binaries of each output item, by field name. */
			readonly outputBinary?: ReadonlyArray<Readonly<Record<string, FixtureBinary>>>;
			readonly outputs?: never;
	  }
	| {
			/** The expected output items (`json`) of each output, for an action with named outputs. */
			readonly outputs: ReadonlyArray<readonly unknown[]>;
			readonly output?: never;
			readonly outputBinary?: never;
	  }
);

/** One `migrate` pair: parameters of `fromMajor` in, parameters of this major out. */
export interface MigrationFixture {
	readonly fromMajor: number;
	readonly params: Readonly<Record<string, unknown>>;
	readonly expected: Readonly<Record<string, unknown>>;
}

export interface ContractFixtures {
	readonly executions: readonly ExecutionFixture[];
	readonly migrations?: readonly MigrationFixture[];
}

export const isFixtureBinary = (value: unknown): value is FixtureBinary =>
	isRecord(value) &&
	typeof value.data === 'string' &&
	typeof value.mimeType === 'string' &&
	(value.fileName === undefined || typeof value.fileName === 'string');

const isBinaryMap = (value: unknown) =>
	isRecord(value) && Object.values(value).every(isFixtureBinary);

const isFixtureSupply = (value: unknown): value is FixtureSupply =>
	isRecord(value) &&
	(value.data === undefined || isRecord(value.data)) &&
	Array.isArray(value.results);

const isSupplyMap = (value: unknown) =>
	isRecord(value) &&
	Object.values(value).every((entry) =>
		Array.isArray(entry) ? entry.every(isFixtureSupply) : isFixtureSupply(entry),
	);

const isFixtureCall = (value: unknown): value is FixtureCall =>
	isRecord(value) && typeof value.method === 'string' && Array.isArray(value.args);

const isExecutionFixture = (value: unknown): value is ExecutionFixture =>
	isRecord(value) &&
	typeof value.name === 'string' &&
	isRecord(value.params) &&
	(value.items === undefined || (Array.isArray(value.items) && value.items.every(isRecord))) &&
	(value.inputs === undefined ||
		(Array.isArray(value.inputs) &&
			value.inputs.every((list) => Array.isArray(list) && list.every(isRecord)))) &&
	(value.imports === undefined || Array.isArray(value.imports)) &&
	(value.error === undefined || typeof value.error === 'string') &&
	Array.isArray(value.responses) &&
	(value.binary === undefined || isBinaryMap(value.binary)) &&
	(value.supplied === undefined || isSupplyMap(value.supplied)) &&
	(value.calls === undefined || (Array.isArray(value.calls) && value.calls.every(isFixtureCall))) &&
	(value.credential === undefined || isRecord(value.credential)) &&
	(value.outputs === undefined
		? Array.isArray(value.output) &&
			(value.outputBinary === undefined ||
				(Array.isArray(value.outputBinary) && value.outputBinary.every(isBinaryMap)))
		: value.output === undefined &&
			value.outputBinary === undefined &&
			Array.isArray(value.outputs) &&
			value.outputs.every(Array.isArray));

const isMigrationFixture = (value: unknown): value is MigrationFixture =>
	isRecord(value) &&
	typeof value.fromMajor === 'number' &&
	isRecord(value.params) &&
	isRecord(value.expected);

const isFixtures = (value: unknown): value is ContractFixtures =>
	isRecord(value) &&
	Array.isArray(value.executions) &&
	value.executions.every(isExecutionFixture) &&
	(value.migrations === undefined ||
		(Array.isArray(value.migrations) && value.migrations.every(isMigrationFixture)));

export function parseFixtures(text: string): ContractFixtures {
	const value: unknown = JSON.parse(text);
	if (!isFixtures(value)) throw new UserError('The fixtures file is not valid');
	return value;
}

export const CONTRACT_PACKAGE_SCOPE = '@n8n-contracts';

/** `notion.databasePage.getAll` → `@n8n-contracts/notion-database-page-get-all`. npm names are lower case. */
export const packageNameOf = (actionId: string) =>
	`${CONTRACT_PACKAGE_SCOPE}/${actionId
		.replace(/\./g, '-')
		.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

/** The files of a published action version, read from its npm tarball. */
export interface ContractPackage {
	readonly manifest: VersionManifest;
	/** The exact bytes `signature` covers. */
	readonly manifestText: string;
	/** Base64 ed25519 signature of `manifestText`. */
	readonly signature: string;
	readonly bundle: string;
	readonly fixtures: ContractFixtures;
}

const BLOCK = 512;

/** Regular files of a ustar archive, by path. */
function untar(tar: Buffer, offset = 0): ReadonlyArray<readonly [string, Buffer]> {
	const header = tar.subarray(offset, offset + BLOCK);
	if (header.length < BLOCK || header.every((byte) => byte === 0)) return [];
	const field = (start: number, length: number) =>
		header
			.subarray(start, start + length)
			.toString('utf8')
			.split('\0')[0] ?? '';
	const size = parseInt(field(124, 12).trim() || '0', 8);
	const name = [field(345, 155), field(0, 100)].filter(Boolean).join('/');
	const type = field(156, 1);
	const data = tar.subarray(offset + BLOCK, offset + BLOCK + size);
	const rest = untar(tar, offset + BLOCK + Math.ceil(size / BLOCK) * BLOCK);
	return type === '' || type === '0' ? [[name, data], ...rest] : rest;
}

/** The npm `dist.integrity` of a tarball. */
export const integrityOf = (tarball: Uint8Array) =>
	`sha512-${createHash('sha512').update(tarball).digest('base64')}`;

/**
 * Opens a published tarball. It checks the npm `integrity`, the manifest and its contract
 * hash, the bundle hash, and the package name and version. The signature is a separate
 * check (`verifyManifestSignature`), because a locked bundle hash is enough for a strict run.
 */
export function openContractPackage(tarball: Uint8Array, integrity: string): ContractPackage {
	if (!integrity.split(/\s+/).includes(integrityOf(tarball))) {
		throw new UnexpectedError('The contract package does not match its integrity');
	}
	const files = new Map(untar(gunzipSync(tarball)));
	const text = (name: string) => {
		const data = files.get(`package/${name}`);
		if (!data) throw new UnexpectedError(`The contract package has no ${name}`);
		return data.toString('utf8');
	};
	const manifestText = text('manifest.json');
	const manifest = parseManifest(manifestText);
	const bundle = text('bundle.cjs');
	const packageJson: unknown = JSON.parse(text('package.json'));
	if (sha256(bundle) !== manifest.bundleHash) {
		throw new UnexpectedError(
			`The bundle of ${manifest.id}@${manifest.semver} does not match ${manifest.bundleHash}`,
		);
	}
	if (
		!isRecord(packageJson) ||
		packageJson.name !== packageNameOf(manifest.id) ||
		packageJson.version !== manifest.semver
	) {
		throw new UnexpectedError(`The package does not hold ${manifest.id}@${manifest.semver}`);
	}
	return {
		manifest,
		manifestText,
		signature: text('manifest.sig').trim(),
		bundle,
		fixtures: parseFixtures(text('fixtures.json')),
	};
}

/** `publicKey` is the PEM of the trusted ed25519 publisher key. */
export const verifyManifestSignature = (
	{ manifestText, signature }: Pick<ContractPackage, 'manifestText' | 'signature'>,
	publicKey: string,
) => verify(null, Buffer.from(manifestText), publicKey, Buffer.from(signature, 'base64'));

/** What a workflow pins per contract node, in `meta.nodeContracts[nodeName]`. */
export interface NodeContractLock {
	readonly action: string;
	/** The resolved `major.minor.patch`. */
	readonly version: string;
	readonly bundleHash: string;
	readonly contractHash: string;
}

/** `strict` runs the locked bundle; `tolerant` also takes a newer patch with the same contract. */
export type NodeContractsPolicy = 'strict' | 'tolerant';

/**
 * Picks the version a locked node runs. Pass only trusted manifests: the bundled HEAD, a
 * version whose bundle hash equals the lock, or a version whose signature verifies. Minors
 * and majors never apply.
 */
export function resolveContractVersion(
	lock: NodeContractLock,
	policy: NodeContractsPolicy,
	manifests: readonly VersionManifest[],
): VersionManifest {
	const locked = parseSemver(lock.version);
	const candidates = manifests.filter((manifest) => {
		if (manifest.id !== lock.action) return false;
		if (manifest.bundleHash === lock.bundleHash) return true;
		const { major, minor, patch } = parseSemver(manifest.semver);
		return (
			policy === 'tolerant' &&
			major === locked.major &&
			minor === locked.minor &&
			patch > locked.patch &&
			manifest.contractHash === lock.contractHash
		);
	});
	const newest = candidates.reduce<VersionManifest | undefined>(
		(best, manifest) =>
			best && compareSemver(best.semver, manifest.semver) >= 0 ? best : manifest,
		undefined,
	);
	if (!newest) {
		throw new UserError(
			`No trusted version of ${lock.action} matches ${lock.version} (bundle ${lock.bundleHash})`,
		);
	}
	return newest;
}
