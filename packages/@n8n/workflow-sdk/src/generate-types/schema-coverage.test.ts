import * as fs from 'fs';
import * as path from 'path';

import type { NodeTypeDescription } from './generate-types';
import { computeSchemaCoverage, formatCoverageMarkdown } from './schema-coverage';

// Real filesystem under NODES_BASE_DIST, same convention as
// generate-types.test.ts's `discoverSchemasForNode` suite: discovery reads
// from a fixed path, so schema fixtures are written there under a
// double-underscore test-only folder name and always cleaned up.
const NODES_BASE_DIST = path.resolve(__dirname, '../../../../nodes-base/dist/nodes');

function createTestSchemaDir(folderName: string, version: string, files: Record<string, string>) {
	const schemaDir = path.join(NODES_BASE_DIST, folderName, '__schema__', version);
	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = path.join(schemaDir, filePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}
}

function cleanupTestDir(folderName: string) {
	fs.rmSync(path.join(NODES_BASE_DIST, folderName), { recursive: true, force: true });
}

function nodeWithResourceOperation(
	folderName: string,
	version: number | number[],
	resources: Record<string, string[]>,
	defaultVersion?: number,
): NodeTypeDescription {
	const resourceOptions = Object.keys(resources).map((r) => ({ name: r, value: r }));
	const operationProps = Object.entries(resources).map(([resource, operations]) => ({
		name: 'operation',
		displayName: 'Operation',
		type: 'options',
		default: operations[0],
		displayOptions: { show: { resource: [resource] } },
		options: operations.map((op) => ({ name: op, value: op })),
	}));

	return {
		name: `n8n-nodes-base.${folderName}`,
		displayName: folderName,
		group: ['transform'],
		version,
		defaultVersion,
		inputs: ['main'],
		outputs: ['main'],
		schemaPath: folderName,
		properties: [
			{
				name: 'resource',
				displayName: 'Resource',
				type: 'options',
				default: resourceOptions[0]?.value ?? '',
				options: resourceOptions,
			},
			...operationProps,
		],
	};
}

