import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import * as os from 'os';
import * as path from 'path';

import { harvestOutputSchemas } from './schema-harvest';

function writeFixture(nodesRootDir: string, relativePath: string, content: unknown): string {
	const filePath = path.join(nodesRootDir, relativePath);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(content));
	return filePath;
}

function baseFixture(overrides: {
	targetType: string;
	targetName?: string;
	parameters?: Record<string, unknown>;
	typeVersion?: number;
	pinnedOnTarget?: boolean;
	downstreamNoOp?: boolean;
	sample?: unknown;
}) {
	const targetName = overrides.targetName ?? 'Target';
	const sample = overrides.sample ?? { ok: true, id: '123' };

	const nodes = [
		{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, parameters: {} },
		{
			name: targetName,
			type: overrides.targetType,
			typeVersion: overrides.typeVersion ?? 1,
			parameters: overrides.parameters ?? {},
		},
	];
	const connections: Record<string, { main?: Array<Array<{ node: string }>> }> = {
		Trigger: { main: [[{ node: targetName }]] },
	};
	const pinData: Record<string, Array<{ json: unknown }>> = {};

	if (overrides.downstreamNoOp) {
		nodes.push({ name: 'NoOp', type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {} });
		connections[targetName] = { main: [[{ node: 'NoOp' }]] };
		pinData.NoOp = [{ json: sample }];
	} else if (overrides.pinnedOnTarget) {
		pinData[targetName] = [{ json: sample }];
	}

	return { nodes, connections, pinData };
}

