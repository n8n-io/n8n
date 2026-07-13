// Mock the barrel import so these adapter tests only exercise local formatting helpers.
vi.mock('@n8n/instance-ai', async () => {
	const { WorkflowSaveConflictError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-save-conflict.error'
	);
	return {
		WorkflowSaveConflictError,
		wrapUntrustedData(content: string, source: string, label?: string): string {
			const esc = (s: string) =>
				s
					.replace(/&/g, '&amp;')
					.replace(/"/g, '&quot;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
			const safeLabel = label ? ` label="${esc(label)}"` : '';
			const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
			return `<untrusted_data source="${esc(source)}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
		},
		builderTemplatesOptionsFromEnv: () => ({}),
		deriveCredentialHosts: vi.fn().mockReturnValue([]),
		BuilderTemplatesService: class {
			async getBundle() {
				return { files: [], indexTxt: '', version: null };
			}
			getVersion() {
				return null;
			}
		},
	};
});

import type { Mock, Mocked, MockInstance } from 'vitest';

vi.mock('@n8n/ai-utilities', () => ({
	braveSearch: vi.fn(),
	searxngSearch: vi.fn(),
}));

import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import { Expression } from 'n8n-workflow';
import type {
	ExecutionError,
	IConnections,
	INode,
	INodeParameters,
	IPinData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { NodeCatalogService } from '@/node-catalog';
import type { NodeTypes } from '@/node-types';

import {
	extractExecutionResult,
	extractExecutionDebugInfo,
	extractNodeOutput,
	formatExecutionError,
	resolveDataTableByIdOrName,
	truncateNodeOutput,
	truncateResultData,
} from '../instance-ai.adapter.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockExecutionRepository(
	execution?: ReturnType<typeof makeExecution>,
): Mocked<Pick<ExecutionRepository, 'findSingleExecution'>> {
	const executionPersistence = mock<ExecutionPersistence>();
	executionPersistence.findSingleExecution.mockResolvedValue(execution as never);
	vi.spyOn(Container, 'get').mockReturnValue(executionPersistence);

	return {
		findSingleExecution: vi.fn().mockResolvedValue(execution),
	};
}

/** Build a minimal execution object that satisfies the shape read by the adapter helpers. */
function makeExecution(
	overrides: {
		status?: string;
		startedAt?: Date;
		stoppedAt?: Date;
		runData?: Record<string, ITaskData[]>;
		pinData?: IPinData;
		error?: Partial<ExecutionError>;
		workflowNodes?: Array<{ name: string; type: string; onError?: string }>;
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
				pinData: overrides.pinData,
				error: overrides.error,
			},
		} as unknown as IRunExecutionData,
	};
}

/** Build a task data entry with the given output items. */
function makeTaskData(
	outputItems: Array<Record<string, unknown>>,
	opts?: {
		error?: Error | Partial<ExecutionError>;
		executionStatus?: ITaskData['executionStatus'];
		startTime?: number;
		executionTime?: number;
	},
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
		...(opts?.executionStatus ? { executionStatus: opts.executionStatus } : {}),
	} as unknown as ITaskData;
}

// ---------------------------------------------------------------------------
// extractExecutionResult
// ---------------------------------------------------------------------------

describe('extractExecutionResult', () => {
	it('returns unknown status when execution is not found', async () => {
		createMockExecutionRepository(undefined);

		const result = await extractExecutionResult('missing-id');

		expect(result).toEqual({ executionId: 'missing-id', status: 'unknown' });
	});

	it('maps "error" status to "error"', async () => {
		createMockExecutionRepository(makeExecution({ status: 'error', error: { message: 'boom' } }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('error');
		expect(result.error).toBe('boom');
	});

	it('combines message, description, and upstream messages when the error is a deserialized NodeOperationError', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'error',
				error: {
					name: 'NodeOperationError',
					message: 'Bad request - please check your parameters',
					description: 'Your credit balance is too low to access the Anthropic API.',
					messages: ['400 {"type":"error","error":{"message":"credits"}}'],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', true);

		expect(result.error).toContain('Bad request - please check your parameters');
		expect(result.error).toContain('Your credit balance is too low');
		expect(result.error).toContain('Details:');
		expect(result.error).toContain('400');
	});

	it('suppresses upstream description and messages when allowSendingParameterValues is false', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'error',
				error: {
					name: 'NodeOperationError',
					message: 'Bad request - please check your parameters',
					description: 'Your credit balance is too low to access the Anthropic API.',
					messages: ['400 {"type":"error","error":{"message":"credits"}}'],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', false);

		expect(result.error).toContain('Bad request - please check your parameters');
		expect(result.error).not.toContain('Your credit balance is too low');
		expect(result.error).not.toContain('400');
		expect(result.error).toContain('instance AI privacy setting');
	});

	it('maps "crashed" status to "error"', async () => {
		createMockExecutionRepository(makeExecution({ status: 'crashed' }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('error');
	});

	it('maps "running" status to "running"', async () => {
		createMockExecutionRepository(makeExecution({ status: 'running' }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('running');
	});

	it('maps "new" status to "running"', async () => {
		createMockExecutionRepository(makeExecution({ status: 'new' }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('running');
	});

	it('maps "waiting" status to "waiting"', async () => {
		createMockExecutionRepository(makeExecution({ status: 'waiting' }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('waiting');
	});

	it('maps "success" status to "success"', async () => {
		const startedAt = new Date('2026-02-01T10:00:00Z');
		const stoppedAt = new Date('2026-02-01T10:01:30Z');
		createMockExecutionRepository(makeExecution({ status: 'success', startedAt, stoppedAt }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('success');
		expect(result.startedAt).toBe(startedAt.toISOString());
		expect(result.finishedAt).toBe(stoppedAt.toISOString());
	});

	it('maps any other status (e.g. "canceled") to "success"', async () => {
		createMockExecutionRepository(makeExecution({ status: 'canceled' }));

		const result = await extractExecutionResult('exec-1');

		expect(result.status).toBe('success');
	});

	it('includes node output data when includeOutputData is true', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: {
					'Set Node': [makeTaskData([{ id: 1, name: 'Alice' }])],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', true);

		expect(result.data).toBeDefined();
		// After prompt-injection hardening, node output is wrapped in boundary tags
		expect(result.data!['Set Node']).toContain('<untrusted_data');
		expect(result.data!['Set Node']).toContain('"id": 1');
		expect(result.data!['Set Node']).toContain('"name": "Alice"');
	});

	it('excludes node output data when includeOutputData is false', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: {
					'Set Node': [makeTaskData([{ id: 1 }])],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', false);

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

		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Empty Node': [emptyTaskData] },
			}),
		);

		const result = await extractExecutionResult('exec-1', true);

		expect(result.data).toBeUndefined();
	});

	it('includes node-level errors even when the execution completed successfully', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: {
					geocode_city: [
						makeTaskData([], {
							executionStatus: 'error',
							error: {
								name: 'UnexpectedError',
								message: 'The node has a supplyData method but no execute method.',
							},
						}),
					],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', false);

		expect(result.status).toBe('success');
		expect(result.error).toBeUndefined();
		expect(result.nodeErrors).toEqual([
			{
				nodeName: 'geocode_city',
				message: 'The node has a supplyData method but no execute method.',
			},
		]);
	});

	it('omits errors on nodes configured to continue on error', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				workflowNodes: [
					{
						name: 'Fallback Lookup',
						type: 'n8n-nodes-base.httpRequest',
						onError: 'continueErrorOutput',
					},
				],
				runData: {
					'Fallback Lookup': [
						makeTaskData([], {
							executionStatus: 'error',
							error: { name: 'NodeApiError', message: 'Not found' },
						}),
					],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', false);

		expect(result.nodeErrors).toBeUndefined();
	});

	it('reports a single entry for a node that errored on multiple runs', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: {
					geocode_city: [
						makeTaskData([], {
							executionStatus: 'error',
							error: { name: 'UnexpectedError', message: 'boom 1' },
						}),
						makeTaskData([], {
							executionStatus: 'error',
							error: { name: 'UnexpectedError', message: 'boom 2' },
						}),
					],
				},
			}),
		);

		const result = await extractExecutionResult('exec-1', false);

		expect(result.nodeErrors).toEqual([{ nodeName: 'geocode_city', message: 'boom 1' }]);
	});
});

// ---------------------------------------------------------------------------
// formatExecutionError
// ---------------------------------------------------------------------------

describe('formatExecutionError', () => {
	const nodeOpError = {
		name: 'NodeOperationError',
		message: 'Bad request - please check your parameters',
		description: 'Your credit balance is too low to access the Anthropic API.',
		messages: ['400 {"type":"error","error":{"message":"low balance"}}'],
	} as ExecutionError;

	describe('with upstream details enabled (allowSendingParameterValues=true)', () => {
		it('returns message + description + upstream messages for a NodeOperationError shape', () => {
			const result = formatExecutionError(nodeOpError, true);

			expect(result).toContain('Bad request - please check your parameters');
			expect(result).toContain('Your credit balance is too low');
			expect(result).toContain('Details:');
			expect(result).toContain('low balance');
		});

		it('returns just the message when description and messages are absent', () => {
			const result = formatExecutionError(
				{
					name: 'WorkflowOperationError',
					message: 'something went wrong',
				} as ExecutionError,
				true,
			);

			expect(result).toBe('something went wrong');
		});

		it('does not duplicate description when it equals the message', () => {
			const result = formatExecutionError(
				{
					name: 'WorkflowOperationError',
					message: 'identical',
					description: 'identical',
				} as ExecutionError,
				true,
			);

			expect(result).toBe('identical');
		});

		it('joins multiple upstream messages with a separator', () => {
			const result = formatExecutionError(
				{
					name: 'NodeApiError',
					message: 'API error',
					messages: ['first', 'second', 'third'],
				} as ExecutionError,
				true,
			);

			expect(result).toContain('Details: first | second | third');
		});

		it('truncates oversized output to keep the agent context bounded', () => {
			const huge = 'x'.repeat(10_000);
			const result = formatExecutionError(
				{
					name: 'NodeApiError',
					message: 'API error',
					messages: [huge],
				} as ExecutionError,
				true,
			);

			expect(result.length).toBeLessThanOrEqual(4_001); // MAX_ERROR_CHARS + ellipsis
			expect(result.endsWith('…')).toBe(true);
		});

		it('returns "Unknown error" for an empty error object', () => {
			const result = formatExecutionError({} as ExecutionError, true);

			expect(result).toBe('Unknown error');
		});
	});

	describe('with upstream details suppressed (allowSendingParameterValues=false)', () => {
		it('omits description and upstream messages and adds a hint to ask the user', () => {
			const result = formatExecutionError(nodeOpError, false);

			expect(result).toContain('Bad request - please check your parameters');
			expect(result).not.toContain('Your credit balance is too low');
			expect(result).not.toContain('low balance');
			expect(result).not.toContain('Details:');
			expect(result).toContain('instance AI privacy setting');
			expect(result).toContain('ask the user');
		});

		it('does not append the suppression hint when there are no upstream details to suppress', () => {
			// A bare message has nothing to gate, so the hint would be misleading.
			const result = formatExecutionError(
				{
					name: 'WorkflowOperationError',
					message: 'just a message',
				} as ExecutionError,
				false,
			);

			expect(result).toBe('just a message');
		});

		it('appends the suppression hint when only description is present', () => {
			const result = formatExecutionError(
				{
					name: 'NodeOperationError',
					message: 'top',
					description: 'sensitive upstream payload',
				} as ExecutionError,
				false,
			);

			expect(result).toContain('top');
			expect(result).not.toContain('sensitive upstream payload');
			expect(result).toContain('instance AI privacy setting');
		});
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
		createMockExecutionRepository(undefined);

		const result = await extractExecutionDebugInfo('missing-id');

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
		createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo('exec-1');

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
		createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo('exec-1');

		expect(result.status).toBe('error');
		expect(result.failedNode).toBeDefined();
		expect(result.failedNode!.name).toBe('HTTP');
		expect(result.failedNode!.type).toBe('n8n-nodes-base.httpRequest');
		expect(result.failedNode!.error).toBe('Connection refused');
	});

	it('formats failed node error from a deserialized NodeOperationError shape (no Error prototype)', async () => {
		// After unflattenData, the persisted error is a plain object with the
		// NodeOperationError fields but no Error prototype. The formatter must
		// still surface message + description + upstream messages.
		const deserialized: Partial<ExecutionError> = {
			name: 'NodeOperationError',
			message: 'Bad request - please check your parameters',
			description: 'Your credit balance is too low to access the Anthropic API.',
			messages: ['400 {"type":"error","error":{"message":"low balance"}}'],
		};
		const execution = makeExecution({
			status: 'error',
			workflowNodes: [{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }],
			runData: {
				'AI Agent': [
					makeTaskData([{ chatInput: 'Hello' }], {
						error: deserialized,
						startTime: 1100,
						executionTime: 50,
					}),
				],
			},
		});
		createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo('exec-1', true);

		expect(result.failedNode).toBeDefined();
		expect(result.failedNode!.error).not.toBe('[object Object]');
		expect(result.failedNode!.error).toContain('Bad request');
		expect(result.failedNode!.error).toContain('Your credit balance is too low');
		expect(result.failedNode!.error).toContain('Details:');
		expect(result.failedNode!.error).toContain('low balance');
	});

	it('suppresses upstream description and messages on the failed node when allowSendingParameterValues is false', async () => {
		const deserialized: Partial<ExecutionError> = {
			name: 'NodeOperationError',
			message: 'Bad request - please check your parameters',
			description: 'Your credit balance is too low to access the Anthropic API.',
			messages: ['400 {"type":"error","error":{"message":"low balance"}}'],
		};
		const execution = makeExecution({
			status: 'error',
			workflowNodes: [{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' }],
			runData: {
				'AI Agent': [makeTaskData([{ chatInput: 'Hello' }], { error: deserialized })],
			},
		});
		createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo('exec-1', false);

		expect(result.failedNode!.error).toContain('Bad request');
		expect(result.failedNode!.error).not.toContain('Your credit balance is too low');
		expect(result.failedNode!.error).not.toContain('low balance');
		expect(result.failedNode!.error).toContain('instance AI privacy setting');
	});

	it('uses "unknown" type when node is not in workflowData', async () => {
		const execution = makeExecution({
			status: 'success',
			workflowNodes: [], // no workflow nodes
			runData: {
				'Mystery Node': [makeTaskData([{ foo: 'bar' }])],
			},
		});
		createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo('exec-1');

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
		createMockExecutionRepository(execution);

		const result = await extractExecutionDebugInfo('exec-1');

		const trace = result.nodeTrace[0];
		expect(trace.startedAt).toBe(new Date(1704067200000).toISOString());
		expect(trace.finishedAt).toBe(new Date(1704067200000 + 5000).toISOString());
	});

	// ── resolvedParameters on failedNode ──────────────────────────────────────

	describe('failedNode.resolvedParameters', () => {
		const debugNodeTypes = mock<NodeTypes>();

		/** Build an execution that has a full workflow snapshot + a failed node entry. */
		function makeFailedExecution(opts: {
			nodes: INode[];
			connections: IConnections;
			failedNodeName: string;
			parentRunData: Record<string, ITaskData[]>;
			error?: Error | Partial<ExecutionError>;
		}) {
			return {
				id: 'exec-1',
				mode: 'manual',
				status: 'error',
				startedAt: new Date('2026-01-01T00:00:00Z'),
				stoppedAt: new Date('2026-01-01T00:00:01Z'),
				workflowData: {
					id: 'wf-1',
					name: 'Test Workflow',
					nodes: opts.nodes,
					connections: opts.connections,
					settings: {},
				},
				data: {
					resultData: {
						runData: {
							...opts.parentRunData,
							[opts.failedNodeName]: [
								makeTaskData([], {
									error: opts.error ?? new Error("Referenced node doesn't exist"),
									startTime: 2000,
									executionTime: 10,
								}),
							],
						},
					},
				} as unknown as IRunExecutionData,
			};
		}

		it('surfaces the offending expression in failedExpressions when resolution itself threw', async () => {
			const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
			const failed = makeNode('Edit Fields', 'n8n-nodes-base.set', {
				assignments: {
					assignments: [
						{ name: 'foo', value: 'bar', type: 'string' },
						{ name: 'baz', value: '={{ $node["DoesNotExist"].json.x }}', type: 'string' },
					],
				},
			});
			const execution = makeFailedExecution({
				nodes: [trigger, failed],
				connections: connect('Trigger', 'Edit Fields'),
				failedNodeName: 'Edit Fields',
				parentRunData: { Trigger: [makeTaskData([{}])] },
			});
			createMockExecutionRepository(execution);

			const result = await extractExecutionDebugInfo('exec-1', true, debugNodeTypes);

			expect(result.failedNode?.name).toBe('Edit Fields');
			const bundle = result.failedNode?.resolvedParameters;
			expect(bundle).toBeDefined();
			expect(bundle?.failedExpressions).toHaveLength(1);
			expect(bundle?.failedExpressions[0]).toMatchObject({
				path: 'assignments.assignments[1].value',
				raw: '={{ $node["DoesNotExist"].json.x }}',
				reason: 'expression-error',
			});
			// `nodeName` is intentionally omitted — `failedNode.name` already has it.
			expect((bundle as Record<string, unknown>)?.nodeName).toBeUndefined();
		});

		it('surfaces silent empty-resolution expressions even when runtime threw a different error', async () => {
			const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
			const failed = makeNode('HTTP', 'n8n-nodes-base.httpRequest', {
				// Pure expression that resolves to undefined — caught by the empty-resolution
				// heuristic. (Template concatenations like `={{ $json.missing }}/api` resolve
				// to a non-empty string "undefined/api" and are NOT flagged today.)
				url: '={{ $json.missing }}',
			});
			const execution = makeFailedExecution({
				nodes: [trigger, failed],
				connections: connect('Trigger', 'HTTP'),
				failedNodeName: 'HTTP',
				parentRunData: { Trigger: [makeTaskData([{}])] },
			});
			createMockExecutionRepository(execution);

			const result = await extractExecutionDebugInfo('exec-1', true, debugNodeTypes);

			const bundle = result.failedNode?.resolvedParameters;
			expect(bundle?.emptyResolutions).toEqual([
				expect.objectContaining({ path: 'url', raw: '={{ $json.missing }}' }),
			]);
		});

		it('omits resolvedParameters when allowSendingParameterValues is false', async () => {
			const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
			const failed = makeNode('Edit Fields', 'n8n-nodes-base.set', {
				value: '={{ $json.x }}',
			});
			const execution = makeFailedExecution({
				nodes: [trigger, failed],
				connections: connect('Trigger', 'Edit Fields'),
				failedNodeName: 'Edit Fields',
				parentRunData: { Trigger: [makeTaskData([{ x: 'hidden' }])] },
			});
			createMockExecutionRepository(execution);

			const result = await extractExecutionDebugInfo('exec-1', false, debugNodeTypes);

			expect(result.failedNode?.resolvedParameters).toBeUndefined();
		});

		it('omits resolvedParameters when nodeTypes is not passed (caller opted out)', async () => {
			const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
			const failed = makeNode('Edit Fields', 'n8n-nodes-base.set', { value: '={{ $json.x }}' });
			const execution = makeFailedExecution({
				nodes: [trigger, failed],
				connections: connect('Trigger', 'Edit Fields'),
				failedNodeName: 'Edit Fields',
				parentRunData: { Trigger: [makeTaskData([{ x: 'ok' }])] },
			});
			createMockExecutionRepository(execution);

			const result = await extractExecutionDebugInfo(
				'exec-1',
				true,
				// nodeTypes intentionally omitted
			);

			expect(result.failedNode).toBeDefined();
			expect(result.failedNode?.resolvedParameters).toBeUndefined();
		});

		it('still returns debug info when the resolution helper itself throws', async () => {
			// Failed node is present in runData but missing from the workflow snapshot →
			// extractResolvedNodeParameters throws "Node X not found in execution snapshot".
			const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
			const execution = makeFailedExecution({
				nodes: [trigger], // failed node intentionally missing
				connections: {},
				failedNodeName: 'Missing Node',
				parentRunData: { Trigger: [makeTaskData([{}])] },
			});
			createMockExecutionRepository(execution);

			const result = await extractExecutionDebugInfo('exec-1', true, debugNodeTypes);

			expect(result.failedNode?.name).toBe('Missing Node');
			expect(result.failedNode?.resolvedParameters).toBeUndefined();
		});

		it('resolves against the item index the runtime tagged on the error (not item 0)', async () => {
			// Failure on item 3 of the parent's output — ExpressionError records
			// `context.itemIndex: 3` so the resolution view should target item 3,
			// not the default of 0.
			const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
			const failed = makeNode('Edit Fields', 'n8n-nodes-base.set', {
				value: '={{ $json.label }}',
			});
			const execution = makeFailedExecution({
				nodes: [trigger, failed],
				connections: connect('Trigger', 'Edit Fields'),
				failedNodeName: 'Edit Fields',
				parentRunData: {
					Trigger: [
						makeTaskData([
							{ label: 'item-0' },
							{ label: 'item-1' },
							{ label: 'item-2' },
							{ label: 'item-3-the-culprit' },
						]),
					],
				},
				error: {
					name: 'ExpressionError',
					message: 'boom on item 3',
					context: { itemIndex: 3 },
				},
			});
			createMockExecutionRepository(execution);

			const result = await extractExecutionDebugInfo('exec-1', true, debugNodeTypes);

			const bundle = result.failedNode?.resolvedParameters;
			expect(bundle?.itemIndex).toBe(3);
			// `value` was `={{ $json.label }}`; against item 3 it should resolve to
			// 'item-3-the-culprit', proving we used the runtime-tagged index.
			const resolved = bundle?.resolved;
			expect(typeof resolved).toBe('string');
			expect(resolved as string).toContain('item-3-the-culprit');
		});
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
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Set Node': [makeTaskData(items.map((item) => item.json))] },
			}),
		);

		const result = await extractNodeOutput('exec-1', 'Set Node');

		expect(result.nodeName).toBe('Set Node');
		expect(result.totalItems).toBe(25);
		expect(result.items).toHaveLength(10); // default maxItems
		expect(result.returned).toEqual({ from: 0, to: 10 });
	});

	it('supports startIndex pagination', async () => {
		const items = Array.from({ length: 25 }, (_, i) => ({ json: { id: i } }));
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Set Node': [makeTaskData(items.map((item) => item.json))] },
			}),
		);

		const result = await extractNodeOutput('exec-1', 'Set Node', { startIndex: 10, maxItems: 5 });

		expect(result.totalItems).toBe(25);
		expect(result.items).toHaveLength(5);
		expect(result.returned).toEqual({ from: 10, to: 15 });
		// Items are wrapped in untrusted-data boundary tags
		expect(result.items[0]).toContain('<untrusted_data');
		expect(result.items[0]).toContain('"id": 10');
	});

	it('caps maxItems at 50', async () => {
		const items = Array.from({ length: 100 }, (_, i) => ({ json: { id: i } }));
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Set Node': [makeTaskData(items.map((item) => item.json))] },
			}),
		);

		const result = await extractNodeOutput('exec-1', 'Set Node', { maxItems: 100 });

		expect(result.items).toHaveLength(50);
		expect(result.returned).toEqual({ from: 0, to: 50 });
	});

	it('truncates individual items exceeding 50K chars', async () => {
		const bigItem = { data: 'x'.repeat(60_000) };
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Big Node': [makeTaskData([bigItem])] },
			}),
		);

		const result = await extractNodeOutput('exec-1', 'Big Node');

		expect(result.totalItems).toBe(1);
		expect(result.items).toHaveLength(1);
		// Items are wrapped in untrusted-data boundary tags after truncation
		const wrapped = result.items[0] as string;
		expect(wrapped).toContain('<untrusted_data');
		expect(wrapped).toContain('_truncatedItem');
		expect(wrapped).toContain('"originalLength"');
	});

	it('throws when execution is not found', async () => {
		createMockExecutionRepository(undefined);

		await expect(extractNodeOutput('missing', 'Node')).rejects.toThrow(
			'Execution missing not found',
		);
	});

	it('throws when node is not in execution data', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { 'Other Node': [makeTaskData([{ ok: true }])] },
			}),
		);

		await expect(extractNodeOutput('exec-1', 'Missing Node')).rejects.toThrow(
			'Node "Missing Node" not found in execution exec-1',
		);
	});

	it('returns empty slice when startIndex is beyond total items', async () => {
		createMockExecutionRepository(
			makeExecution({
				status: 'success',
				runData: { Node: [makeTaskData([{ id: 1 }])] },
			}),
		);

		const result = await extractNodeOutput('exec-1', 'Node', { startIndex: 100 });

		expect(result.totalItems).toBe(1);
		expect(result.items).toHaveLength(0);
		expect(result.returned).toEqual({ from: 100, to: 100 });
	});
});

function makeNode(name: string, type: string, parameters: INodeParameters = {}): INode {
	return {
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
}

/** Connect `from` → `to` on the `main` connection (output index 0 → input index 0). */
function connect(from: string, to: string): IConnections {
	return {
		[from]: { main: [[{ node: to, type: 'main', index: 0 }]] },
	};
}

// ---------------------------------------------------------------------------
// createDataTableAdapter – access control
// ---------------------------------------------------------------------------

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

import type {
	AiBuilderTemporaryWorkflowRepository,
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
import { WorkflowSaveConflictError } from '../../../../../@n8n/instance-ai/src/errors/workflow-save-conflict.error';
import type { WorkflowService } from '@/workflows/workflow.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { License } from '@/license';
import type { RoleService } from '@/services/role.service';

import type { OutboundHttp } from '@n8n/backend-network';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { userHasScopes } from '@/permissions.ee/check-access';

const mockedUserHasScopes = vi.mocked(userHasScopes);

function createNodeAdapterServiceForTests(
	nodes: Array<Record<string, unknown>>,
	options?: {
		nodeCatalogService?: Mocked<NodeCatalogService>;
		loadNodesAndCredentials?: { addPostProcessor?: Mock };
	},
) {
	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;
	const nodeCatalogService =
		options?.nodeCatalogService ??
		mock<NodeCatalogService>({
			initialize: vi.fn().mockResolvedValue(undefined),
			getNodeTypeDefinition: vi.fn().mockResolvedValue({ content: 'node-def' }),
			getNodeDefinitionDirs: vi.fn().mockReturnValue([]),
		});
	const loadNodesAndCredentials = options?.loadNodesAndCredentials ?? {};

	const service = new InstanceAiAdapterService(
		{ error: vi.fn(), scoped: vi.fn().mockReturnThis() } as unknown as ConstructorParameters<
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
		loadNodesAndCredentials as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{ staticCacheDir: '/tmp', n8nFolder: '/tmp' } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],

		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[20],
		{
			getPreferences: vi.fn().mockReturnValue({ branchReadOnly: false }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[24],
		{ isLicensed: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[25],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[30],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
		nodeCatalogService,
	);

	(
		service as unknown as {
			nodesCache: { promise: Promise<Array<Record<string, unknown>>>; expiresAt: number };
		}
	).nodesCache = {
		promise: Promise.resolve(nodes),
		expiresAt: Date.now() + 60_000,
	};

	return { service, nodeService: service.createContext(mockUser).nodeService, nodeCatalogService };
}

function createNodeAdapterForTests(
	nodes: Array<Record<string, unknown>>,
	nodeCatalogService?: Mocked<NodeCatalogService>,
) {
	return createNodeAdapterServiceForTests(nodes, { nodeCatalogService }).nodeService;
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

	it('delegates type definitions to NodeCatalogService', async () => {
		const nodeCatalogService = mock<NodeCatalogService>({
			initialize: vi.fn().mockResolvedValue(undefined),
			getNodeTypeDefinition: vi.fn().mockResolvedValue({
				content: 'community-node-def',
				version: '1',
				builderHint: 'Use this for email.',
			}),
			getNodeDefinitionDirs: vi.fn().mockReturnValue([]),
		});
		const adapter = createNodeAdapterForTests([], nodeCatalogService);

		const result = await adapter.getNodeTypeDefinition?.('n8n-nodes-resend.resend', {
			version: '1',
		});

		expect(nodeCatalogService.initialize).toHaveBeenCalled();
		expect(nodeCatalogService.getNodeTypeDefinition).toHaveBeenCalledWith({
			nodeId: 'n8n-nodes-resend.resend',
			version: '1',
		});
		expect(result).toEqual({
			content: 'community-node-def',
			version: '1',
			builderHint: 'Use this for email.',
		});
	});

	it('preserves bare MCP registry slug compatibility for type definitions', async () => {
		const nodeCatalogService = mock<NodeCatalogService>({
			initialize: vi.fn().mockResolvedValue(undefined),
			getNodeTypeDefinition: vi
				.fn()
				.mockResolvedValueOnce({
					content: '',
					error: "Node type 'notion' not found. Use search_nodes to find the correct node ID.",
				})
				.mockResolvedValueOnce({ content: 'registry-node-def' }),
			getNodeDefinitionDirs: vi.fn().mockReturnValue([]),
		});
		const adapter = createNodeAdapterForTests([], nodeCatalogService);

		const result = await adapter.getNodeTypeDefinition?.('notion');

		expect(nodeCatalogService.getNodeTypeDefinition).toHaveBeenNthCalledWith(1, {
			nodeId: 'notion',
		});
		expect(nodeCatalogService.getNodeTypeDefinition).toHaveBeenNthCalledWith(2, {
			nodeId: '@n8n/mcp-registry.notion',
		});
		expect(result).toEqual({ content: 'registry-node-def' });
	});

	it('clears the node description cache when node types reload', async () => {
		let postProcessor: (() => Promise<void>) | undefined;
		const { service } = createNodeAdapterServiceForTests([], {
			loadNodesAndCredentials: {
				addPostProcessor: vi.fn().mockImplementation((callback: () => Promise<void>) => {
					postProcessor = callback;
				}),
			},
		});

		expect(postProcessor).toBeDefined();
		expect(
			(
				service as unknown as {
					nodesCache: unknown;
				}
			).nodesCache,
		).not.toBeNull();

		await postProcessor!();

		expect(
			(
				service as unknown as {
					nodesCache: unknown;
				}
			).nodesCache,
		).toBeNull();
	});

	describe('getResolvedNodeInputs expression isolate lifecycle', () => {
		// Dynamic `inputs` are resolved via workflow.expression, which under
		// N8N_EXPRESSION_ENGINE=vm needs a V8 isolate acquired for the transient
		// workflow first. Without it the VM bridge throws "No bridge acquired" and
		// getNodeInputs silently returns []. These spies pin the acquire/release.
		let acquireSpy: MockInstance;
		let releaseSpy: MockInstance;

		beforeEach(() => {
			acquireSpy = vi.spyOn(Expression.prototype, 'acquireIsolate').mockResolvedValue(true);
			releaseSpy = vi.spyOn(Expression.prototype, 'releaseIsolate').mockResolvedValue(undefined);
		});

		it('acquires and releases the isolate around dynamic input resolution', async () => {
			const { service, nodeService } = createNodeAdapterServiceForTests([]);
			(service as unknown as { nodeTypes: Pick<NodeTypes, 'getByNameAndVersion'> }).nodeTypes = {
				getByNameAndVersion: vi
					.fn()
					.mockReturnValue({ description: { inputs: ['main'], properties: [] } }),
			} as unknown as NodeTypes;

			const workflowJson = {
				nodes: [
					{
						id: 'agent',
						name: 'Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			} as unknown as WorkflowJSON;

			const inputs = await nodeService.getResolvedNodeInputs!(workflowJson, 'Agent');

			expect(inputs).toEqual(['main']);
			expect(acquireSpy).toHaveBeenCalledTimes(1);
			expect(releaseSpy).toHaveBeenCalledTimes(1);
			expect(acquireSpy.mock.invocationCallOrder[0]).toBeLessThan(
				releaseSpy.mock.invocationCallOrder[0],
			);
		});
	});
});

function createDataTableAdapterForTests(overrides?: {
	branchReadOnly?: boolean;
	projectId?: string;
}) {
	const mockProjectRepository = {
		getPersonalProjectForUserOrFail: vi.fn().mockResolvedValue({ id: 'personal-project-id' }),
	};

	const mockDataTableService = {
		getManyAndCount: vi.fn().mockResolvedValue({ data: [], count: 0 }),
		createDataTable: vi.fn().mockResolvedValue({
			id: 'dt-new',
			name: 'New Table',
			columns: [],
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-01'),
		}),
		deleteDataTable: vi.fn().mockResolvedValue(undefined),
		getColumns: vi.fn().mockResolvedValue([]),
	};

	const mockDataTableRepository = {
		findOneBy: vi
			.fn()
			.mockResolvedValue({ id: 'dt-1', name: 'Orders', projectId: 'team-project-id' }),
	};

	const mockSourceControlPreferencesService = {
		getPreferences: vi.fn().mockReturnValue({
			branchReadOnly: overrides?.branchReadOnly ?? false,
		}),
	};

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	// Construct the service with only the dependencies we need, casting the rest
	const service = new InstanceAiAdapterService(
		{ error: vi.fn(), scoped: vi.fn().mockReturnThis() } as unknown as ConstructorParameters<
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
			collectTypes: vi.fn().mockResolvedValue({ nodes: [], credentials: [] }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{ n8nFolder: '/tmp' } as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		mockDataTableService as unknown as DataTableService,
		mockDataTableRepository as unknown as DataTableRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],

		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[20],
		mockSourceControlPreferencesService as unknown as SourceControlPreferencesService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[24],
		{ isLicensed: vi.fn().mockReturnValue(false) } as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[30],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
	);

	const adapter = service.createContext(mockUser, {
		projectId: overrides?.projectId,
	}).dataTableService;

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
		vi.clearAllMocks();
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

		it('resolves table references with the requested permission scope', async () => {
			const { adapter } = createDataTableAdapterForTests();

			const result = await adapter.resolveTableReference?.('dt-1', { permission: 'readRow' });

			expect(mockedUserHasScopes).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user-1' }),
				['dataTable:readRow'],
				false,
				{ dataTableId: 'dt-1' },
			);
			expect(result).toEqual({
				id: 'dt-1',
				name: 'Orders',
				projectId: 'team-project-id',
			});
		});
	});

	describe('mutation result metadata', () => {
		it('insertRows returns dataTableId, tableName, and projectId', async () => {
			const { adapter, mockDataTableService } = createDataTableAdapterForTests();
			(mockDataTableService as unknown as Record<string, Mock>).insertRows = vi
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
			(mockDataTableService as unknown as Record<string, Mock>).updateRows = vi
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
			(mockDataTableService as unknown as Record<string, Mock>).deleteRows = vi
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
				projectId: 'team-project-id',
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
	sharingEnabled?: boolean;
	// Defaults to a bound project (every production run has one). Pass `null` to
	// simulate a run with no bound project.
	projectId?: string | null;
}) {
	const mockProjectRepository = {
		getPersonalProjectForUserOrFail: vi.fn().mockResolvedValue({ id: 'personal-project-id' }),
	};

	const savedWorkflow = {
		id: 'wf-new',
		name: 'Test Workflow',
		active: false,
		versionId: 'version-id',
		activeVersionId: null,
		isArchived: false,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		nodes: [],
		connections: {},
	};

	const mockWorkflowRepository = {
		create: vi.fn().mockImplementation((data: Record<string, unknown>) => data),
		save: vi.fn().mockResolvedValue(savedWorkflow),
		update: vi.fn().mockResolvedValue(undefined),
		manager: {
			transaction: vi.fn(
				async (fn: (transactionManager: { save: Mock }) => Promise<unknown>): Promise<unknown> => {
					return await fn({
						save: vi.fn().mockResolvedValue(savedWorkflow),
					});
				},
			),
		},
	};

	const mockWorkflowFinderService = {
		findWorkflowForUser: vi.fn().mockResolvedValue(savedWorkflow),
	};

	const mockSharedWorkflowRepository = {
		create: vi.fn().mockImplementation((data: Record<string, unknown>) => data),
		save: vi.fn().mockResolvedValue(undefined),
		makeOwner: vi.fn().mockResolvedValue(undefined),
	};

	const mockAiBuilderTemporaryWorkflowRepository = {
		mark: vi.fn().mockResolvedValue(undefined),
		unmark: vi.fn().mockResolvedValue(undefined),
		existsForWorkflow: vi.fn().mockResolvedValue(false),
	};

	const mockWorkflowService = {
		getMany: vi.fn().mockResolvedValue({ workflows: [savedWorkflow] }),
		archive: vi.fn().mockResolvedValue(savedWorkflow),
		unarchive: vi.fn().mockResolvedValue(savedWorkflow),
		activateWorkflow: vi.fn().mockResolvedValue({ activeVersionId: 'version-1' }),
		update: vi.fn().mockResolvedValue(savedWorkflow),
	};
	const mockWorkflowHistoryService = {
		getVersion: vi.fn(),
	};
	const mockEnterpriseWorkflowService = {
		preventTampering: vi.fn(async (data: unknown) => data),
	};
	const mockTelemetry = { track: vi.fn() };
	const mockLogger = {
		error: vi.fn(),
		warn: vi.fn(),
		scoped: vi.fn(),
	};
	mockLogger.scoped.mockReturnValue(mockLogger);

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		mockLogger as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[0],
		{ ai: { allowSendingParameterValues: false } } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[1],
		mockWorkflowService as unknown as WorkflowService,
		mockWorkflowFinderService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[3],
		mockWorkflowRepository as unknown as WorkflowRepository,
		mockSharedWorkflowRepository as unknown as SharedWorkflowRepository,
		mockProjectRepository as unknown as ProjectRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[7],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[8],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[9],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[10],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[11],
		{
			collectTypes: vi.fn().mockResolvedValue({ nodes: [], credentials: [] }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{ n8nFolder: '/tmp' } as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],

		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[20],
		{
			getPreferences: vi
				.fn()
				.mockReturnValue({ branchReadOnly: overrides?.branchReadOnly ?? false }),
		} as unknown as SourceControlPreferencesService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		mockWorkflowHistoryService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[23],
		mockEnterpriseWorkflowService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[24],
		{
			isLicensed: vi.fn().mockImplementation((feat: string) => {
				if (feat === 'feat:namedVersions') return overrides?.namedVersionsLicensed ?? false;
				if (feat === 'feat:folders') return overrides?.foldersLicensed ?? false;
				return false;
			}),
			isSharingEnabled: vi.fn().mockReturnValue(overrides?.sharingEnabled ?? false),
		} as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
		mockTelemetry as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		mockAiBuilderTemporaryWorkflowRepository as unknown as AiBuilderTemporaryWorkflowRepository,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
	);

	const boundProjectId =
		overrides && 'projectId' in overrides ? (overrides.projectId ?? undefined) : 'team-project-id';
	const context = service.createContext(mockUser, {
		threadId: 'thread-1',
		projectId: boundProjectId,
	});
	const adapter = context.workflowService;

	return {
		adapter,
		context,
		mockProjectRepository,
		mockWorkflowRepository,
		mockWorkflowFinderService,
		mockSharedWorkflowRepository,
		mockAiBuilderTemporaryWorkflowRepository,
		mockWorkflowService,
		mockWorkflowHistoryService,
		mockEnterpriseWorkflowService,
		mockTelemetry,
		mockLogger,
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
		vi.clearAllMocks();
		mockedUserHasScopes.mockResolvedValue(true);
	});

	it('preserves node-level execution options when returning WorkflowJSON', async () => {
		const { adapter, mockWorkflowFinderService } = createWorkflowAdapterForTests();
		mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-settings',
			name: 'Debug Workflow',
			active: false,
			versionId: 'version-id',
			activeVersionId: null,
			isArchived: false,
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-01'),
			nodes: [
				{
					id: 'debug-id',
					name: 'DebugHelper',
					type: 'n8n-nodes-base.debugHelper',
					typeVersion: 1,
					position: [208, 0],
					parameters: { category: 'randomData' },
					notes: 'Keep execution settings',
					notesInFlow: true,
					executeOnce: true,
					retryOnFail: true,
					alwaysOutputData: true,
					onError: 'continueErrorOutput',
				},
			],
			connections: {},
			settings: {},
		});

		const result = await adapter.getAsWorkflowJSON('wf-settings');

		expect(result.nodes[0]).toEqual(
			expect.objectContaining({
				notes: 'Keep execution settings',
				notesInFlow: true,
				executeOnce: true,
				retryOnFail: true,
				alwaysOutputData: true,
				onError: 'continueErrorOutput',
			}),
		);
	});

	it('returns the version graph with current workflow metadata when a versionId is passed', async () => {
		const { adapter, mockWorkflowHistoryService, mockUser } = createWorkflowAdapterForTests();
		mockWorkflowHistoryService.getVersion.mockResolvedValue({
			versionId: 'v-old',
			nodes: [
				{
					id: 'old-id',
					name: 'Old Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [0, 0],
					parameters: { keep: true },
				},
			],
			connections: { 'Old Node': {} },
			nodeGroups: null,
		});

		const result = await adapter.getAsWorkflowJSON('wf-new', 'v-old');

		expect(mockWorkflowHistoryService.getVersion).toHaveBeenCalledWith(mockUser, 'wf-new', 'v-old');
		expect(result.name).toBe('Test Workflow');
		expect(result.nodes[0]).toEqual(expect.objectContaining({ name: 'Old Node', typeVersion: 3 }));
		expect(result.connections).toEqual({ 'Old Node': {} });
	});

	it('lists active workflows by default', async () => {
		const { adapter, mockWorkflowService, mockUser } = createWorkflowAdapterForTests();

		const result = await adapter.list({ limit: 10, query: 'Test' });

		expect(mockWorkflowService.getMany).toHaveBeenCalledWith(mockUser, {
			take: 10,
			filter: {
				isArchived: false,
				query: 'Test',
				projectId: 'team-project-id',
			},
		});
		expect(result).toEqual([
			expect.objectContaining({
				id: 'wf-new',
				isArchived: false,
			}),
		]);
	});

	it('lists archived workflows when requested', async () => {
		const { adapter, mockWorkflowService, mockUser } = createWorkflowAdapterForTests();

		await adapter.list({ status: 'archived' });

		expect(mockWorkflowService.getMany).toHaveBeenCalledWith(mockUser, {
			take: 50,
			filter: {
				isArchived: true,
				projectId: 'team-project-id',
			},
		});
	});

	it('omits the archived filter when listing all workflows', async () => {
		const { adapter, mockWorkflowService, mockUser } = createWorkflowAdapterForTests();

		await adapter.list({ status: 'all' });

		expect(mockWorkflowService.getMany).toHaveBeenCalledWith(mockUser, {
			take: 50,
			filter: { projectId: 'team-project-id' },
		});
	});

	it('creates the workflow in the bound project', async () => {
		const { adapter, mockProjectRepository, mockSharedWorkflowRepository } =
			createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON);

		expect(mockProjectRepository.getPersonalProjectForUserOrFail).not.toHaveBeenCalled();
		expect(mockSharedWorkflowRepository.makeOwner).toHaveBeenCalledWith(
			['wf-new'],
			'team-project-id',
			expect.any(Object),
		);
	});

	it('ignores an LLM-supplied projectId and uses the bound project', async () => {
		const { adapter, mockProjectRepository, mockSharedWorkflowRepository } =
			createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
			projectId: 'other-project-id',
		});

		expect(mockProjectRepository.getPersonalProjectForUserOrFail).not.toHaveBeenCalled();
		expect(mockSharedWorkflowRepository.makeOwner).toHaveBeenCalledWith(
			['wf-new'],
			'team-project-id',
			expect.any(Object),
		);
	});

	it('throws when the run has no bound project', async () => {
		const { adapter } = createWorkflowAdapterForTests({ projectId: null });

		await expect(adapter.createFromWorkflowJSON(minimalWorkflowJSON)).rejects.toThrow(
			'this Instance AI run has no bound project',
		);
	});

	it('rejects when the user lacks workflow:create scope in the bound project', async () => {
		mockedUserHasScopes.mockResolvedValue(false);
		const { adapter } = createWorkflowAdapterForTests();

		await expect(adapter.createFromWorkflowJSON(minimalWorkflowJSON)).rejects.toThrow(
			'User does not have the required permissions in this project',
		);
	});

	it('tracks workflow id when publishing a builder workflow', async () => {
		const { adapter, mockTelemetry } = createWorkflowAdapterForTests();

		await adapter.publish('wf-new');

		expect(mockTelemetry.track).toHaveBeenCalledWith('Builder published workflow', {
			thread_id: 'thread-1',
			workflow_id: 'wf-new',
			executed_by: 'ai',
		});
	});

	it('marks the workflow as AI-builder temporary when markAsAiTemporary is true', async () => {
		const {
			adapter,
			mockWorkflowRepository,
			mockSharedWorkflowRepository,
			mockAiBuilderTemporaryWorkflowRepository,
		} = createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
			markAsAiTemporary: true,
		});

		expect(mockWorkflowRepository.create).toHaveBeenCalledWith(
			expect.not.objectContaining({ meta: expect.anything() }),
		);
		expect(mockWorkflowRepository.manager.transaction).toHaveBeenCalled();
		expect(mockSharedWorkflowRepository.makeOwner).toHaveBeenCalledWith(
			['wf-new'],
			'team-project-id',
			expect.any(Object),
		);
		expect(mockAiBuilderTemporaryWorkflowRepository.mark).toHaveBeenCalledWith(
			'wf-new',
			'thread-1',
			expect.any(Object),
		);
	});

	it('archives and unmarks the temporary shell when create update fails', async () => {
		const { adapter, mockAiBuilderTemporaryWorkflowRepository, mockWorkflowService, mockUser } =
			createWorkflowAdapterForTests();
		const saveError = new Error('save failed');
		mockWorkflowService.update.mockRejectedValueOnce(saveError);

		await expect(
			adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
				markAsAiTemporary: true,
			}),
		).rejects.toBe(saveError);

		expect(mockWorkflowService.archive).toHaveBeenCalledWith(mockUser, 'wf-new', {
			skipArchived: true,
		});
		expect(mockAiBuilderTemporaryWorkflowRepository.unmark).toHaveBeenCalledWith('wf-new');
	});

	it('archives and unmarks the temporary shell when credential tamper protection fails', async () => {
		const {
			adapter,
			mockAiBuilderTemporaryWorkflowRepository,
			mockEnterpriseWorkflowService,
			mockWorkflowService,
			mockUser,
		} = createWorkflowAdapterForTests({ sharingEnabled: true });
		const saveError = new Error('credential access denied');
		mockEnterpriseWorkflowService.preventTampering.mockRejectedValueOnce(saveError);

		await expect(
			adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
				markAsAiTemporary: true,
			}),
		).rejects.toBe(saveError);

		expect(mockWorkflowService.update).not.toHaveBeenCalled();
		expect(mockWorkflowService.archive).toHaveBeenCalledWith(mockUser, 'wf-new', {
			skipArchived: true,
		});
		expect(mockAiBuilderTemporaryWorkflowRepository.unmark).toHaveBeenCalledWith('wf-new');
	});

	it('preserves the original create error when shell cleanup fails', async () => {
		const { adapter, mockAiBuilderTemporaryWorkflowRepository, mockLogger, mockWorkflowService } =
			createWorkflowAdapterForTests();
		const saveError = new Error('save failed');
		const cleanupError = new Error('cleanup failed');
		mockWorkflowService.update.mockRejectedValueOnce(saveError);
		mockWorkflowService.archive.mockRejectedValueOnce(cleanupError);

		await expect(
			adapter.createFromWorkflowJSON(minimalWorkflowJSON, {
				markAsAiTemporary: true,
			}),
		).rejects.toBe(saveError);

		expect(mockAiBuilderTemporaryWorkflowRepository.unmark).not.toHaveBeenCalled();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			'Failed to clean up AI-builder workflow shell after create failure',
			{
				threadId: 'thread-1',
				workflowId: 'wf-new',
				error: 'cleanup failed',
			},
		);
	});

	it('does not mark the workflow as AI-builder temporary when markAsAiTemporary is omitted', async () => {
		const { adapter, mockWorkflowRepository } = createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON);

		expect(mockWorkflowRepository.create).toHaveBeenCalledWith(
			expect.not.objectContaining({ meta: expect.anything() }),
		);
	});

	it('persists pinData as an empty object (not undefined) when the SDK workflow has no pinData', async () => {
		// Regression: explicit `pinData: undefined` round-tripped as SQL NULL,
		// which then crashed `getDataLastExecutedNodeData` on test-webhook runs.
		// Match the manual UI path, which stores `{}`.
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON);

		expect(mockWorkflowService.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ pinData: {} }),
			expect.anything(),
			expect.anything(),
		);
	});

	it('clears existing node groups when the SDK workflow declares none (update is authoritative)', async () => {
		// Regression: the SDK omits `nodeGroups` when no `.group(...)` is declared. The
		// update path must treat that as "no groups" and send [] so a removed group is
		// dropped — not silently preserved and then rejected by group validation.
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		await adapter.updateFromWorkflowJSON('wf-new', minimalWorkflowJSON);

		expect(mockWorkflowService.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ nodeGroups: [] }),
			expect.anything(),
			expect.anything(),
		);
	});

	it('writes the node groups the SDK workflow declares', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		const nodeGroups = [{ id: 'g1', name: 'Group 1', nodeIds: ['node-1'] }];
		const workflow = {
			name: 'Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			nodeGroups,
		} as unknown as WorkflowJSON;

		await adapter.updateFromWorkflowJSON('wf-new', workflow);

		const updateData = mockWorkflowService.update.mock.calls[0]?.[1] as { nodeGroups: unknown };
		expect(updateData.nodeGroups).toEqual(nodeGroups);
	});

	it('strips id-less credential references before creating a workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		const workflow = {
			name: 'Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.5,
					position: [0, 0],
					parameters: {},
					credentials: {
						slackApi: { name: 'Slack' },
						gmailOAuth2Api: { id: '', name: 'Gmail' },
						openAiApi: { id: null, name: 'OpenAI' },
						httpHeaderAuth: { id: 'cred-1', name: 'HTTP Header' },
					},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		await adapter.createFromWorkflowJSON(workflow);

		const updateData = mockWorkflowService.update.mock.calls[0]?.[1] as { nodes: INode[] };
		expect(updateData.nodes[0].credentials).toEqual({
			httpHeaderAuth: { id: 'cred-1', name: 'HTTP Header' },
		});
	});

	it('keeps AI Gateway-managed credential references before creating a workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		const workflow = {
			name: 'Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Gemini',
					type: 'n8n-nodes-base.lmChatGoogleGemini',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
						openAiApi: { id: null, name: 'OpenAI' },
					},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		await adapter.createFromWorkflowJSON(workflow);

		const updateData = mockWorkflowService.update.mock.calls[0]?.[1] as { nodes: INode[] };
		expect(updateData.nodes[0].credentials).toEqual({
			googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
		});
		expect(AI_GATEWAY_MANAGED_TAG).toBe('__AI_GATEWAY_MANAGED__');
	});

	it('removes the credentials object when every reference lacks an id during update', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		const workflow = {
			name: 'Test',
			nodes: [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.5,
					position: [0, 0],
					parameters: {},
					credentials: {
						slackApi: { name: 'Slack' },
						gmailOAuth2Api: { id: '  ', name: 'Gmail' },
					},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		await adapter.updateFromWorkflowJSON('wf-new', workflow);

		const updateData = mockWorkflowService.update.mock.calls[0]?.[1] as { nodes: INode[] };
		expect(updateData.nodes[0].credentials).toBeUndefined();
	});

	it('forwards expectedChecksum to workflowService.update', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		await adapter.updateFromWorkflowJSON('wf-new', minimalWorkflowJSON, {
			expectedChecksum: 'expected-checksum',
		});

		expect(mockWorkflowService.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'wf-new',
			expect.objectContaining({ expectedChecksum: 'expected-checksum', source: 'n8n-ai' }),
		);
	});

	it('throws WorkflowSaveConflictError when expectedChecksum mismatches', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		mockWorkflowService.update.mockRejectedValueOnce(new ConflictError('conflict'));

		await expect(
			adapter.updateFromWorkflowJSON('wf-new', minimalWorkflowJSON, {
				expectedChecksum: 'stale-checksum',
			}),
		).rejects.toBeInstanceOf(WorkflowSaveConflictError);
	});

	it('returns a checksum on create and update saves', async () => {
		const { adapter } = createWorkflowAdapterForTests();

		const created = await adapter.createFromWorkflowJSON(minimalWorkflowJSON);
		const updated = await adapter.updateFromWorkflowJSON('wf-new', minimalWorkflowJSON);

		expect(created.checksum).toEqual(expect.any(String));
		expect(updated.checksum).toEqual(expect.any(String));
	});

	it('clears the AI-builder temporary marker when promoting the main workflow', async () => {
		const { adapter, mockAiBuilderTemporaryWorkflowRepository, mockWorkflowRepository } =
			createWorkflowAdapterForTests();
		mockAiBuilderTemporaryWorkflowRepository.existsForWorkflow.mockResolvedValue(true);

		await adapter.clearAiTemporary('wf-new');

		expect(mockAiBuilderTemporaryWorkflowRepository.unmark).toHaveBeenCalledWith('wf-new');
		expect(mockWorkflowRepository.update).not.toHaveBeenCalled();
	});

	it('archives and unmarks an unpromoted AI-builder temporary workflow', async () => {
		const { adapter, mockAiBuilderTemporaryWorkflowRepository, mockWorkflowService } =
			createWorkflowAdapterForTests();
		mockAiBuilderTemporaryWorkflowRepository.existsForWorkflow.mockResolvedValue(true);

		await expect(adapter.archiveIfAiTemporary('wf-new')).resolves.toBe(true);

		expect(mockWorkflowService.archive).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			'wf-new',
			{ skipArchived: true },
		);
		expect(mockAiBuilderTemporaryWorkflowRepository.unmark).toHaveBeenCalledWith('wf-new');
	});

	it('unmarks already-archived temporary workflows without archiving again', async () => {
		const {
			adapter,
			mockAiBuilderTemporaryWorkflowRepository,
			mockWorkflowFinderService,
			mockWorkflowService,
		} = createWorkflowAdapterForTests();
		mockAiBuilderTemporaryWorkflowRepository.existsForWorkflow.mockResolvedValue(true);
		mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-archived',
			isArchived: true,
		});

		await expect(adapter.archiveIfAiTemporary('wf-archived')).resolves.toBe(false);

		expect(mockWorkflowService.archive).not.toHaveBeenCalled();
		expect(mockAiBuilderTemporaryWorkflowRepository.unmark).toHaveBeenCalledWith('wf-archived');
	});

	it('unarchives a workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		await adapter.unarchive('wf-1');

		expect(mockWorkflowService.unarchive).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			'wf-1',
		);
	});

	it('throws when archive cannot find or access the workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		mockWorkflowService.archive.mockResolvedValueOnce(undefined);

		await expect(adapter.archive('wf-missing')).rejects.toThrow(
			'Workflow wf-missing not found or not accessible',
		);
	});

	it('throws when unarchive cannot find or access the workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		mockWorkflowService.unarchive.mockResolvedValueOnce(undefined);

		await expect(adapter.unarchive('wf-missing')).rejects.toThrow(
			'Workflow wf-missing not found or not accessible',
		);
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

		it('blocks unarchive when branchReadOnly is true', async () => {
			const { adapter } = createWorkflowAdapterForTests({ branchReadOnly: true });

			await expect(adapter.unarchive('wf-1')).rejects.toThrow(
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
		vi.clearAllMocks();
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
		findManyByRangeQuery: vi.fn().mockResolvedValue([]),
	};

	const mockRoleService = {
		rolesWithScope: vi.fn().mockImplementation(async (namespace: string) => {
			if (namespace === 'project') return ['project:editor'];
			if (namespace === 'workflow') return ['workflow:owner', 'workflow:editor'];
			return [];
		}),
	};

	const mockLicense = {
		isLicensed: vi.fn().mockReturnValue(false),
		isSharingEnabled: vi.fn().mockReturnValue(overrides?.sharingEnabled ?? false),
	};

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		{ error: vi.fn(), scoped: vi.fn().mockReturnThis() } as unknown as ConstructorParameters<
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
			collectTypes: vi.fn().mockResolvedValue({ nodes: [], credentials: [] }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{ n8nFolder: '/tmp' } as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],

		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[20],
		{
			getPreferences: vi.fn().mockReturnValue({ branchReadOnly: false }),
		} as unknown as SourceControlPreferencesService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[24],
		mockLicense as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		mockRoleService as unknown as RoleService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[30],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
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
		vi.clearAllMocks();
	});

	it.each([true, false])(
		'passes scope-based sharingOptions to execution query (sharing licensed: %s)',
		async (sharingEnabled) => {
			const { adapter, mockExecutionRepository, mockUser } = createExecutionAdapterForTests({
				sharingEnabled,
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
		},
	);

	it('does not pass accessibleWorkflowIds to execution query', async () => {
		const { adapter, mockExecutionRepository } = createExecutionAdapterForTests({
			sharingEnabled: true,
		});

		await adapter.list();

		const query = mockExecutionRepository.findManyByRangeQuery.mock.calls[0][0];
		expect(query).not.toHaveProperty('accessibleWorkflowIds');
	});
});

// ---------------------------------------------------------------------------
// resolveDataTableByIdOrName
// ---------------------------------------------------------------------------

describe('resolveDataTableByIdOrName', () => {
	type TableRecord = { id: string; name: string; projectId: string };

	function makeRepo(tables: TableRecord[]) {
		return {
			findOneBy: vi.fn(async (where: { id: string }) => {
				return tables.find((t) => t.id === where.id) ?? null;
			}),
			findBy: vi.fn(async (where: { name: string; projectId?: string }) => {
				return tables.filter(
					(t) => t.name === where.name && (!where.projectId || t.projectId === where.projectId),
				);
			}),
		};
	}

	function makeLogger() {
		return { warn: vi.fn() };
	}

	const table = { id: 'dt_uuid_123', name: 'kb_sources', projectId: 'proj_1' };

	it('returns hit on an id match without logging a warning', async () => {
		const repo = makeRepo([table]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'dt_uuid_123');

		expect(result).toEqual({ kind: 'hit', table });
		expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'dt_uuid_123' });
		expect(repo.findBy).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('falls back to name lookup when the id lookup misses, and warns', async () => {
		const repo = makeRepo([table]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'kb_sources');

		expect(result).toEqual({ kind: 'hit', table });
		expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'kb_sources' });
		expect(repo.findBy).toHaveBeenCalledWith({ name: 'kb_sources' });
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn.mock.calls[0][0]).toMatch(/called with table name instead of id/);
		expect(logger.warn.mock.calls[0][1]).toEqual({
			passedValue: 'kb_sources',
			resolvedId: 'dt_uuid_123',
			projectId: 'proj_1',
		});
	});

	it('returns miss when neither id nor name matches', async () => {
		const repo = makeRepo([table]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'does_not_exist');

		expect(result).toEqual({ kind: 'miss' });
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('filters id hits that fail the access filter', async () => {
		const repo = makeRepo([table]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'dt_uuid_123', {
			accessFilter: async () => false,
		});

		expect(result).toEqual({ kind: 'miss' });
	});

	it('narrows the name lookup when projectIdFilter is provided', async () => {
		const repo = makeRepo([table, { id: 'dt_uuid_456', name: 'kb_sources', projectId: 'proj_2' }]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'kb_sources', {
			projectIdFilter: 'proj_2',
		});

		expect(result.kind).toBe('hit');
		expect(repo.findBy).toHaveBeenCalledWith({ name: 'kb_sources', projectId: 'proj_2' });
		if (result.kind === 'hit') expect(result.table.id).toBe('dt_uuid_456');
	});

	it('returns ambiguous when multiple accessible candidates share a name', async () => {
		const twin = { id: 'dt_uuid_456', name: 'kb_sources', projectId: 'proj_2' };
		const repo = makeRepo([table, twin]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'kb_sources', {
			accessFilter: async () => true,
		});

		expect(result.kind).toBe('ambiguous');
		if (result.kind === 'ambiguous') {
			expect(result.candidates).toHaveLength(2);
			expect(result.candidates.map((c) => c.projectId).sort()).toEqual(['proj_1', 'proj_2']);
		}
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('picks the single accessible candidate when ambiguity is resolved by access filter', async () => {
		const twin = { id: 'dt_uuid_456', name: 'kb_sources', projectId: 'proj_2' };
		const repo = makeRepo([table, twin]);
		const logger = makeLogger();

		const result = await resolveDataTableByIdOrName(repo, logger, 'kb_sources', {
			accessFilter: async (id) => id === 'dt_uuid_123',
		});

		expect(result.kind).toBe('hit');
		if (result.kind === 'hit') expect(result.table.id).toBe('dt_uuid_123');
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// createExecutionAdapter – run() forces save settings
// ---------------------------------------------------------------------------

function createRunAdapterForTests(
	workflow: Record<string, unknown>,
	options?: {
		activeExecution?: boolean;
		execution?: ReturnType<typeof makeExecution>;
		postExecutePromise?: Promise<unknown>;
		threadId?: string;
		queueMode?: boolean;
	},
) {
	const mockWorkflowFinderService = {
		findWorkflowForUser: vi.fn().mockResolvedValue(workflow),
	};

	const mockWorkflowRunner = {
		run: vi.fn().mockResolvedValue('exec-1'),
	};

	const mockActiveExecutions = {
		getPostExecutePromise: vi
			.fn()
			.mockReturnValue(options?.postExecutePromise ?? Promise.resolve()),
		has: vi.fn().mockReturnValue(options?.activeExecution ?? false),
		stopExecution: vi.fn(),
	};

	const mockExecutionRepository = {
		findSingleExecution: vi.fn().mockResolvedValue(options?.execution),
	};
	const mockExecutionPersistence = mock<ExecutionPersistence>();
	mockExecutionPersistence.findSingleExecution.mockResolvedValue(options?.execution as never);
	vi.spyOn(Container, 'get').mockReturnValue(mockExecutionPersistence);
	const mockTelemetry = { track: vi.fn() };

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		{ error: vi.fn(), scoped: vi.fn().mockReturnThis() } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[0],
		{
			ai: { allowSendingParameterValues: false },
			executions: { mode: options?.queueMode ? 'queue' : 'regular' },
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[1],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[2],
		mockWorkflowFinderService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[3],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[4],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[5],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[6],
		mockExecutionRepository as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[7],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[8],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[9],
		mockActiveExecutions as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[10],
		mockWorkflowRunner as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[11],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[13],
		{ n8nFolder: '/tmp' } as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[14],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[15],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[16],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[17],

		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[18],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[19],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[20],
		{
			getPreferences: vi.fn().mockReturnValue({ branchReadOnly: false }),
		} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[24],
		{ isLicensed: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[25],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
		mockTelemetry as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[30],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
	);

	const adapter = service.createContext(mockUser, { threadId: options?.threadId }).executionService;

	return {
		adapter,
		mockActiveExecutions,
		mockExecutionPersistence,
		mockTelemetry,
		mockWorkflowRunner,
	};
}

describe('createExecutionAdapter run()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forces save settings so the agent can read the result back', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			nodes: [],
			settings: {
				saveManualExecutions: false,
				saveDataSuccessExecution: 'none',
				saveDataErrorExecution: 'none',
				executionOrder: 'v1',
			},
		});

		await adapter.run('wf-1');

		expect(mockWorkflowRunner.run).toHaveBeenCalledTimes(1);
		const runData = mockWorkflowRunner.run.mock.calls[0][0];
		expect(runData.workflowData.settings).toMatchObject({
			executionOrder: 'v1',
			saveManualExecutions: true,
			saveDataSuccessExecution: 'all',
			saveDataErrorExecution: 'all',
		});
	});

	it('still applies overrides when the workflow has no settings', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			nodes: [],
		});

		await adapter.run('wf-1');

		const runData = mockWorkflowRunner.run.mock.calls[0][0];
		expect(runData.workflowData.settings).toEqual({
			saveManualExecutions: true,
			saveDataSuccessExecution: 'all',
			saveDataErrorExecution: 'all',
		});
	});

	it('attaches Instance AI execution telemetry metadata to workflow runs', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			nodes: [
				{
					id: 'node-1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					parameters: {},
					position: [0, 0],
				},
			],
			pinData: {
				Existing: [{ json: { id: 'existing' } }],
			},
		});

		await adapter.run(
			'wf-1',
			{ id: 'input' },
			{
				verificationPinData: {
					Mocked: [{ id: 'mocked' }],
				},
			},
		);

		const runData = mockWorkflowRunner.run.mock.calls[0][0];

		expect(runData.source).toBe('instance_ai');
		expect(runData.telemetryMetadata).toEqual({
			mockDataSources: ['trigger_input', 'verification_pin_data', 'workflow_pin_data'],
		});
	});

	it('removes unreached verification pin data from persisted executions without deleting workflow pins', async () => {
		const workflowPinData = {
			'User Pinned Node': [{ json: { source: 'workflow' } }],
			'Shared Pin Node': [{ json: { source: 'workflow' } }],
		};
		const executionPinData = {
			'Get Berlin Forecast': [{ json: { daily: { precipitation_sum: [0] } } }],
			'Send Rain Alert': [{ json: {} }],
			'User Pinned Node': [{ json: { source: 'workflow' } }],
			'Shared Pin Node': [{ json: { source: 'verification' } }],
		};
		const { adapter, mockExecutionPersistence } = createRunAdapterForTests(
			{
				id: 'wf-1',
				nodes: [],
				pinData: workflowPinData,
			},
			{
				execution: makeExecution({
					status: 'success',
					runData: {
						'Get Berlin Forecast': [makeTaskData([{ daily: { precipitation_sum: [0] } }])],
					},
					pinData: executionPinData,
				}),
			},
		);

		await adapter.run('wf-1', undefined, {
			verificationPinData: {
				'Get Berlin Forecast': [{ daily: { precipitation_sum: [0] } }],
				'Send Rain Alert': [{}],
				'Shared Pin Node': [{ source: 'verification' }],
			},
		});

		expect(mockExecutionPersistence.updateExistingExecution).toHaveBeenCalledTimes(1);
		expect(mockExecutionPersistence.updateExistingExecution).toHaveBeenCalledWith('exec-1', {
			data: expect.objectContaining({
				resultData: expect.objectContaining({
					pinData: {
						'Get Berlin Forecast': [{ json: { daily: { precipitation_sum: [0] } } }],
						'User Pinned Node': [{ json: { source: 'workflow' } }],
						'Shared Pin Node': [{ json: { source: 'workflow' } }],
					},
				}),
			}),
		});
	});

	it('tracks workflow id and success status when a builder execution finishes', async () => {
		const { adapter, mockTelemetry } = createRunAdapterForTests(
			{
				id: 'wf-1',
				nodes: [],
			},
			{
				execution: makeExecution({ status: 'success' }),
				threadId: 'thread-1',
			},
		);

		await adapter.run('wf-1');

		expect(mockTelemetry.track).toHaveBeenCalledWith('Builder executed workflow', {
			thread_id: 'thread-1',
			workflow_id: 'wf-1',
			executed_by: 'ai',
			pinned_node_count: 0,
			exec_type: 'manual',
			status: 'success',
		});
	});

	it('tracks error status when a builder execution fails', async () => {
		const { adapter, mockTelemetry } = createRunAdapterForTests(
			{
				id: 'wf-1',
				nodes: [],
			},
			{
				execution: makeExecution({ status: 'error', error: { message: 'boom' } }),
				threadId: 'thread-1',
			},
		);

		await adapter.run('wf-1');

		expect(mockTelemetry.track).toHaveBeenCalledWith(
			'Builder executed workflow',
			expect.objectContaining({
				workflow_id: 'wf-1',
				status: 'error',
				error: 'boom',
			}),
		);
	});

	it('tracks timeout cancellation as an error status', async () => {
		const { adapter, mockActiveExecutions, mockTelemetry } = createRunAdapterForTests(
			{
				id: 'wf-1',
				nodes: [],
			},
			{
				activeExecution: true,
				postExecutePromise: new Promise(() => {}),
				threadId: 'thread-1',
			},
		);

		await expect(adapter.run('wf-1', undefined, { timeout: 1 })).resolves.toMatchObject({
			status: 'error',
		});

		expect(mockActiveExecutions.stopExecution).toHaveBeenCalled();
		expect(mockTelemetry.track).toHaveBeenCalledWith(
			'Builder executed workflow',
			expect.objectContaining({
				workflow_id: 'wf-1',
				status: 'error',
				error: expect.stringContaining('timed out'),
			}),
		);
	});

	it('tracks error status when an execution fails to launch', async () => {
		const { adapter, mockTelemetry, mockWorkflowRunner } = createRunAdapterForTests(
			{
				id: 'wf-1',
				nodes: [],
			},
			{
				threadId: 'thread-1',
			},
		);

		const launchError = new Error('Failed to run workflow due to missing execution data');
		mockWorkflowRunner.run.mockRejectedValueOnce(launchError);

		await expect(adapter.run('wf-1')).rejects.toThrow(launchError);

		expect(mockTelemetry.track).toHaveBeenCalledWith(
			'Builder executed workflow',
			expect.objectContaining({
				workflow_id: 'wf-1',
				status: 'error',
				error: 'Failed to run workflow due to missing execution data',
			}),
		);
	});

	it('populates runnable executionData for a trigger run with no input', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			nodes: [
				{
					id: 'node-1',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
				},
			],
		});

		await adapter.run('wf-1');

		const runData = mockWorkflowRunner.run.mock.calls[0][0];
		expect(runData.executionMode).toBe('trigger');
		// The execution must be serializable for queue mode and directly runnable
		// in regular mode, where WorkflowRunner uses this stack immediately.
		expect(runData.executionData).toBeDefined();
		const firstStackItem = runData.executionData?.executionData?.nodeExecutionStack[0];
		expect(firstStackItem?.node.name).toBe('Schedule Trigger');
		expect(firstStackItem?.data.main[0]?.[0]?.json).toEqual({});
	});

	it('wraps manual metadata into executionData when offloading to workers so the worker can run it', async () => {
		const original = process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
		process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = 'true';
		try {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests(
				{
					id: 'wf-1',
					// No trigger node: the adapter sets neither startNodes nor executionData,
					// so an offloaded worker would receive an execution with no run data.
					nodes: [
						{
							id: 'n1',
							name: 'Set',
							type: 'n8n-nodes-base.set',
							typeVersion: 3,
							position: [0, 0],
							parameters: {},
						},
					],
					settings: { executionOrder: 'v1' },
				},
				{ queueMode: true, execution: makeExecution({ status: 'success' }) },
			);

			await adapter.run('wf-1');

			const runData = mockWorkflowRunner.run.mock.calls[0][0];
			// Offloaded workers reconstruct the run from execution.data (= runData.executionData).
			// Without this wrapping it is undefined and job-processor throws "without run data".
			expect(runData.executionData).toBeDefined();
			expect(runData.executionData?.manualData?.userId).toBe('user-1');
		} finally {
			if (original === undefined) delete process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS;
			else process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS = original;
		}
	});
});
