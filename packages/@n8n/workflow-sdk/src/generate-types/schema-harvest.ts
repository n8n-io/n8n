/**
 * Harvests missing `__schema__/v{version}/{resource}/{operation}.json` output
 * schemas from nodes-base's own NodeTestHarness workflow fixtures
 * (`nodes/**\/test/**\/*.workflow.json`).
 *
 * Each fixture's recorded `pinData` is real output captured from a node
 * execution, so it's a legitimate source for inferring an output shape —
 * unlike hand-authoring, which the generator's docs explicitly avoid.
 *
 * Mapping a fixture to (node, version, resource, operation) only works when
 * the fixture follows the `test/(vX/)?node/(vX/)?{resource}/{operation}.json`
 * (or resource-less `{operation}.json`) convention AND the target node's own
 * saved parameters/pinData give an unambiguous resource, operation, and
 * sample. Fixtures that don't are skipped and reported, never guessed.
 *
 * A sample is evidence, not a contract, so what it can prove is bounded:
 * every fixture covering one (resource, operation) is merged rather than the
 * first one winning, `required` is never emitted, a null value widens to
 * unknown instead of pinning the type to `null`, and operations whose output
 * is shaped by the user's own data are left out entirely.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { JsonSchema } from './generate-types';
import { padVersion } from './generate-types';
import { generateJsonSchemaFromData } from './json-schema-from-data';

interface WorkflowFixtureNode {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
}

interface WorkflowFixtureConnection {
	node: string;
}

interface WorkflowFixture {
	nodes?: WorkflowFixtureNode[];
	pinData?: Record<string, Array<{ json?: unknown }>>;
	connections?: Record<string, { main?: WorkflowFixtureConnection[][] }>;
}

export interface HarvestedSchema {
	fixturePath: string;
	filePath: string;
	nodeName: string;
	version: number;
	resource: string;
	operation: string;
}

export interface SkippedExisting {
	fixturePath: string;
	filePath: string;
}

export interface UnmappedFixture {
	fixturePath: string;
	reason:
		| 'no-node-path-segment'
		| 'unexpected-path-shape'
		| 'parse-error'
		| 'no-unique-target-node'
		| 'no-operation-determined'
		| 'no-output-sample'
		| 'superseded-major'
		| 'user-shaped-output';
}

export interface HarvestResult {
	written: HarvestedSchema[];
	skippedExisting: SkippedExisting[];
	unmapped: UnmappedFixture[];
}

export interface HarvestOptions {
	/** Root of nodes-base's `nodes/` directory (source, not `dist/`). */
	nodesRootDir: string;
	/** Report what would be written without touching the filesystem. */
	dryRun?: boolean;
}

const VERSION_SEGMENT = /^v[\d.]+$/;

function maxSchemaMajor(schemaDir: string): number {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(schemaDir, { withFileTypes: true });
	} catch {
		return 0;
	}
	let max = 0;
	for (const entry of entries) {
		if (!entry.isDirectory() || !VERSION_SEGMENT.test(entry.name)) continue;
		const major = Number(entry.name.slice(1).split('.')[0]);
		if (major > max) max = major;
	}
	return max;
}

function findWorkflowFixtures(dir: string, results: string[]): void {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			findWorkflowFixtures(entryPath, results);
		} else if (entry.name.endsWith('.workflow.json')) {
			results.push(entryPath);
		}
	}
}

interface ParsedFixturePath {
	nodeFolderSegments: string[];
	pathResource?: string;
	pathOperation: string;
}

/**
 * Parse the fixture's own path into the node folder (segments before `test/`)
 * and the resource/operation implied by the `node/{resource}/{operation}.json`
 * (or resource-less `node/{operation}.json`) convention. Returns undefined for
 * fixtures that don't follow it (most of nodes-base's older, flat test files).
 */
function parseFixturePath(
	nodesRootDir: string,
	fixturePath: string,
): ParsedFixturePath | undefined {
	const relative = path.relative(nodesRootDir, fixturePath);
	const parts = relative.split(path.sep);

	const testIndex = parts.indexOf('test');
	if (testIndex === -1) return undefined;
	const nodeFolderSegments = parts.slice(0, testIndex);

	const afterTest = parts.slice(testIndex + 1);
	const nodeIndex = afterTest.indexOf('node');
	if (nodeIndex === -1) return undefined;

	let rest = afterTest.slice(nodeIndex + 1);
	if (rest.length > 0 && VERSION_SEGMENT.test(rest[0])) {
		rest = rest.slice(1);
	}
	if (rest.length !== 1 && rest.length !== 2) return undefined;

	const filename = rest[rest.length - 1];
	const pathOperation = filename.split('.')[0];
	const pathResource = rest.length === 2 ? rest[0] : undefined;

	return { nodeFolderSegments, pathResource, pathOperation };
}

