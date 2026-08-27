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

			expect(nodeReport?.totalCombos).toBe(2);
			expect(nodeReport?.coveredCombos).toBe(0);
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

			expect(nodeReport?.totalCombos).toBe(2);
			expect(nodeReport?.coveredCombos).toBe(1);
			expect(nodeReport?.uncovered).toEqual([
				{ resource: 'ticket', operation: 'create', version: 1 },
			]);
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

			expect(nodeReport?.coveredCombos).toBe(2);
			expect(nodeReport?.uncovered).toHaveLength(0);
		} finally {
			cleanupTestDir(folderName);
		}
	});

	it('multiplies combos across every declared version', () => {
		const folderName = '__TestCoverageVersions__';
		const node = nodeWithResourceOperation(folderName, [1, 2], { ticket: ['get'] });

		try {
			const report = computeSchemaCoverage([node]);
			const nodeReport = report.nodes.find((n) => n.nodeName === node.name);

			expect(nodeReport?.totalCombos).toBe(2);
			expect(nodeReport?.uncovered).toEqual([
				{ resource: 'ticket', operation: 'get', version: 1 },
				{ resource: 'ticket', operation: 'get', version: 2 },
			]);
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

	it('computes an aggregate percentage across nodes', () => {
		const folderName = '__TestCoveragePercent__';
		const node = nodeWithResourceOperation(folderName, 1, { ticket: ['get', 'create'] });

		try {
			createTestSchemaDir(folderName, 'v1.0.0', {
				'ticket/get.json': JSON.stringify({ type: 'object' }),
			});

			const report = computeSchemaCoverage([node]);
			expect(report.totalCombos).toBe(2);
			expect(report.coveredCombos).toBe(1);
			expect(report.coveragePercent).toBe(50);
		} finally {
			cleanupTestDir(folderName);
		}
	});
});

describe('formatCoverageMarkdown', () => {
	it('renders a markdown table with totals and per-node rows', () => {
		const report = {
			totalCombos: 2,
			coveredCombos: 1,
			coveragePercent: 50,
			nodes: [
				{
					nodeName: 'n8n-nodes-base.example',
					totalCombos: 2,
					coveredCombos: 1,
					uncovered: [{ resource: 'ticket', operation: 'create', version: 1 }],
				},
			],
		};

		const markdown = formatCoverageMarkdown(report);

		expect(markdown).toContain('Total combos: 2');
		expect(markdown).toContain('Covered: 1 (50%)');
		expect(markdown).toContain('n8n-nodes-base.example');
		expect(markdown).toContain('ticket/create@1');
	});
});
