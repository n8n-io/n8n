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
 */

import * as fs from 'fs';
import * as path from 'path';

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
		| 'superseded-major';
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

export function harvestOutputSchemas(options: HarvestOptions): HarvestResult {
	const { nodesRootDir, dryRun = false } = options;

	const fixturePaths: string[] = [];
	findWorkflowFixtures(nodesRootDir, fixturePaths);
	fixturePaths.sort();

	const result: HarvestResult = { written: [], skippedExisting: [], unmapped: [] };
	// Multiple fixtures (different test scenarios) can map to the same
	// (resource, operation): the first one wins (fixturePaths is sorted, so
	// this is deterministic), the rest are reported as already covered. In
	// dry-run mode nothing is written to disk, so this claims-in-memory set
	// is what makes that de-duplication happen instead of every duplicate
	// showing up as a separate "would write".
	const claimedPaths = new Set<string>();

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

		const sample = findOutputSample(fixture, targetNode);
		if (sample === undefined) {
			result.unmapped.push({ fixturePath, reason: 'no-output-sample' });
			continue;
		}

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
		const filePath = resource
			? path.join(schemaDir, versionDir, resource, `${operation}.json`)
			: path.join(schemaDir, versionDir, `${operation}.json`);

		if (fs.existsSync(filePath) || claimedPaths.has(filePath)) {
			result.skippedExisting.push({ fixturePath, filePath });
			continue;
		}
		claimedPaths.add(filePath);

		if (!dryRun) {
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, stringifySorted(generateJsonSchemaFromData(sample)));
		}

		result.written.push({
			fixturePath,
			filePath,
			nodeName: targetNode.type,
			version: targetNode.typeVersion ?? 1,
			resource,
			operation,
		});
	}

	return result;
}
