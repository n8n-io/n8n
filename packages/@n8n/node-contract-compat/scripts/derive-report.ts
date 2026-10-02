/**
 * Derives manifests for every node description in the built `n8n-nodes-base` package, then
 * measures coverage, the round trip on saved workflows, and the agent view size.
 *
 * Usage: pnpm exec tsx scripts/derive-report.ts [out-dir]
 * Reads `packages/nodes-base/dist` (run the nodes-base build first). Writes `derived.json`,
 * `report.json` and `report.md` to the out dir (default: `<tmp>/n8n-node-contract-derive`).
 */
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

import { validate } from '@n8n/node-sdk';
import { generateNodeModule } from '@n8n/node-sdk/codegen';
import { canonicalJson } from '@n8n/node-sdk/registry';

import {
	deriveManifests,
	outputSchemaFrom,
	type DerivedAction,
	type DeriveIssueKind,
	type LegacyTarget,
} from '../src/derive/derive';
import {
	fromLegacyParameters,
	normaliseParameters,
	toLegacyParameters,
} from '../src/derive/round-trip';

const REPO = join(__dirname, '..', '..', '..', '..');
const NODES_BASE = join(REPO, 'packages', 'nodes-base');
const PACKAGE_NAME = 'n8n-nodes-base';
const OUT = process.argv[2] ?? join(tmpdir(), 'n8n-node-contract-derive');

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isParameters = (value: unknown): value is INodeParameters => isRecord(value);

const isDescription = (value: unknown): value is INodeTypeDescription =>
	isRecord(value) &&
	typeof value.name === 'string' &&
	Array.isArray(value.properties) &&
	(typeof value.version === 'number' || Array.isArray(value.version));

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf-8'));

// ---------------------------------------------------------------------------------------------
// Tokens: o200k through the ai-utilities tokenizer when its build is present, else chars / 4.

interface Encoder {
	encode(text: string): number[];
}
interface TokenizerModule {
	getEncoding(name: string): Promise<Encoder>;
}
const isTokenizerModule = (value: unknown): value is TokenizerModule =>
	isRecord(value) && typeof value.getEncoding === 'function';

async function loadCounter(): Promise<{ name: string; count: (text: string) => number }> {
	const path = join(REPO, 'packages/@n8n/ai-utilities/dist/cjs/utils/tokenizer/tiktoken.js');
	const fallback = { name: 'chars/4', count: (text: string) => Math.ceil(text.length / 4) };
	if (!existsSync(path)) return fallback;
	const module: unknown = await import(path);
	if (!isTokenizerModule(module)) return fallback;
	const encoder = await module.getEncoding('o200k_base');
	return { name: 'o200k', count: (text: string) => encoder.encode(text).length };
}

// ---------------------------------------------------------------------------------------------
// Derive.

const descriptions = ((): INodeTypeDescription[] => {
	const raw = readJson(join(NODES_BASE, 'dist/types/nodes.json'));
	return Array.isArray(raw) ? raw.filter(isDescription) : [];
})();

const knownNodes = ((): Record<string, unknown> => {
	const raw = readJson(join(NODES_BASE, 'dist/known/nodes.json'));
	return isRecord(raw) ? raw : {};
})();

const nodeDirOf = (name: string): string | undefined => {
	const entry = knownNodes[name];
	return isRecord(entry) && typeof entry.sourcePath === 'string'
		? join(NODES_BASE, dirname(entry.sourcePath))
		: undefined;
};

const padVersion = (version: number) =>
	String(version).split('.').concat(['0', '0']).slice(0, 3).join('.');

/** Exact-version `__schema__` lookup, the same layout as the n8n-core output schema resolver. */
const outputSchema = (target: LegacyTarget) => {
	const nodeDir = nodeDirOf(target.type.replace(`${PACKAGE_NAME}.`, ''));
	if (!nodeDir) return undefined;
	const versionDir = join(nodeDir, '__schema__', `v${padVersion(target.typeVersion)}`);
	const file =
		target.resource && target.operation
			? join(versionDir, target.resource, `${target.operation}.json`)
			: join(versionDir, 'output.json');
	return existsSync(file) ? outputSchemaFrom(readJson(file)) : undefined;
};