function findTargetNode(
	nodes: WorkflowFixtureNode[],
	nodeFolderSegments: string[],
): WorkflowFixtureNode | undefined {
	const folderKey = nodeFolderSegments.join('').toLowerCase();
	const candidates = nodes.filter(
		(node) => node.type.split('.').pop()?.toLowerCase() === folderKey,
	);
	return candidates.length === 1 ? candidates[0] : undefined;
}

function findOutputSample(fixture: WorkflowFixture, targetNode: WorkflowFixtureNode): unknown {
	const directPin = fixture.pinData?.[targetNode.name];
	if (directPin && directPin.length > 0) return directPin[0].json;

	const connections = fixture.connections?.[targetNode.name]?.main?.[0] ?? [];
	for (const connection of connections) {
		const downstream = fixture.nodes?.find((node) => node.name === connection.node);
		if (downstream?.type !== 'n8n-nodes-base.noOp') continue;
		const downstreamPin = fixture.pinData?.[downstream.name];
		if (downstreamPin && downstreamPin.length > 0) return downstreamPin[0].json;
	}

	return undefined;
}

function isStringParam(value: unknown): value is string {
	return typeof value === 'string';
}

/** Deterministic `JSON.stringify` with alphabetically sorted object keys. */
function stringifySorted(value: unknown): string {
	return JSON.stringify(value, sortKeysReplacer, 4) + '\n';
}

function sortKeysReplacer(_key: string, value: unknown): unknown {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		sorted[key] = (value as Record<string, unknown>)[key];
	}
	return sorted;
}

/**
 * Operations whose output rows are the user's own spreadsheet columns. A
 * fixture pins the columns of one test workbook, so harvesting it would
 * declare those column names as the node's contract for every user.
 */
const USER_SHAPED_OPERATIONS = new Set([
	'n8n-nodes-base.microsoftExcel:table:append',
	'n8n-nodes-base.microsoftExcel:table:getRows',
	'n8n-nodes-base.microsoftExcel:table:lookup',
	'n8n-nodes-base.microsoftExcel:worksheet:append',
	'n8n-nodes-base.microsoftExcel:worksheet:readRows',
	'n8n-nodes-base.microsoftExcel:worksheet:update',
	'n8n-nodes-base.microsoftExcel:worksheet:upsert',
]);

/**
 * Output properties that hold per-account custom fields. Their keys belong to
 * whichever account recorded the fixture, so only the container is knowable.
 */
const OPAQUE_OUTPUT_PROPERTIES = new Set(['custom_fields']);

/**
 * A fixture is one sample, not a contract. It cannot prove a property is
 * always present, and a property that happened to be null says nothing about
 * the type it carries when set — so `required` is dropped and null widens to
 * unknown. This also matches the pre-existing corpus, where `required` is
 * near-absent.
 */
function relaxInferredSchema(schema: JsonSchema): JsonSchema {
	if (schema.type === 'null') return {};

	if (schema.type === 'array') {
		return { type: 'array', items: schema.items ? relaxInferredSchema(schema.items) : {} };
	}

	if (schema.type === 'object' && schema.properties) {
		const properties: Record<string, JsonSchema> = {};
		for (const [key, value] of Object.entries(schema.properties)) {
			properties[key] = OPAQUE_OUTPUT_PROPERTIES.has(key)
				? { type: 'object' }
				: relaxInferredSchema(value);
		}
		return { type: 'object', properties };
	}

	return schema;
}

function unionTypes(a: JsonSchema['type'], b: JsonSchema['type']): JsonSchema['type'] {
	const types = [...new Set([a ?? [], b ?? []].flat())].sort();
	return types.length === 1 ? types[0] : types;
}

/**
 * Union two samples of the same (resource, operation). Several fixtures often
 * cover one operation with different scenarios — a minimal response and a full
 * one — so keeping only the first drops fields the node really returns.
 */
function mergeSchemas(a: JsonSchema, b: JsonSchema): JsonSchema {
	if (a.type === undefined) return b;
	if (b.type === undefined) return a;

	if (a.type === 'object' && b.type === 'object' && a.properties && b.properties) {
		const properties: Record<string, JsonSchema> = { ...a.properties };
		for (const [key, value] of Object.entries(b.properties)) {
			const existing = properties[key];
			properties[key] = existing ? mergeSchemas(existing, value) : value;
		}
		return { type: 'object', properties };
	}

	if (a.type === 'array' && b.type === 'array') {
		return { type: 'array', items: mergeSchemas(a.items ?? {}, b.items ?? {}) };
	}

	return a.type === b.type ? a : { type: unionTypes(a.type, b.type) };
}

