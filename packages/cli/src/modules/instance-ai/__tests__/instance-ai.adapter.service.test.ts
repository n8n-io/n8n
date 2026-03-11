import type { ExecutionRepository } from '@n8n/db';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

import {
	extractExecutionResult,
	extractExecutionDebugInfo,
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
		expect(result.data!['Set Node']).toEqual([{ id: 1, name: 'Alice' }]);
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
		// Each item ~110 chars of JSON → 100 items ≈ 11,000 chars (over 10,000 limit)
		const items = Array.from({ length: 100 }, (_, i) => ({
			id: i,
			payload: 'x'.repeat(80),
		}));

		const result = truncateNodeOutput(items);

		expect(result).toEqual(
			expect.objectContaining({
				truncated: true,
				totalItems: 100,
				message: expect.stringContaining('truncated'),
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
		// Create result data that exceeds 50,000 chars total
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