describe('computeSchemaCoverage', () => {
	it('reports 0% coverage when no schema files exist', () => {
		const folderName = '__TestCoverageNone__';
		const node = nodeWithResourceOperation(folderName, 1, { ticket: ['get', 'create'] });

		try {
			const report = computeSchemaCoverage([node]);
			const nodeReport = report.nodes.find((n) => n.nodeName === node.name);

			expect(nodeReport?.latestTotalCombos).toBe(2);
			expect(nodeReport?.latestCoveredCombos).toBe(0);
			expect(nodeReport?.uncovered).toHaveLength(2);
		} finally {
			cleanupTestDir(folderName);
		}
	});

	it('reports partial coverage when only some schemas exist', () => {
		const folderName = '__TestCoveragePartial__';
		const node = nodeWithResourceOperation(folderName, 1, { ticket: ['get', 'create'] });

		try {
			createTestSchemaDir(folderName, 'v1.0.0', {
				'ticket/get.json': JSON.stringify({ type: 'object' }),
			});

			const report = computeSchemaCoverage([node]);
			const nodeReport = report.nodes.find((n) => n.nodeName === node.name);

			expect(nodeReport?.latestTotalCombos).toBe(2);
			expect(nodeReport?.latestCoveredCombos).toBe(1);
			expect(nodeReport?.uncovered).toEqual([{ resource: 'ticket', operation: 'create' }]);
		} finally {
			cleanupTestDir(folderName);
		}
	});

	it('reports full coverage when all schemas exist', () => {
		const folderName = '__TestCoverageFull__';
		const node = nodeWithResourceOperation(folderName, 1, { ticket: ['get', 'create'] });

		try {
			createTestSchemaDir(folderName, 'v1.0.0', {
				'ticket/get.json': JSON.stringify({ type: 'object' }),
				'ticket/create.json': JSON.stringify({ type: 'object' }),
			});

			const report = computeSchemaCoverage([node]);
			const nodeReport = report.nodes.find((n) => n.nodeName === node.name);

			expect(nodeReport?.latestCoveredCombos).toBe(2);
			expect(nodeReport?.uncovered).toHaveLength(0);
		} finally {
			cleanupTestDir(folderName);
		}
	});

	it('counts the latest version separately from all versions', () => {
		const folderName = '__TestCoverageVersions__';
		const node = nodeWithResourceOperation(folderName, [1, 2], { ticket: ['get'] });

		try {
			createTestSchemaDir(folderName, 'v2.0.0', {
				'ticket/get.json': JSON.stringify({ type: 'object' }),
			});

			const report = computeSchemaCoverage([node]);
			const nodeReport = report.nodes.find((n) => n.nodeName === node.name);

			expect(nodeReport?.latestVersion).toBe(2);
			expect(nodeReport?.latestTotalCombos).toBe(1);
			expect(nodeReport?.latestCoveredCombos).toBe(1);
			expect(nodeReport?.allTotalCombos).toBe(2);
			expect(nodeReport?.allCoveredCombos).toBe(1);
			expect(nodeReport?.uncovered).toHaveLength(0);
		} finally {
			cleanupTestDir(folderName);
		}
	});

	it('excludes legacy descriptions whose defaultVersion lives in a newer description', () => {
		const folderName = '__TestCoverageLegacy__';
		const legacy = nodeWithResourceOperation(folderName, 1, { ticket: ['get'] }, 2.7);
		const current = nodeWithResourceOperation(folderName, [2, 2.7], { ticket: ['get'] }, 2.7);

		try {
			const report = computeSchemaCoverage([legacy, current]);

			expect(report.nodes).toHaveLength(1);
			expect(report.nodes[0].latestVersion).toBe(2.7);
			expect(report.latest.totalCombos).toBe(1);
			expect(report.allVersions.totalCombos).toBe(2);
		} finally {
			cleanupTestDir(folderName);
		}
	});

	it('excludes nodes with no resource/operation discriminators', () => {
		const node: NodeTypeDescription = {
			name: 'n8n-nodes-base.__testCoverageNoDiscriminator__',
			displayName: 'No Discriminator',
			group: ['transform'],
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
		};

		const report = computeSchemaCoverage([node]);
		expect(report.nodes.find((n) => n.nodeName === node.name)).toBeUndefined();
	});

	it('computes aggregate percentages for latest and all versions', () => {
		const folderName = '__TestCoveragePercent__';
		const node = nodeWithResourceOperation(folderName, [1, 2], { ticket: ['get', 'create'] });

		try {
			createTestSchemaDir(folderName, 'v2.0.0', {
				'ticket/get.json': JSON.stringify({ type: 'object' }),
			});

			const report = computeSchemaCoverage([node]);
			expect(report.latest).toEqual({ totalCombos: 2, coveredCombos: 1, coveragePercent: 50 });
			expect(report.allVersions).toEqual({
				totalCombos: 4,
				coveredCombos: 1,
				coveragePercent: 25,
			});
		} finally {
			cleanupTestDir(folderName);
		}
	});
});

describe('formatCoverageMarkdown', () => {
	it('renders both summary metrics and latest-version rows', () => {
		const report = {
			latest: { totalCombos: 2, coveredCombos: 1, coveragePercent: 50 },
			allVersions: { totalCombos: 4, coveredCombos: 1, coveragePercent: 25 },
			nodes: [
				{
					nodeName: 'n8n-nodes-base.example',
					latestVersion: 2.7,
					latestTotalCombos: 2,
					latestCoveredCombos: 1,
					allTotalCombos: 4,
					allCoveredCombos: 1,
					uncovered: [{ resource: 'ticket', operation: 'create' }],
				},
			],
		};

		const markdown = formatCoverageMarkdown(report);

		expect(markdown).toContain('Covered (latest node version): 50% (1/2)');
		expect(markdown).toContain('Covered (all node versions): 25% (1/4)');
		expect(markdown).toContain('| n8n-nodes-base.example | 2.7 | 1/2 | 50% | ticket/create |');
	});
});