interface DeriveRecord {
	readonly description: INodeTypeDescription;
	readonly typeVersion: number;
	readonly actions: readonly DerivedAction[];
}
interface DeriveFailure {
	readonly name: string;
	readonly error: string;
}

const derived = descriptions.map((description): DeriveRecord[] | DeriveFailure => {
	try {
		return deriveManifests(description, { packageName: PACKAGE_NAME, outputSchema }).map(
			(version) => ({ description, ...version }),
		);
	} catch (error) {
		return {
			name: description.name,
			error: error instanceof Error ? error.message : String(error),
		};
	}
});
const records = derived.flatMap((entry) => (Array.isArray(entry) ? entry : []));
const failures = derived.flatMap((entry) => (Array.isArray(entry) ? [] : [entry]));
const actions = records.flatMap((record) => record.actions);

const latestVersionOf = new Map(
	descriptions.map((description) => {
		const versions = Array.isArray(description.version)
			? description.version
			: [description.version];
		return [description.name, Math.max(...versions)];
	}),
);
const latestActions = records
	.filter((record) => record.typeVersion === latestVersionOf.get(record.description.name))
	.flatMap((record) => record.actions);

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const pct = (part: number, whole: number) =>
	whole === 0 ? 'n/a' : `${((100 * part) / whole).toFixed(1)}%`;
const median = (values: readonly number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted.length === 0 ? 0 : (sorted[Math.floor(sorted.length / 2)] ?? 0);
};

const ISSUE_KINDS: readonly DeriveIssueKind[] = [
	'loadOptions',
	'resourceLocator',
	'collection',
	'fixedCollection',
	'conditionalDefault',
	'expressionDefault',
	'multiSelector',
	'opaque',
];

function coverageOf(set: readonly DerivedAction[]) {
	const counts = set.map((action) => action.counts);
	const leaves = sum(counts.map((count) => count.typed + count.loose + count.opaque));
	return {
		actions: set.length,
		nodeTypes: new Set(set.map((action) => action.contract.node)).size,
		shapes: {
			flat: set.filter((action) => action.shape === 'flat').length,
			variants: set.filter((action) => action.shape === 'variants').length,
			multiSelector: set.filter((action) => action.shape === 'multiSelector').length,
		},
		cleanActions: set.filter((action) =>
			action.issues.every((issue) => issue.kind === 'expressionDefault'),
		).length,
		outputInferred: set.filter((action) => action.contract.outputClaim === 'inferred').length,
		fields: {
			top: sum(counts.map((count) => count.top)),
			leaves,
			nested: sum(counts.map((count) => count.nested)),
			typed: sum(counts.map((count) => count.typed)),
			loose: sum(counts.map((count) => count.loose)),
			opaque: sum(counts.map((count) => count.opaque)),
		},
		issues: Object.fromEntries(
			ISSUE_KINDS.map((kind) => [
				kind,
				{
					fields: sum(set.map((action) => action.issues.filter((i) => i.kind === kind).length)),
					actions: set.filter((action) => action.issues.some((i) => i.kind === kind)).length,
				},
			]),
		),
	};
}

// ---------------------------------------------------------------------------------------------
// Round trip on saved workflows.

const CORPUS_ROOTS = [
	join(REPO, 'packages/@n8n/instance-ai/evaluations'),
	join(NODES_BASE, 'nodes'),
	join(NODES_BASE, 'test'),
];
const isTestPath = (path: string) =>
	path.includes('/@n8n/instance-ai/') || /\/(test|tests|__test__|__tests__)\//.test(path);

function jsonFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (name === 'node_modules' || name === 'dist' || name === '__schema__') return [];
		if (statSync(path).isDirectory()) return jsonFiles(path);
		return name.endsWith('.json') && isTestPath(path) ? [path] : [];
	});
}

interface SavedNode {
	readonly file: string;
	readonly type: string;
	readonly typeVersion: number;
	readonly parameters: INodeParameters;
}

function savedNodes(value: unknown, file: string): SavedNode[] {
	if (Array.isArray(value)) return value.flatMap((item) => savedNodes(item, file));
	if (!isRecord(value)) return [];
	const { type, typeVersion, parameters } = value;
	const self: SavedNode[] =
		typeof type === 'string' && typeof typeVersion === 'number' && isParameters(parameters)
			? [{ file, type, typeVersion, parameters }]
			: [];
	return [...self, ...Object.values(value).flatMap((child) => savedNodes(child, file))];
}

