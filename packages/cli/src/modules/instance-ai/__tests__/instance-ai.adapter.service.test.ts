// Mock the barrel import to avoid pulling in @mastra/core (ESM-only transitive deps)
jest.mock('@n8n/instance-ai', () => ({
	wrapUntrustedData(content: string, source: string, label?: string): string {
		const esc = (s: string) =>
			s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		const safeLabel = label ? ` label="${esc(label)}"` : '';
		const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
		return `<untrusted_data source="${esc(source)}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
	},
}));

import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

import {
	extractExecutionResult,
	extractExecutionDebugInfo,
	extractNodeOutput,
	truncateNodeOutput,
	truncateResultData,
} from '../instance-ai.adapter.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockExecutionRepository(
	execution?: ReturnType<typeof makeExecution>,
): jest.Mocked<Pick<ExecutionRepository, 'findSingleExecution'>> {
	return {
		findSingleExecution: jest.fn().mockResolvedValue(execution),
	};
}

/** Build a minimal execution object that satisfies the shape read by the adapter helpers. */
function makeExecution(
	overrides: {
		status?: string;
		startedAt?: Date;
		stoppedAt?: Date;
		runData?: Record<string, ITaskData[]>;
		error?: { message: string };
		workflowNodes?: Array<{ name: string; type: string }>;
	} = {},
) {
	const runData = overrides.runData ?? {};
	return {
		id: 'exec-1',
		status: overrides.status ?? 'success',
		startedAt: overrides.startedAt ?? new Date('2026-01-01T00:00:00Z'),
		stoppedAt: overrides.stoppedAt ?? new Date('2026-01-01T00:01:00Z'),
		workflowData: {
			nodes: overrides.workflowNodes ?? [],
		},
		data: {
			resultData: {
				runData,
				error: overrides.error,
			},
		} as unknown as IRunExecutionData,
	};
}

/** Build a task data entry with the given output items. */
function makeTaskData(
	outputItems: Array<Record<string, unknown>>,
	opts?: { error?: Error; startTime?: number; executionTime?: number },
): ITaskData {
	return {
		startTime: opts?.startTime ?? 1000,
		executionTime: opts?.executionTime ?? 500,
		executionIndex: 0,
		source: [],
		data: {
			main: [outputItems.map((json) => ({ json }))],
		},
		...(opts?.error ? { error: opts.error } : {}),
	} as unknown as ITaskData;
}

// ---------------------------------------------------------------------------
// extractExecutionResult
// ---------------------------------------------------------------------------

describe('extractExecutionResult', () => {
	it('returns unknown status when execution is not found', async () => {
		const repo = createMockExecutionRepository(undefined);

		const result = await extractExecutionResult(
			repo as unknown as ExecutionRepository,
			'missing-id',
		);

		expect(result).toEqual({ executionId: 'missing-id', status: 'unknown' });
	});

	it('maps "error" status to "error"', async () => {
		const repo = createMockExecutionRepository(
			makeExecution({ status: 'error', error: { message: 'boom' } }),
		);

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('error');
		expect(result.error).toBe('boom');
	});

	it('maps "crashed" status to "error"', async () => {
		const repo = createMockExecutionRepository(makeExecution({ status: 'crashed' }));

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('error');
	});

	it('maps "running" status to "running"', async () => {
		const repo = createMockExecutionRepository(makeExecution({ status: 'running' }));

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('running');
	});

	it('maps "new" status to "running"', async () => {
		const repo = createMockExecutionRepository(makeExecution({ status: 'new' }));

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('running');
	});

	it('maps "waiting" status to "waiting"', async () => {
		const repo = createMockExecutionRepository(makeExecution({ status: 'waiting' }));

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('waiting');
	});

	it('maps "success" status to "success"', async () => {
		const startedAt = new Date('2026-02-01T10:00:00Z');
		const stoppedAt = new Date('2026-02-01T10:01:30Z');
		const repo = createMockExecutionRepository(
			makeExecution({ status: 'success', startedAt, stoppedAt }),
		);

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('success');
		expect(result.startedAt).toBe(startedAt.toISOString());
		expect(result.finishedAt).toBe(stoppedAt.toISOString());
	});

	it('maps any other status (e.g. "canceled") to "success"', async () => {
		const repo = createMockExecutionRepository(makeExecution({ status: 'canceled' }));

		const result = await extractExecutionResult(repo as unknown as ExecutionRepository, 'exec-1');

		expect(result.status).toBe('success');
	});

	it('includes node output data when includeOutputData is true', async () => {
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: {
					'Set Node': [makeTaskData([{ id: 1, name: 'Alice' }])],
				},
			}),
		);

		const result = await extractExecutionResult(
			repo as unknown as ExecutionRepository,
			'exec-1',
			true,
		);

		expect(result.data).toBeDefined();
		// After prompt-injection hardening, node output is wrapped in boundary tags
		expect(result.data!['Set Node']).toContain('<untrusted_data');
		expect(result.data!['Set Node']).toContain('"id": 1');
		expect(result.data!['Set Node']).toContain('"name": "Alice"');
	});

	it('excludes node output data when includeOutputData is false', async () => {
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: {
					'Set Node': [makeTaskData([{ id: 1 }])],
				},
			}),
		);

		const result = await extractExecutionResult(
			repo as unknown as ExecutionRepository,
			'exec-1',
			false,
		);

		expect(result.data).toBeUndefined();
	});

	it('omits data field when runData has no output items', async () => {
		const emptyTaskData: ITaskData = {
			startTime: 1000,
			executionTime: 100,
			executionIndex: 0,
			source: [],
			data: { main: [[]] },
		} as unknown as ITaskData;

		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Empty Node': [emptyTaskData] },
			}),
		);

		const result = await extractExecutionResult(
			repo as unknown as ExecutionRepository,
			'exec-1',
			true,
		);

		expect(result.data).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// truncateNodeOutput
// ---------------------------------------------------------------------------

describe('truncateNodeOutput', () => {
	it('returns items unchanged when total serialized size is within limit', () => {
		const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

		const result = truncateNodeOutput(items);

		expect(result).toEqual(items);
	});

	it('truncates large data and returns a summary object', () => {
		// Each item ~110 chars of JSON → 100 items ≈ 11,000 chars (over 5,000 limit)
		const items = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			payload: 'x'.repeat(80),
		}));

		const result = truncateNodeOutput(items);

		expect(result).toEqual(
			expect.objectContaining({
				truncated: true,
				totalItems: 100,
				message: expect.stringContaining('get-node-output'),
			}),
		);
		// shownItems should be less than totalItems
		const summary = result as { shownItems: number; items: unknown[] };
		expect(summary.shownItems).toBeLessThan(100);
		expect(summary.items.length).toBe(summary.shownItems);
	});

	it('handles items where a single item exceeds the limit', () => {
		const items = [{ data: 'x'.repeat(20_000) }];

		const result = truncateNodeOutput(items);

		// The single item is too large to fit, so zero items are shown
		const summary = result as {
			shownItems: number;
			truncated: boolean;
			items: unknown[];
			totalItems: number;
		};
		expect(summary.truncated).toBe(true);
		expect(summary.totalItems).toBe(1);
		expect(summary.shownItems).toBe(0);
		expect(summary.items).toEqual([]);
	});

	it('keeps nested objects intact when within size limit', () => {
		const items = [
			{
				user: { name: 'Alice', address: { city: 'Berlin' } },
				tags: ['admin', 'user'],
			},
		];

		const result = truncateNodeOutput(items);

		expect(result).toEqual(items);
	});

	it('returns empty array unchanged', () => {
		const items: unknown[] = [];
		// Serialized "[]" is 2 chars, well within the limit
		const result = truncateNodeOutput(items);
		expect(result).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// truncateResultData
// ---------------------------------------------------------------------------

describe('truncateResultData', () => {
	it('returns result data unchanged when within character limit', () => {
		const data = {
			'Node A': [{ id: 1 }],
			'Node B': [{ id: 2 }],
		};

		const result = truncateResultData(data);

		expect(result).toEqual(data);
	});

	it('truncates large result data and adds per-node summaries', () => {
		// Create result data that exceeds 20,000 chars total
		const largeItems = Array.from({ length: 200 }, (_, i) => ({
			id: i,
			data: 'x'.repeat(300),
		}));
		const data: Record<string, unknown> = {
			'Big Node': largeItems,
		};

		const result = truncateResultData(data);

		const nodeResult = result['Big Node'] as {
			_itemCount: number;
			_truncated: boolean;
			_firstItemPreview: unknown;
		};
		expect(nodeResult._truncated).toBe(true);
		expect(nodeResult._itemCount).toBe(200);
		expect(nodeResult._firstItemPreview).toBeDefined();
	});

	it('passes through non-array values unchanged during truncation', () => {
		// Mix of large array and a scalar → scalar passes through
		const bigArray = Array.from({ length: 200 }, (_, i) => ({
			id: i,
			data: 'x'.repeat(300),
		}));
		const data: Record<string, unknown> = {
			'Big Node': bigArray,
			'Scalar Node': 'just a string',
		};

		const result = truncateResultData(data);

		expect(result['Scalar Node']).toBe('just a string');
	});

	it('passes through empty arrays unchanged during truncation', () => {
		const bigArray = Array.from({ length: 200 }, (_, i) => ({
			id: i,
			data: 'x'.repeat(300),
		}));
		const data: Record<string, unknown> = {
			'Big Node': bigArray,
			'Empty Node': [],
		};

		const result = truncateResultData(data);

		expect(result['Empty Node']).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// extractExecutionDebugInfo
// ---------------------------------------------------------------------------

describe('extractExecutionDebugInfo', () => {
	it('returns unknown status with empty nodeTrace when execution is not found', async () => {
		const repo = createMockExecutionRepository(undefined);

		const result = await extractExecutionDebugInfo(
			repo as unknown as ExecutionRepository,
			'missing-id',
		);

		expect(result).toEqual({
			executionId: 'missing-id',
			status: 'unknown',
			nodeTrace: [],
		});
	});

	it('builds a node trace from run data', async () => {
		const execution = makeExecution({
			status: 'success',
			workflowNodes: [
				{ name: 'Start', type: 'n8n-nodes-base.start' },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
			],
			runData: {
				Start: [makeTaskData([{ ok: true }], { startTime: 1000, executionTime: 100 })],
				HTTP: [makeTaskData([{ response: 'ok' }], { startTime: 1100, executionTime: 200 })],
			},
		});
		const repo = createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo(
			repo as unknown as ExecutionRepository,
			'exec-1',
		);

		expect(result.status).toBe('success');
		expect(result.nodeTrace).toHaveLength(2);

		const startTrace = result.nodeTrace.find((n) => n.name === 'Start');
		expect(startTrace).toBeDefined();
		expect(startTrace!.type).toBe('n8n-nodes-base.start');
		expect(startTrace!.status).toBe('success');

		const httpTrace = result.nodeTrace.find((n) => n.name === 'HTTP');
		expect(httpTrace).toBeDefined();
		expect(httpTrace!.type).toBe('n8n-nodes-base.httpRequest');
		expect(httpTrace!.status).toBe('success');
	});

	it('captures failed node information', async () => {
		const nodeError = new Error('Connection refused');
		const execution = makeExecution({
			status: 'error',
			error: { message: 'Workflow failed' },
			workflowNodes: [
				{ name: 'Start', type: 'n8n-nodes-base.start' },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
			],
			runData: {
				Start: [makeTaskData([{ ok: true }], { startTime: 1000, executionTime: 100 })],
				HTTP: [
					makeTaskData([{ input: 'data' }], {
						error: nodeError,
						startTime: 1100,
						executionTime: 50,
					}),
				],
			},
		});
		const repo = createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo(
			repo as unknown as ExecutionRepository,
			'exec-1',
		);

		expect(result.status).toBe('error');
		expect(result.failedNode).toBeDefined();
		expect(result.failedNode!.name).toBe('HTTP');
		expect(result.failedNode!.type).toBe('n8n-nodes-base.httpRequest');
		expect(result.failedNode!.error).toBe('Connection refused');
	});

	it('uses "unknown" type when node is not in workflowData', async () => {
		const execution = makeExecution({
			status: 'success',
			workflowNodes: [], // no workflow nodes
			runData: {
				'Mystery Node': [makeTaskData([{ foo: 'bar' }])],
			},
		});
		const repo = createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo(
			repo as unknown as ExecutionRepository,
			'exec-1',
		);

		expect(result.nodeTrace).toHaveLength(1);
		expect(result.nodeTrace[0].type).toBe('unknown');
	});

	it('computes startedAt and finishedAt from task data timing', async () => {
		const execution = makeExecution({
			status: 'success',
			workflowNodes: [{ name: 'Node A', type: 'test.type' }],
			runData: {
				'Node A': [makeTaskData([{ ok: true }], { startTime: 1704067200000, executionTime: 5000 })],
			},
		});
		const repo = createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo(
			repo as unknown as ExecutionRepository,
			'exec-1',
		);

		const trace = result.nodeTrace[0];
		expect(trace.startedAt).toBe(new Date(1704067200000).toISOString());
		expect(trace.finishedAt).toBe(new Date(1704067200000 + 5000).toISOString());
	});
});

// ---------------------------------------------------------------------------
// Search cache key uniqueness
// ---------------------------------------------------------------------------

describe('search cache key via JSON.stringify', () => {
	it('produces different keys for different queries', () => {
		const key1 = JSON.stringify(['query1', {}]);
		const key2 = JSON.stringify(['query2', {}]);

		expect(key1).not.toBe(key2);
	});

	it('produces different keys for same query with different options', () => {
		const key1 = JSON.stringify(['search', { maxResults: 5 }]);
		const key2 = JSON.stringify(['search', { maxResults: 10 }]);

		expect(key1).not.toBe(key2);
	});

	it('produces the same key for identical query and options', () => {
		const key1 = JSON.stringify(['search', { maxResults: 5, includeDomains: ['example.com'] }]);
		const key2 = JSON.stringify(['search', { maxResults: 5, includeDomains: ['example.com'] }]);

		expect(key1).toBe(key2);
	});

	it('produces different keys when options have different domain lists', () => {
		const key1 = JSON.stringify(['search', { includeDomains: ['a.com'] }]);
		const key2 = JSON.stringify(['search', { includeDomains: ['b.com'] }]);

		expect(key1).not.toBe(key2);
	});

	it('distinguishes between empty options and undefined options (normalized to {})', () => {
		// The adapter normalizes undefined options to {} via `options ?? {}`
		const key1 = JSON.stringify(['search', {}]);
		const key2 = JSON.stringify(['search', { excludeDomains: [] }]);

		expect(key1).not.toBe(key2);
	});
});

// ---------------------------------------------------------------------------
// extractNodeOutput
// ---------------------------------------------------------------------------

describe('extractNodeOutput', () => {
	it('returns paginated items from a node', async () => {
		const items = Array.from({ length: 25 }, (_, i) => ({ json: { id: i } }));
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Set Node': [makeTaskData(items.map((item) => item.json))] },
			}),
		);

		const result = await extractNodeOutput(
			repo as unknown as ExecutionRepository,
			'exec-1',
			'Set Node',
		);

		expect(result.nodeName).toBe('Set Node');
		expect(result.totalItems).toBe(25);
		expect(result.items).toHaveLength(10); // default maxItems
		expect(result.returned).toEqual({ from: 0, to: 10 });
	});

	it('supports startIndex pagination', async () => {
		const items = Array.from({ length: 25 }, (_, i) => ({ json: { id: i } }));
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Set Node': [makeTaskData(items.map((item) => item.json))] },
			}),
		);

		const result = await extractNodeOutput(
			repo as unknown as ExecutionRepository,
			'exec-1',
			'Set Node',
			{ startIndex: 10, maxItems: 5 },
		);

		expect(result.totalItems).toBe(25);
		expect(result.items).toHaveLength(5);
		expect(result.returned).toEqual({ from: 10, to: 15 });
		// Items are wrapped in untrusted-data boundary tags
		expect(result.items[0]).toContain('<untrusted_data');
		expect(result.items[0]).toContain('"id": 10');
	});

	it('caps maxItems at 50', async () => {
		const items = Array.from({ length: 100 }, (_, i) => ({ json: { id: i } }));
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Set Node': [makeTaskData(items.map((item) => item.json))] },
			}),
		);

		const result = await extractNodeOutput(
			repo as unknown as ExecutionRepository,
			'exec-1',
			'Set Node',
			{ maxItems: 100 },
		);

		expect(result.items).toHaveLength(50);
		expect(result.returned).toEqual({ from: 0, to: 50 });
	});

	it('truncates individual items exceeding 50K chars', async () => {
		const bigItem = { data: 'x'.repeat(60_000) };
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Big Node': [makeTaskData([bigItem])] },
			}),
		);

		const result = await extractNodeOutput(
			repo as unknown as ExecutionRepository,
			'exec-1',
			'Big Node',
		);

		expect(result.totalItems).toBe(1);
		expect(result.items).toHaveLength(1);
		// Items are wrapped in untrusted-data boundary tags after truncation
		const wrapped = result.items[0] as string;
		expect(wrapped).toContain('<untrusted_data');
		expect(wrapped).toContain('_truncatedItem');
		expect(wrapped).toContain('"originalLength"');
	});

	it('throws when execution is not found', async () => {
		const repo = createMockExecutionRepository(undefined);

		await expect(
			extractNodeOutput(repo as unknown as ExecutionRepository, 'missing', 'Node'),
		).rejects.toThrow('Execution missing not found');
	});

	it('throws when node is not in execution data', async () => {
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Other Node': [makeTaskData([{ ok: true }])] },
			}),
		);

		await expect(
			extractNodeOutput(repo as unknown as ExecutionRepository, 'exec-1', 'Missing Node'),
		).rejects.toThrow('Node "Missing Node" not found in execution exec-1');
	});

	it('returns empty slice when startIndex is beyond total items', async () => {
		const repo = createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { Node: [makeTaskData([{ id: 1 }])] },
			}),
		);

		const result = await extractNodeOutput(
			repo as unknown as ExecutionRepository,
			'exec-1',
			'Node',
			{ startIndex: 100 },
		);

		expect(result.totalItems).toBe(1);
		expect(result.items).toHaveLength(0);
		expect(result.returned).toEqual({ from: 100, to: 100 });
	});
});

// ---------------------------------------------------------------------------
// createDataTableAdapter – access control
// ---------------------------------------------------------------------------

jest.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: jest.fn(),
}));

import type {
	User,
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { WorkflowService } from '@/workflows/workflow.service';
import type { License } from '@/license';
import type { RoleService } from '@/services/role.service';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { userHasScopes } from '@/permissions.ee/check-access';

const mockedUserHasScopes = jest.mocked(userHasScopes);

function createNodeAdapterForTests(nodes: Array<Record<string, unknown>>) {
	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		{ error: jest.fn(), scoped: jest.fn().mockReturnThis() } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[0],
		{ ai: { allowSendingParameterValues: false } } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[1],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[2],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[3],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[4],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[5],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[6],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[7],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[8],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[9],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[10],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[11],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{ staticCacheDir: '/tmp' } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[13],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{
			getPreferences: jest.fn().mockReturnValue({ branchReadOnly: false }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[20],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{ isLicensed: jest.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[24],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[25],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
	);

	(
		service as unknown as {
			nodesCache: { promise: Promise<Array<Record<string, unknown>>>; expiresAt: number };
		}
	).nodesCache = {
		promise: Promise.resolve(nodes),
		expiresAt: Date.now() + 60_000,
	};

	return service.createContext(mockUser).nodeService;
}

describe('createNodeAdapter', () => {
	it('preserves credential displayOptions in getDescription()', async () => {
		const adapter = createNodeAdapterForTests([
			{
				name: 'n8n-nodes-base.webhook',
				displayName: 'Webhook',
				description: 'Starts the workflow when a webhook is called',
				group: ['trigger'],
				version: [1, 2.1],
				properties: [],
				credentials: [
					{
						name: 'httpBasicAuth',
						required: true,
						displayOptions: {
							show: {
								authentication: ['basicAuth'],
							},
						},
					},
				],
				inputs: [],
				outputs: [],
				webhooks: [{}],
			},
		]);

		const result = await adapter.getDescription('n8n-nodes-base.webhook', 2.1);

		expect(result.credentials).toEqual([
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
		]);
	});
});

function createDataTableAdapterForTests(overrides?: {
	branchReadOnly?: boolean;
}) {
	const mockProjectRepository = {
		getPersonalProjectForUserOrFail: jest.fn().mockResolvedValue({ id: 'personal-project-id' }),
	};

	const mockDataTableService = {
		getManyAndCount: jest.fn().mockResolvedValue({ data: [], count: 0 }),
		createDataTable: jest.fn().mockResolvedValue({
			id: 'dt-new',
			name: 'New Table',
			columns: [],
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-01'),
		}),
		deleteDataTable: jest.fn().mockResolvedValue(undefined),
		getColumns: jest.fn().mockResolvedValue([]),
	};

	const mockDataTableRepository = {
		findOneByOrFail: jest
			.fn()
			.mockResolvedValue({ id: 'dt-1', name: 'Orders', projectId: 'team-project-id' }),
	};

	const mockSourceControlPreferencesService = {
		getPreferences: jest.fn().mockReturnValue({
			branchReadOnly: overrides?.branchReadOnly ?? false,
		}),
	};

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	// Construct the service with only the dependencies we need, casting the rest
	const service = new InstanceAiAdapterService(
		{ error: jest.fn(), scoped: jest.fn().mockReturnThis() } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[0],
		{ ai: { allowSendingParameterValues: false } } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[1],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[2],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[3],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[4],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[5],
		mockProjectRepository as unknown as ProjectRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[7],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[8],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[9],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[10],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[11],
		{
			collectTypes: jest.fn().mockResolvedValue({ nodes: [], credentials: [] }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		mockDataTableService as unknown as DataTableService,
		mockDataTableRepository as unknown as DataTableRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		mockSourceControlPreferencesService as unknown as SourceControlPreferencesService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{ isLicensed: jest.fn().mockReturnValue(false) } as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[25],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
	);

	const adapter = service.createContext(mockUser).dataTableService;

	return {
		adapter,
		mockProjectRepository,
		mockDataTableService,
		mockDataTableRepository,
		mockSourceControlPreferencesService,
		mockUser,
	};
}

describe('createDataTableAdapter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedUserHasScopes.mockResolvedValue(true);
	});

	describe('resolveProjectId', () => {
		it('falls back to personal project when no projectId provided', async () => {
			const { adapter, mockProjectRepository } = createDataTableAdapterForTests();

			await adapter.list();

			expect(mockProjectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith('user-1');
		});

		it('uses provided projectId when given', async () => {
			const { adapter, mockProjectRepository, mockDataTableService } =
				createDataTableAdapterForTests();

			await adapter.list({ projectId: 'custom-project-id' });

			expect(mockProjectRepository.getPersonalProjectForUserOrFail).not.toHaveBeenCalled();
			expect(mockDataTableService.getManyAndCount).toHaveBeenCalledWith(
				expect.objectContaining({ filter: { projectId: 'custom-project-id' } }),
			);
		});

		it('rejects when user lacks required scope in project', async () => {
			mockedUserHasScopes.mockResolvedValue(false);
			const { adapter } = createDataTableAdapterForTests();

			await expect(adapter.list()).rejects.toThrow(
				'User does not have the required permissions in this project',
			);
		});
	});

	describe('resolveProjectIdForTable', () => {
		it('allows operation when user has required scope for the data table', async () => {
			const { adapter, mockDataTableService } = createDataTableAdapterForTests();

			const result = await adapter.getSchema('dt-1');

			expect(mockedUserHasScopes).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user-1' }),
				['dataTable:read'],
				false,
				{ dataTableId: 'dt-1' },
			);
			expect(mockDataTableService.getColumns).toHaveBeenCalledWith('dt-1', 'team-project-id');
			expect(result).toEqual([]);
		});

		it('rejects when user lacks required scope for the data table', async () => {
			mockedUserHasScopes.mockResolvedValue(false);
			const { adapter } = createDataTableAdapterForTests();

			await expect(adapter.getSchema('dt-1')).rejects.toThrow('Data table "dt-1" not found');
		});
	});

	describe('mutation result metadata', () => {
		it('insertRows returns dataTableId, tableName, and projectId', async () => {
			const { adapter, mockDataTableService } = createDataTableAdapterForTests();
			(mockDataTableService as unknown as Record<string, jest.Mock>).insertRows = jest
				.fn()
				.mockResolvedValue(5);

			const result = await adapter.insertRows('dt-1', [{ col: 'val' }]);

			expect(result).toEqual({
				insertedCount: 5,
				dataTableId: 'dt-1',
				tableName: 'Orders',
				projectId: 'team-project-id',
			});
		});

		it('updateRows returns dataTableId, tableName, and projectId', async () => {
			const { adapter, mockDataTableService } = createDataTableAdapterForTests();
			(mockDataTableService as unknown as Record<string, jest.Mock>).updateRows = jest
				.fn()
				.mockResolvedValue([{ id: 'row-1' }, { id: 'row-2' }]);

			const result = await adapter.updateRows(
				'dt-1',
				{ type: 'and', filters: [{ columnName: 'status', condition: 'eq', value: 'pending' }] },
				{ status: 'done' },
			);

			expect(result).toEqual({
				updatedCount: 2,
				dataTableId: 'dt-1',
				tableName: 'Orders',
				projectId: 'team-project-id',
			});
		});

		it('deleteRows returns dataTableId, tableName, and projectId', async () => {
			const { adapter, mockDataTableService } = createDataTableAdapterForTests();
			(mockDataTableService as unknown as Record<string, jest.Mock>).deleteRows = jest
				.fn()
				.mockResolvedValue([{ id: 'row-1' }]);

			const result = await adapter.deleteRows('dt-1', {
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: 'row-1' }],
			});

			expect(result).toEqual({
				deletedCount: 1,
				dataTableId: 'dt-1',
				tableName: 'Orders',
				projectId: 'team-project-id',
			});
		});
	});

	describe('instance read-only mode', () => {
		it('blocks write operations when instance is in read-only mode', async () => {
			const { adapter } = createDataTableAdapterForTests({ branchReadOnly: true });

			await expect(adapter.create('Test', [])).rejects.toThrow(
				'Cannot modify data tables on a protected instance',
			);
		});

		it('allows read operations when instance is in read-only mode', async () => {
			const { adapter } = createDataTableAdapterForTests({ branchReadOnly: true });

			// list is a read operation — should not throw
			const result = await adapter.list();

			expect(result).toEqual([]);
		});

		it('allows write operations when instance is not in read-only mode', async () => {
			const { adapter, mockDataTableService } = createDataTableAdapterForTests({
				branchReadOnly: false,
			});

			const result = await adapter.create('Test', []);

			expect(mockDataTableService.createDataTable).toHaveBeenCalled();
			expect(result).toEqual(expect.objectContaining({ id: 'dt-new', name: 'New Table' }));
		});
	});
});

// ---------------------------------------------------------------------------
// createWorkflowAdapter – project scoping
// ---------------------------------------------------------------------------

function createWorkflowAdapterForTests(overrides?: {
	namedVersionsLicensed?: boolean;
	foldersLicensed?: boolean;
	branchReadOnly?: boolean;
}) {
	const mockProjectRepository = {
		getPersonalProjectForUserOrFail: jest.fn().mockResolvedValue({ id: 'personal-project-id' }),
	};

	const savedWorkflow = {
		id: 'wf-new',
		name: 'Test Workflow',
		active: false,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		nodes: [],
		connections: {},
	};

	const mockWorkflowRepository = {
		create: jest.fn().mockImplementation((data: Record<string, unknown>) => data),
		save: jest.fn().mockResolvedValue(savedWorkflow),
	};

	const mockSharedWorkflowRepository = {
		create: jest.fn().mockImplementation((data: Record<string, unknown>) => data),
		save: jest.fn().mockResolvedValue(undefined),
	};

	const mockWorkflowService = {
		update: jest.fn().mockResolvedValue(savedWorkflow),
	};

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		{ error: jest.fn(), scoped: jest.fn().mockReturnThis() } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[0],
		{ ai: { allowSendingParameterValues: false } } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[1],
		mockWorkflowService as unknown as WorkflowService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[3],
		mockWorkflowRepository as unknown as WorkflowRepository,
		mockSharedWorkflowRepository as unknown as SharedWorkflowRepository,
		mockProjectRepository as unknown as ProjectRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[7],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[8],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[9],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[10],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[11],
		{
			collectTypes: jest.fn().mockResolvedValue({ nodes: [], credentials: [] }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{
			getPreferences: jest
				.fn()
				.mockReturnValue({ branchReadOnly: overrides?.branchReadOnly ?? false }),
		} as unknown as SourceControlPreferencesService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{
			isLicensed: jest.fn().mockImplementation((feat: string) => {
				if (feat === 'feat:namedVersions') return overrides?.namedVersionsLicensed ?? false;
				if (feat === 'feat:folders') return overrides?.foldersLicensed ?? false;
				return false;
			}),
			isSharingEnabled: jest.fn().mockReturnValue(false),
		} as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[25],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
	);

	const context = service.createContext(mockUser);
	const adapter = context.workflowService;

	return {
		adapter,
		context,
		mockProjectRepository,
		mockWorkflowRepository,
		mockSharedWorkflowRepository,
		mockWorkflowService,
		mockUser,
	};
}

const minimalWorkflowJSON = {
	name: 'Test',
	nodes: [],
	connections: {},
} as unknown as WorkflowJSON;

describe('createWorkflowAdapter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedUserHasScopes.mockResolvedValue(true);
	});

	it('defaults to personal project when no projectId provided', async () => {
		const { adapter, mockProjectRepository, mockSharedWorkflowRepository } =
			createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON);

		expect(mockProjectRepository.getPersonalProjectForUserOrFail).toHaveBeenCalledWith('user-1');
		expect(mockSharedWorkflowRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'personal-project-id' }),
		);
	});

	it('creates workflow in specified project when projectId provided', async () => {
		const { adapter, mockProjectRepository, mockSharedWorkflowRepository } =
			createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
			projectId: 'team-project-id',
		});

		expect(mockProjectRepository.getPersonalProjectForUserOrFail).not.toHaveBeenCalled();
		expect(mockSharedWorkflowRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'team-project-id' }),
		);
	});

	it('rejects when user lacks workflow:create scope in project', async () => {
		mockedUserHasScopes.mockResolvedValue(false);
		const { adapter } = createWorkflowAdapterForTests();

		await expect(
			adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
				projectId: 'restricted-project-id',
			}),
		).rejects.toThrow('User does not have the required permissions in this project');
	});

	describe('instance read-only mode', () => {
		it('blocks createFromWorkflowJSON when branchReadOnly is true', async () => {
			const { adapter } = createWorkflowAdapterForTests({ branchReadOnly: true });

			await expect(adapter.createFromWorkflowJSON(minimalWorkflowJSON)).rejects.toThrow(
				'Cannot modify workflows on a protected instance',
			);
		});

		it('blocks archive when branchReadOnly is true', async () => {
			const { adapter } = createWorkflowAdapterForTests({ branchReadOnly: true });

			await expect(adapter.archive('wf-1')).rejects.toThrow(
				'Cannot modify workflows on a protected instance',
			);
		});

		it('blocks delete when branchReadOnly is true', async () => {
			const { adapter } = createWorkflowAdapterForTests({ branchReadOnly: true });

			await expect(adapter.delete('wf-1')).rejects.toThrow(
				'Cannot modify workflows on a protected instance',
			);
		});
	});
});

// ---------------------------------------------------------------------------
// License-gated features
// ---------------------------------------------------------------------------

describe('license-gated features', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedUserHasScopes.mockResolvedValue(true);
	});

	describe('updateVersion (feat:namedVersions)', () => {
		it('is present on workflowService when licensed', () => {
			const { adapter } = createWorkflowAdapterForTests({ namedVersionsLicensed: true });

			expect(adapter.updateVersion).toBeDefined();
			expect(typeof adapter.updateVersion).toBe('function');
		});

		it('is absent on workflowService when not licensed', () => {
			const { adapter } = createWorkflowAdapterForTests({ namedVersionsLicensed: false });

			expect(adapter.updateVersion).toBeUndefined();
		});
	});

	describe('folders (feat:folders)', () => {
		it('includes folder methods on workspaceService when licensed', () => {
			const { context } = createWorkflowAdapterForTests({ foldersLicensed: true });

			expect(context.workspaceService!.listFolders).toBeDefined();
			expect(context.workspaceService!.createFolder).toBeDefined();
			expect(context.workspaceService!.deleteFolder).toBeDefined();
			expect(context.workspaceService!.moveWorkflowToFolder).toBeDefined();
		});

		it('omits folder methods on workspaceService when not licensed', () => {
			const { context } = createWorkflowAdapterForTests({ foldersLicensed: false });

			expect(context.workspaceService!.listFolders).toBeUndefined();
			expect(context.workspaceService!.createFolder).toBeUndefined();
			expect(context.workspaceService!.deleteFolder).toBeUndefined();
			expect(context.workspaceService!.moveWorkflowToFolder).toBeUndefined();
		});
	});

	describe('licenseHints', () => {
		it('includes hints for unlicensed features', () => {
			const { context } = createWorkflowAdapterForTests({
				namedVersionsLicensed: false,
				foldersLicensed: false,
			});

			expect(context.licenseHints).toEqual(
				expect.arrayContaining([
					expect.stringContaining('Named workflow versions'),
					expect.stringContaining('Folders'),
				]),
			);
		});

		it('omits hints for licensed features', () => {
			const { context } = createWorkflowAdapterForTests({
				namedVersionsLicensed: true,
				foldersLicensed: true,
			});

			expect(context.licenseHints).toEqual([]);
		});

		it('only includes hints for unlicensed features', () => {
			const { context } = createWorkflowAdapterForTests({
				namedVersionsLicensed: true,
				foldersLicensed: false,
			});

			expect(context.licenseHints).toEqual([expect.stringContaining('Folders')]);
			expect(context.licenseHints).not.toEqual(
				expect.arrayContaining([expect.stringContaining('Named workflow versions')]),
			);
		});
	});
});

// ---------------------------------------------------------------------------
// createExecutionAdapter – access control query
// ---------------------------------------------------------------------------

function createExecutionAdapterForTests(overrides?: { sharingEnabled?: boolean }) {
	const mockExecutionRepository = {
		findManyByRangeQuery: jest.fn().mockResolvedValue([]),
	};

	const mockRoleService = {
		rolesWithScope: jest.fn().mockImplementation(async (namespace: string) => {
			if (namespace === 'project') return ['project:editor'];
			if (namespace === 'workflow') return ['workflow:owner', 'workflow:editor'];
			return [];
		}),
	};

	const mockLicense = {
		isLicensed: jest.fn().mockReturnValue(false),
		isSharingEnabled: jest.fn().mockReturnValue(overrides?.sharingEnabled ?? false),
	};

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		{ error: jest.fn(), scoped: jest.fn().mockReturnThis() } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[0],
		{ ai: { allowSendingParameterValues: false } } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[1],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[2],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[3],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[4],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[5],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[6],
		mockExecutionRepository as unknown as ExecutionRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[8],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[9],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[10],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[11],
		{
			collectTypes: jest.fn().mockResolvedValue({ nodes: [], credentials: [] }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{
			getPreferences: jest.fn().mockReturnValue({ branchReadOnly: false }),
		} as unknown as SourceControlPreferencesService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		mockLicense as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[25],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		mockRoleService as unknown as RoleService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
	);

	const adapter = service.createContext(mockUser).executionService;

	return {
		adapter,
		mockExecutionRepository,
		mockRoleService,
		mockLicense,
		mockUser,
	};
}

describe('createExecutionAdapter', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('passes user and sharingOptions to execution query when sharing is enabled', async () => {
		const { adapter, mockExecutionRepository, mockUser } = createExecutionAdapterForTests({
			sharingEnabled: true,
		});

		await adapter.list();

		expect(mockExecutionRepository.findManyByRangeQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				user: mockUser,
				sharingOptions: {
					scopes: ['workflow:read'],
					projectRoles: ['project:editor'],
					workflowRoles: ['workflow:owner', 'workflow:editor'],
				},
			}),
		);
	});

	it('passes user and owner-only sharingOptions when sharing is disabled', async () => {
		const { adapter, mockExecutionRepository, mockUser } = createExecutionAdapterForTests({
			sharingEnabled: false,
		});

		await adapter.list();

		expect(mockExecutionRepository.findManyByRangeQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				user: mockUser,
				sharingOptions: {
					workflowRoles: ['workflow:owner'],
					projectRoles: ['project:personalOwner'],
				},
			}),
		);
	});

	it('does not pass accessibleWorkflowIds to execution query', async () => {
		const { adapter, mockExecutionRepository } = createExecutionAdapterForTests({
			sharingEnabled: true,
		});

		await adapter.list();

		const query = mockExecutionRepository.findManyByRangeQuery.mock.calls[0][0];
		expect(query).not.toHaveProperty('accessibleWorkflowIds');
	});
});