/**
 * Whether any version directory of the same major already holds this
 * resource/operation. Such a schema resolves through the per-file fallback in
 * `discoverSchemasForNode`, so harvesting the combination again adds nothing —
 * and a thin fixture sample written to a nearer minor would shadow a richer
 * schema recorded for a neighbouring one.
 */
function isCoveredBySameMajor(schemaDir: string, major: number, relativeFile: string): boolean {
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(schemaDir, { withFileTypes: true });
	} catch {
		return false;
	}
	return entries.some(
		(entry) =>
			entry.isDirectory() &&
			VERSION_SEGMENT.test(entry.name) &&
			Number(entry.name.slice(1).split('.')[0]) === major &&
			fs.existsSync(path.join(schemaDir, entry.name, relativeFile)),
	);
}

export function harvestOutputSchemas(options: HarvestOptions): HarvestResult {
	const { nodesRootDir, dryRun = false } = options;

	const fixturePaths: string[] = [];
	findWorkflowFixtures(nodesRootDir, fixturePaths);
	fixturePaths.sort();

	const result: HarvestResult = { written: [], skippedExisting: [], unmapped: [] };
	// Multiple fixtures (different test scenarios) can map to the same
	// (resource, operation). Their schemas are merged into one claim, so the
	// file is written once (the first fixture, in sorted order, owns the
	// `written` entry and the rest are reported as already covered) but no
	// field a later fixture recorded is lost. Claims live in memory, so
	// dry-run reports the same de-duplication as a real run.
	const claims = new Map<string, JsonSchema>();

	for (const fixturePath of fixturePaths) {
		const parsed = parseFixturePath(nodesRootDir, fixturePath);
		if (!parsed) {
			result.unmapped.push({ fixturePath, reason: 'no-node-path-segment' });
			continue;
		}
		const { nodeFolderSegments, pathResource, pathOperation } = parsed;

		let fixture: WorkflowFixture;
		try {
			fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as WorkflowFixture;
		} catch {
			result.unmapped.push({ fixturePath, reason: 'parse-error' });
			continue;
		}

		const targetNode = findTargetNode(fixture.nodes ?? [], nodeFolderSegments);
		if (!targetNode) {
			result.unmapped.push({ fixturePath, reason: 'no-unique-target-node' });
			continue;
		}

		const params = targetNode.parameters ?? {};
		const operation = isStringParam(params.operation)
			? params.operation
			: pathResource !== undefined
				? pathOperation
				: undefined;
		if (operation === undefined) {
			result.unmapped.push({ fixturePath, reason: 'no-operation-determined' });
			continue;
		}
		const resource = isStringParam(params.resource) ? params.resource : (pathResource ?? '');

		if (USER_SHAPED_OPERATIONS.has(`${targetNode.type}:${resource}:${operation}`)) {
			result.unmapped.push({ fixturePath, reason: 'user-shaped-output' });
			continue;
		}

		const sample = findOutputSample(fixture, targetNode);
		if (sample === undefined) {
			result.unmapped.push({ fixturePath, reason: 'no-output-sample' });
			continue;
		}
		const inferredSchema = relaxInferredSchema(generateJsonSchemaFromData(sample));

		const targetVersion = targetNode.typeVersion ?? 1;
		const versionDir = `v${padVersion(targetVersion)}`;
		const schemaDir = path.join(nodesRootDir, ...nodeFolderSegments, '__schema__');

		// Schemas for a superseded major are never consulted for the latest
		// major's types (same-major directories always win in
		// orderedVersionDirectories), so harvesting them only bloats the corpus.
		if (Math.floor(targetVersion) < maxSchemaMajor(schemaDir)) {
			result.unmapped.push({ fixturePath, reason: 'superseded-major' });
			continue;
		}
		const relativeFile = resource ? path.join(resource, `${operation}.json`) : `${operation}.json`;
		const filePath = path.join(schemaDir, versionDir, relativeFile);

		const claim = claims.get(filePath);
		if (claim) {
			claims.set(filePath, mergeSchemas(claim, inferredSchema));
			result.skippedExisting.push({ fixturePath, filePath });
			continue;
		}
		if (isCoveredBySameMajor(schemaDir, Math.floor(targetVersion), relativeFile)) {
			result.skippedExisting.push({ fixturePath, filePath });
			continue;
		}

		claims.set(filePath, inferredSchema);
		result.written.push({
			fixturePath,
			filePath,
			nodeName: targetNode.type,
			version: targetNode.typeVersion ?? 1,
			resource,
			operation,
		});
	}

	if (!dryRun) {
		for (const [filePath, schema] of claims) {
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, stringifySorted(schema));
		}
	}

	return result;
}