const parsed = (path: string): unknown => {
	try {
		return readJson(path);
	} catch {
		return undefined;
	}
};

const corpus = CORPUS_ROOTS.flatMap(jsonFiles).flatMap((file) =>
	savedNodes(parsed(file), relative(REPO, file)),
);
const uniqueCorpus = [
	...new Map(
		corpus.map((node) => [
			canonicalJson({
				type: node.type,
				typeVersion: node.typeVersion,
				parameters: node.parameters,
			}),
			node,
		]),
	).values(),
];

const recordByKey = new Map(
	records.map((record) => [`${record.description.name}@${record.typeVersion}`, record]),
);

type RoundTrip =
	| {
			readonly status: 'otherPackage' | 'unknownVersion' | 'unknownAction';
			readonly node: SavedNode;
	  }
	| {
			readonly status: 'equal' | 'locatorFlag' | 'different';
			readonly node: SavedNode;
			readonly action: string;
			readonly schemaIssues: readonly string[];
			readonly lostKeys: readonly string[];
	  }
	| { readonly status: 'error'; readonly node: SavedNode; readonly error: string };

/** A target without a discriminator matches any value: the node has no such selector. */
const selects = (wanted: string | undefined, value: unknown) =>
	wanted === undefined || wanted === value;

function roundTrip(node: SavedNode): RoundTrip {
	if (!node.type.startsWith(`${PACKAGE_NAME}.`)) return { status: 'otherPackage', node };
	const record = recordByKey.get(`${node.type.slice(PACKAGE_NAME.length + 1)}@${node.typeVersion}`);
	if (!record) return { status: 'unknownVersion', node };
	try {
		const { description, typeVersion } = record;
		const original = normaliseParameters(description, typeVersion, node.parameters);
		const action = record.actions.find(
			({ compile: { target } }) =>
				selects(target.resource, original.resource) &&
				selects(target.operation, original.operation),
		);
		if (!action) return { status: 'unknownAction', node };
		const input = fromLegacyParameters(action.compile, description, node.parameters);
		const back = normaliseParameters(
			description,
			typeVersion,
			toLegacyParameters(action.compile, input),
		);
		const lostKeys = [...new Set([...Object.keys(original), ...Object.keys(back)])].filter(
			(key) => canonicalJson(original[key]) !== canonicalJson(back[key]),
		);
		// Hand-written fixtures often omit `__rl: true`; compile always writes it.
		const flagOnly =
			lostKeys.length > 0 &&
			lostKeys.every((key) => {
				const value = original[key];
				return (
					action.compile.fields[key]?.kind === 'resourceLocator' &&
					isRecord(value) &&
					canonicalJson({ ...value, __rl: true }) === canonicalJson(back[key])
				);
			});
		return {
			status: lostKeys.length === 0 ? 'equal' : flagOnly ? 'locatorFlag' : 'different',
			node,
			action: `${action.contract.id}@${action.contract.semver}`,
			schemaIssues: validate(input, action.contract.input, { allowExpressions: true }),
			lostKeys,
		};
	} catch (error) {
		return { status: 'error', node, error: error instanceof Error ? error.message : String(error) };
	}
}

const trips = uniqueCorpus.map(roundTrip);
const statusCount = (status: RoundTrip['status']) =>
	trips.filter((trip) => trip.status === status).length;
const compared = trips.flatMap((trip) =>
	trip.status === 'equal' || trip.status === 'locatorFlag' || trip.status === 'different'
		? [trip]
		: [],
);

// ---------------------------------------------------------------------------------------------
// Size: the typed module per derived action vs the builder's node-definition file today.

const DEFS = join(NODES_BASE, 'dist/node-definitions/nodes', PACKAGE_NAME);
const squash = (text: string) => text.replace(/_/g, '').toLowerCase();
const findEntry = (dir: string, prefix: string, name: string, suffix: string) =>
	existsSync(dir)
		? readdirSync(dir).find((entry) => squash(entry) === squash(`${prefix}${name}${suffix}`))
		: undefined;