describe('harvestOutputSchemas', () => {
	let nodesRootDir: string;

	beforeEach(() => {
		nodesRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-harvest-test-'));
	});

	afterEach(() => {
		fs.rmSync(nodesRootDir, { recursive: true, force: true });
	});

	it('writes a schema derived from a downstream NoOp pin, using the path resource/operation', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				downstreamNoOp: true,
				sample: { id: '1', name: 'foo' },
			}),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(1);
		expect(result.written[0]).toMatchObject({ resource: 'item', operation: 'get', version: 1 });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(fs.existsSync(filePath)).toBe(true);
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: { id: { type: 'string' }, name: { type: 'string' } },
		});
	});

	it('writes a schema derived from pinData directly on the target node', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });
		expect(result.written).toHaveLength(1);
	});

	it('prefers the node parameters over the path when both give a resource/operation', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				parameters: { resource: 'gadget', operation: 'fetch' },
				pinnedOnTarget: true,
			}),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(1);
		expect(result.written[0]).toMatchObject({ resource: 'gadget', operation: 'fetch' });
		expect(
			fs.existsSync(path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/gadget/fetch.json')),
		).toBe(true);
	});

	it('never overwrites an existing schema file', () => {
		const existingPath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		fs.mkdirSync(path.dirname(existingPath), { recursive: true });
		fs.writeFileSync(existingPath, JSON.stringify({ type: 'string' }));

		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.skippedExisting).toHaveLength(1);
		expect(jsonParse(fs.readFileSync(existingPath, 'utf-8'))).toEqual({ type: 'string' });
	});

	it('skips fixtures whose version major is superseded by an existing schema dir', () => {
		fs.mkdirSync(path.join(nodesRootDir, 'Widget/__schema__/v2.3.0'), { recursive: true });

		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true, typeVersion: 1 }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.unmapped).toEqual([expect.objectContaining({ reason: 'superseded-major' })]);
		expect(fs.existsSync(path.join(nodesRootDir, 'Widget/__schema__/v1.0.0'))).toBe(false);
	});

	it('still harvests same-major fixtures when higher minors exist', () => {
		fs.mkdirSync(path.join(nodesRootDir, 'Widget/__schema__/v2.7.0'), { recursive: true });

		writeFixture(
			nodesRootDir,
			'Widget/test/v2/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true, typeVersion: 2.3 }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(1);
		expect(fs.existsSync(path.join(nodesRootDir, 'Widget/__schema__/v2.3.0/item/get.json'))).toBe(
			true,
		);
	});

	it('does not touch the filesystem in dry-run mode', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		const result = harvestOutputSchemas({ nodesRootDir, dryRun: true });

		expect(result.written).toHaveLength(1);
		expect(fs.existsSync(path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json'))).toBe(
			false,
		);
	});

	it('is idempotent: a second run writes nothing new', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		harvestOutputSchemas({ nodesRootDir });
		const second = harvestOutputSchemas({ nodesRootDir });

		expect(second.written).toHaveLength(0);
		expect(second.skippedExisting).toHaveLength(1);
	});

	it('writes a target only once when two fixtures map to the same resource/operation, even in dry-run', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.perItem.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.batch.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		const dryRunResult = harvestOutputSchemas({ nodesRootDir, dryRun: true });
		expect(dryRunResult.written).toHaveLength(1);
		expect(dryRunResult.skippedExisting).toHaveLength(1);

		const realResult = harvestOutputSchemas({ nodesRootDir });
		expect(realResult.written).toHaveLength(1);
		expect(realResult.skippedExisting).toHaveLength(1);
	});

	it('merges every fixture that maps to the same resource/operation', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.minimal.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { id: '1' },
			}),
		);
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { id: '1', nested: { extra: true }, tags: ['a'] },
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: {
				id: { type: 'string' },
				nested: { type: 'object', properties: { extra: { type: 'boolean' } } },
				tags: { type: 'array', items: { type: 'string' } },
			},
		});
	});

	it('unions conflicting property types across fixtures', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.a.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true, sample: { id: 1 } }),
		);
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.b.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { id: '1' },
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: { id: { type: ['number', 'string'] } },
		});
	});

	it('widens a null sample to unknown instead of pinning the type to null', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { value: null, nested: { deep: null } },
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: {
				value: {},
				nested: { type: 'object', properties: { deep: {} } },
			},
		});
	});

	it('lets a non-null sample win over a null one from another fixture', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.a.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { value: null },
			}),
		);
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.b.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { value: 42 },
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: { value: { type: 'number' } },
		});
	});

	it('keeps per-account custom fields opaque', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { id: '1', custom_fields: { test_string: null } },
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: { id: { type: 'string' }, custom_fields: { type: 'object' } },
		});
	});

	it('describes an object keyed only by record ids as a map', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: {
					assignments: {
						'ba4a422e-bdce-4795-b4b6-579287363f0e': { orderHint: '85', done: true },
						'cb5b533f-cedf-48a6-b5c7-68a398474a1f': { orderHint: '9!', count: 2 },
					},
				},
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: {
				assignments: {
					type: 'object',
					additionalProperties: {
						type: 'object',
						properties: {
							orderHint: { type: 'string' },
							done: { type: 'boolean' },
							count: { type: 'number' },
						},
					},
				},
			},
		});
	});

	it('drops record ids that are mixed in with real fields', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: {
					title: 'a deal',
					f5ed368466cf0477371c6ee076252f49a188848e: null,
					febf5dbb0f1e95d60876abc4638483291b8ef18b: 'custom',
				},
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const filePath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		expect(jsonParse(fs.readFileSync(filePath, 'utf-8'))).toEqual({
			type: 'object',
			properties: { title: { type: 'string' } },
		});
	});

	it("skips operations whose output is shaped by the user's own data", () => {
		writeFixture(
			nodesRootDir,
			'Microsoft/Excel/test/v2/node/table/lookup.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.microsoftExcel',
				typeVersion: 2,
				parameters: { resource: 'table', operation: 'lookup' },
				pinnedOnTarget: true,
				sample: { country: 'uk', visits: 1 },
			}),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.unmapped).toEqual([expect.objectContaining({ reason: 'user-shaped-output' })]);
	});

	it('does not shadow a schema another minor of the same major already covers', () => {
		const existingPath = path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json');
		fs.mkdirSync(path.dirname(existingPath), { recursive: true });
		fs.writeFileSync(existingPath, JSON.stringify({ type: 'object' }));

		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true, typeVersion: 1.1 }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.skippedExisting).toHaveLength(1);
		expect(fs.existsSync(path.join(nodesRootDir, 'Widget/__schema__/v1.1.0/item/get.json'))).toBe(
			false,
		);
	});

	it('produces deterministic, sorted-key JSON', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/item/get.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				pinnedOnTarget: true,
				sample: { zebra: 1, apple: 2 },
			}),
		);

		harvestOutputSchemas({ nodesRootDir });

		const raw = fs.readFileSync(
			path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/item/get.json'),
			'utf-8',
		);
		expect(raw.indexOf('"apple"')).toBeLessThan(raw.indexOf('"zebra"'));
		expect(raw.endsWith('\n')).toBe(true);
	});

	it('skips resource-less fixtures without an explicit operation param, without guessing', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/ambiguousScenario.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.unmapped).toHaveLength(1);
		expect(result.unmapped[0].reason).toBe('no-operation-determined');
	});

	it('skips fixtures with no ambiguous or missing target node', () => {
		const fixture = baseFixture({
			targetType: 'n8n-nodes-base.somethingElse',
			pinnedOnTarget: true,
		});
		writeFixture(nodesRootDir, 'Widget/test/v1/node/item/get.workflow.json', fixture);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.unmapped).toEqual([expect.objectContaining({ reason: 'no-unique-target-node' })]);
	});

	it('skips fixtures outside the test/node convention', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/oldStyle.workflow.json',
			baseFixture({ targetType: 'n8n-nodes-base.widget', pinnedOnTarget: true }),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.unmapped).toEqual([expect.objectContaining({ reason: 'no-node-path-segment' })]);
	});

	it('skips fixtures with no output sample at all', () => {
		const fixture = baseFixture({ targetType: 'n8n-nodes-base.widget' });
		writeFixture(nodesRootDir, 'Widget/test/v1/node/item/get.workflow.json', fixture);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(0);
		expect(result.unmapped).toEqual([expect.objectContaining({ reason: 'no-output-sample' })]);
	});

	it('supports resource-less nodes writing directly under the version directory', () => {
		writeFixture(
			nodesRootDir,
			'Widget/test/v1/node/execute.workflow.json',
			baseFixture({
				targetType: 'n8n-nodes-base.widget',
				parameters: { operation: 'execute' },
				pinnedOnTarget: true,
			}),
		);

		const result = harvestOutputSchemas({ nodesRootDir });

		expect(result.written).toHaveLength(1);
		expect(result.written[0]).toMatchObject({ resource: '', operation: 'execute' });
		expect(fs.existsSync(path.join(nodesRootDir, 'Widget/__schema__/v1.0.0/execute.json'))).toBe(
			true,
		);
	});
});