/** The file(s) the flag-off builder reads for this action, through the node-definition resolver layout. */
function builderView(target: LegacyTarget, name: string): string | undefined {
	const versionDir = join(DEFS, name, `v${String(target.typeVersion).replace('.', '')}`);
	if (!existsSync(versionDir)) {
		const flat = `${versionDir}.ts`;
		return existsSync(flat) ? readFileSync(flat, 'utf-8') : undefined;
	}
	if (target.resource) {
		const resourceDir = findEntry(versionDir, 'resource_', target.resource, '');
		const operationFile =
			resourceDir && target.operation
				? findEntry(join(versionDir, resourceDir), 'operation_', target.operation, '.ts')
				: undefined;
		return resourceDir && operationFile
			? readFileSync(join(versionDir, resourceDir, operationFile), 'utf-8')
			: undefined;
	}
	// A mode split without a mode returns every mode file.
	const modes = readdirSync(versionDir).filter(
		(entry) => entry.startsWith('mode_') && entry.endsWith('.ts'),
	);
	return modes.length > 0
		? modes.map((entry) => readFileSync(join(versionDir, entry), 'utf-8')).join('\n')
		: undefined;
}

interface SizeRow {
	readonly id: string;
	readonly derived: number;
	/** The module without the output type: the builder view has no output types. */
	readonly derivedInput: number;
	readonly builder?: number;
}

// ---------------------------------------------------------------------------------------------

async function main() {
	const counter = await loadCounter();
	const sizes = latestActions.map((action): SizeRow => {
		// A derived id is `<node>.<resource>.<operation>`, `<node>.<resource>` or `<node>.execute`.
		const [, ...path] = action.contract.id.split('.');
		const moduleOf = (output: DerivedAction['contract']['output']) =>
			generateNodeModule(action.contract.node, [
				{
					contract: { ...action.contract, output },
					nodeType: action.compile.target.type,
					resource: path.length > 1 ? path[0] : undefined,
					operation: path[path.length - 1] ?? '',
				},
			]);
		const builder = builderView(action.compile.target, action.contract.node);
		return {
			id: `${action.contract.id}@${action.contract.semver}`,
			derived: counter.count(moduleOf(action.contract.output)),
			derivedInput: counter.count(moduleOf({})),
			...(builder !== undefined ? { builder: counter.count(builder) } : {}),
		};
	});
	const paired = sizes.flatMap((row) =>
		row.builder !== undefined ? [{ ...row, builder: row.builder }] : [],
	);

	const offenders = [
		...new Map(
			[...latestActions]
				.sort((a, b) => b.issues.length - a.issues.length)
				.map((action) => [action.contract.node, action]),
		).values(),
	]
		.sort((a, b) => b.issues.length - a.issues.length)
		.slice(0, 10)
		.map((action) => ({
			id: `${action.contract.id}@${action.contract.semver}`,
			shape: action.shape,
			issues: action.issues.length,
			byKind: Object.fromEntries(
				ISSUE_KINDS.map((kind) => [
					kind,
					action.issues.filter((i) => i.kind === kind).length,
				]).filter(([, count]) => count !== 0),
			),
			sample: action.issues
				.slice(0, 4)
				.map((issue) => `${issue.kind} ${issue.field}: ${issue.detail}`),
		}));

	const report = {
		tokenizer: counter.name,
		descriptions: descriptions.length,
		deriveFailures: failures,
		nodeTypes: new Set(descriptions.map((description) => description.name)).size,
		nodeTypesWithActions: new Set(actions.map((action) => action.contract.node)).size,
		nodeTypesWithoutActions: [
			...new Set(descriptions.map((description) => description.name)),
		].filter((name) => !actions.some((action) => action.contract.node === name)),
		typeVersions: records.length,
		allVersions: coverageOf(actions),
		latestVersions: coverageOf(latestActions),
		roundTrip: {
			files: new Set(corpus.map((node) => node.file)).size,
			nodes: corpus.length,
			uniqueNodes: uniqueCorpus.length,
			otherPackage: statusCount('otherPackage'),
			unknownVersion: statusCount('unknownVersion'),
			unknownAction: trips.flatMap((trip) =>
				trip.status === 'unknownAction'
					? [{ type: trip.node.type, typeVersion: trip.node.typeVersion, file: trip.node.file }]
					: [],
			),
			locatorFlag: statusCount('locatorFlag'),
			errors: trips.flatMap((trip) => (trip.status === 'error' ? [trip.error] : [])).slice(0, 10),
			compared: compared.length,
			equal: statusCount('equal'),
			schemaValid: compared.filter((trip) => trip.schemaIssues.length === 0).length,
			different: compared
				.filter((trip) => trip.status === 'different')
				.map((trip) => ({ action: trip.action, file: trip.node.file, lostKeys: trip.lostKeys })),
			schemaInvalid: compared
				.filter((trip) => trip.schemaIssues.length > 0)
				.map((trip) => ({
					action: trip.action,
					file: trip.node.file,
					issues: trip.schemaIssues.slice(0, 3),
				})),
		},
		size: {
			latestActions: sizes.length,
			paired: paired.length,
			derivedTotal: sum(paired.map((row) => row.derived)),
			derivedInputTotal: sum(paired.map((row) => row.derivedInput)),
			derivedInputMedian: median(paired.map((row) => row.derivedInput)),
			derivedInputSmaller: paired.filter((row) => row.derivedInput < row.builder).length,
			builderTotal: sum(paired.map((row) => row.builder)),
			derivedMedian: median(paired.map((row) => row.derived)),
			builderMedian: median(paired.map((row) => row.builder)),
			derivedSmaller: paired.filter((row) => row.derived < row.builder).length,
			largestDerived: [...sizes].sort((a, b) => b.derived - a.derived).slice(0, 10),
			worstInputRatio: [...paired]
				.sort((a, b) => b.derivedInput / b.builder - a.derivedInput / a.builder)
				.slice(0, 5),
		},
		offenders,
	};

	mkdirSync(OUT, { recursive: true });
	writeFileSync(
		join(OUT, 'derived.json'),
		JSON.stringify(
			actions.map(({ contract, compile, shape, issues }) => ({ contract, compile, shape, issues })),
		),
	);
	writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
	const { roundTrip: trip, size } = report;
	const markdown = [
		'# Derive report',
		'',
		`- Descriptions: ${report.descriptions}, node types: ${report.nodeTypes}, derived with actions: ${report.nodeTypesWithActions}, failures: ${failures.length}`,
		`- typeVersions: ${report.typeVersions}, actions (all versions): ${report.allVersions.actions}, actions (latest): ${report.latestVersions.actions}`,
		`- Latest shapes: ${JSON.stringify(report.latestVersions.shapes)}; clean: ${pct(report.latestVersions.cleanActions, report.latestVersions.actions)}; output inferred: ${report.latestVersions.outputInferred}`,
		`- Latest fields: ${JSON.stringify(report.latestVersions.fields)}`,
		`- Latest issues: ${JSON.stringify(report.latestVersions.issues)}`,
		`- Round trip: ${trip.compared} compared of ${trip.uniqueNodes} unique nodes (${trip.files} files); equal ${trip.equal} (${pct(trip.equal, trip.compared)}); schema-valid ${trip.schemaValid} (${pct(trip.schemaValid, trip.compared)}); other package ${trip.otherPackage}, unknown version ${trip.unknownVersion}, unknown action ${trip.unknownAction.length}, only the __rl flag differs ${trip.locatorFlag}, errors ${trip.errors.length}`,
		`- Size (${report.tokenizer}): ${size.paired} paired actions; input-only module ${size.derivedInputTotal} vs builder ${size.builderTotal} (${pct(size.derivedInputTotal, size.builderTotal)}), median ${size.derivedInputMedian} vs ${size.builderMedian}, smaller in ${pct(size.derivedInputSmaller, size.paired)}; with output types ${size.derivedTotal} (${pct(size.derivedTotal, size.builderTotal)}), median ${size.derivedMedian}, smaller in ${pct(size.derivedSmaller, size.paired)}`,
		'',
		'## Worst offenders',
		...offenders.map(
			(offender) =>
				`- ${offender.id} (${offender.shape}, ${offender.issues} issues): ${JSON.stringify(offender.byKind)}`,
		),
	].join('\n');
	writeFileSync(join(OUT, 'report.md'), markdown);
	console.log(markdown);
	console.log(`\nWrote ${OUT}`);
}

void main();
