// Mock the barrel import so these adapter tests only exercise local formatting helpers.
vi.mock('@n8n/instance-ai', async () => {
	const { WorkflowSaveConflictError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-save-conflict.error.js'
	);
	const { WorkflowNotFoundError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-not-found.error.js'
	);
	const { WorkflowEditorLockedError } = await import(
		'../../../../../@n8n/instance-ai/src/errors/workflow-editor-locked.error.js'
	);
	return {
		WorkflowSaveConflictError,
		WorkflowNotFoundError,
		WorkflowEditorLockedError,
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

import type { PolicyCleared } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
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
import {
	AI_GATEWAY_MANAGED_TAG,
	CONFIG_EVALUATIONS_FLAG,
	CONFIG_EVALUATIONS_ENABLED_VARIANT,
	INSTANCE_AI_MCP_CONNECTIONS_FLAG,
	INSTANCE_AI_MCP_CONNECTIONS_ENABLED_VARIANT,
} from '@n8n/api-types';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { NodeCatalogService } from '@/node-catalog';
import type { NodeTypes } from '@/node-types';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { PostHogClient } from '@/posthog';

import { InstanceAiMcpRegistryService } from '../mcp';

import {
	extractExecutionResult,
	extractExecutionDebugInfo,
	extractNodeOutput,
	formatExecutionError,
	resolveDataTableByIdOrName,
	resolveMetricProviders,
	truncateNodeOutput,
	truncateResultData,
} from '../instance-ai.adapter.service';
import { LlmJudgeProviderRegistry } from '@/evaluation.ee/llm-judge-provider-registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collaboration stub that reports no editor write lock and records broadcasts. */
/**
 * Partial GlobalConfig for constructing the adapter. Every branch the constructor
 * reads eagerly has to be present: a missing one throws at construction time, far
 * from whatever the test was actually about.
 */
function globalConfigStub(
	overrides: { allowSendingParameterValues?: boolean; queueMode?: boolean } = {},
): ConstructorParameters<typeof InstanceAiAdapterService>[1] {
	return {
		ai: { allowSendingParameterValues: overrides.allowSendingParameterValues ?? false },
		executions: { mode: overrides.queueMode ? 'queue' : 'regular' },
		// Node usage is gated on the dependency index being wired too, which these tests do not
		// pass, so the value here only has to exist. See instance-ai.adapter.node-usage.test.ts.
		instanceAi: { nodeUsageEnabled: false },
	} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[1];
}

/** Clears every save: the adapter's own tests are not exercising policy decisions. */
function createMockPolicyEnforcementService() {
	return { enforceWorkflowSave: vi.fn().mockResolvedValue(mock()) };
}

function createMockCollaborationService() {
	return {
		ensureWorkflowEditable: vi.fn().mockResolvedValue(undefined),
		broadcastWorkflowUpdate: vi.fn().mockResolvedValue(undefined),
	};
}

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
	CredentialsEntity,
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { UserError, UnexpectedError } from 'n8n-workflow';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { WorkflowEditorLockedError } from '../../../../../@n8n/instance-ai/src/errors/workflow-editor-locked.error';
import { WorkflowNotFoundError } from '../../../../../@n8n/instance-ai/src/errors/workflow-not-found.error';
import { WorkflowSaveConflictError } from '../../../../../@n8n/instance-ai/src/errors/workflow-save-conflict.error';
import type { WorkflowService } from '@/workflows/workflow.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LockedError } from '@/errors/response-errors/locked.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { License } from '@/license';
import type { RoleService } from '@/services/role.service';

import type { OutboundHttp } from '@n8n/backend-network';
import { ModuleRegistry } from '@n8n/backend-common';
import type { InstanceAiBuilderDelegate } from '@n8n/instance-ai';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiBuilderDelegateAdapterService } from '@/modules/agents/instance-ai-builder-delegate.adapter';
import { userHasScopes } from '@/permissions.ee/check-access';

const mockedUserHasScopes = vi.mocked(userHasScopes);

function createNodeAdapterServiceForTests(
	nodes: Array<Record<string, unknown>>,
	options?: {
		nodeCatalogService?: Mocked<NodeCatalogService>;
		loadNodesAndCredentials?: Record<string, unknown>;
		credentialsService?: Record<string, unknown>;
		credentialsFinderService?: Record<string, unknown>;
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
		globalConfigStub(),
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[2],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[3],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[4],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[5],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[6],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[7],
		(options?.credentialsService ?? {}) as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[8],
		(options?.credentialsFinderService ?? {}) as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[9],
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
			isReadOnly: vi.fn().mockReturnValue(false),
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
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		{ isEnabled: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
		createMockCollaborationService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[34],
		createMockPolicyEnforcementService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[35],
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

	const context = service.createContext(mockUser);

	return {
		service,
		nodeService: context.nodeService,
		credentialService: context.credentialService,
		nodeCatalogService,
	};
}

function createNodeAdapterForTests(
	nodes: Array<Record<string, unknown>>,
	nodeCatalogService?: Mocked<NodeCatalogService>,
) {
	return createNodeAdapterServiceForTests(nodes, { nodeCatalogService }).nodeService;
}

// ---------------------------------------------------------------------------
// Web-search provider selection
// ---------------------------------------------------------------------------

import { braveSearch, searxngSearch } from '@n8n/ai-utilities';

describe('web-search provider selection', () => {
	type SearchFn = (query: string, options?: Record<string, unknown>) => Promise<unknown>;
	type ProxyConfig = { apiUrl: string; getAuthHeaders: () => Promise<Record<string, string>> };

	/** `buildSearchMethod` is private, but the precedence it encodes is exactly what
	 *  the `INSTANCE_AI_BRAVE_SEARCH_API_KEY` wiring relies on — assert it directly. */
	function buildSearch(args: {
		apiKey?: string;
		searxngUrl?: string;
		proxyConfig?: ProxyConfig;
	}): SearchFn | undefined {
		const { service } = createNodeAdapterServiceForTests([]);
		const cache = { get: vi.fn().mockReturnValue(undefined), set: vi.fn() };
		const withPrivate = service as unknown as {
			buildSearchMethod: (
				apiKey: string,
				searxngUrl: string,
				cache: unknown,
				proxyConfig?: ProxyConfig,
				userId?: string,
			) => SearchFn | undefined;
		};
		return withPrivate.buildSearchMethod.call(
			service,
			args.apiKey ?? '',
			args.searxngUrl ?? '',
			cache,
			args.proxyConfig,
			'user-1',
		);
	}

	beforeEach(() => {
		vi.mocked(braveSearch).mockReset().mockResolvedValue({ query: 'q', results: [] });
		vi.mocked(searxngSearch).mockReset().mockResolvedValue({ query: 'q', results: [] });
	});

	it('has no search method when neither a Brave key nor a SearXNG URL is set', () => {
		// The adapter then serves `{ query, results: [] }`, which the agent cannot
		// distinguish from "nothing found" — hence the key in the eval lanes.
		expect(buildSearch({})).toBeUndefined();
	});

	it('searches Brave with the configured key', async () => {
		await buildSearch({ apiKey: 'BSA-key' })!('quakes', { maxResults: 3 });

		expect(braveSearch).toHaveBeenCalledWith(
			'BSA-key',
			'quakes',
			expect.objectContaining({ maxResults: 3 }),
		);
		expect(searxngSearch).not.toHaveBeenCalled();
	});

	it('routes through the AI-service proxy in preference to a configured key', async () => {
		const proxyConfig: ProxyConfig = {
			apiUrl: 'https://proxy.example.com/brave-search',
			getAuthHeaders: async () => ({}),
		};

		await buildSearch({ apiKey: 'BSA-key', proxyConfig })!('quakes');

		expect(braveSearch).toHaveBeenCalledWith(
			'',
			'quakes',
			expect.objectContaining({ proxyConfig }),
		);
	});

	it('falls back to SearXNG when only a URL is set', async () => {
		await buildSearch({ searxngUrl: 'http://searxng:8080' })!('quakes');

		expect(searxngSearch).toHaveBeenCalledWith('http://searxng:8080', 'quakes', expect.anything());
		expect(braveSearch).not.toHaveBeenCalled();
	});
});

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

	const mockInstanceWriteAccess = {
		isReadOnly: vi.fn().mockReturnValue(overrides?.branchReadOnly ?? false),
	};

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	// Construct the service with only the dependencies we need, casting the rest
	const service = new InstanceAiAdapterService(
		{ error: vi.fn(), scoped: vi.fn().mockReturnThis() } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[0],
		globalConfigStub(),
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
		mockInstanceWriteAccess as unknown as InstanceWriteAccessService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[24],
		{ isLicensed: vi.fn().mockReturnValue(false) } as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[28],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[30],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		{ isEnabled: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
		createMockCollaborationService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[34],
		createMockPolicyEnforcementService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[35],
	);

	const adapter = service.createContext(mockUser, {
		projectId: overrides?.projectId,
	}).dataTableService;

	return {
		adapter,
		mockProjectRepository,
		mockDataTableService,
		mockDataTableRepository,
		mockInstanceWriteAccess,
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
		createContent: vi.fn().mockResolvedValue(savedWorkflow),
		runInTransaction: vi.fn(
			async (
				ctx: unknown,
				fn: (transactionManager: { save: Mock }, ctx: unknown) => Promise<unknown>,
			): Promise<unknown> => await fn({ save: vi.fn().mockResolvedValue(savedWorkflow) }, ctx),
		),
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
		getMany: vi.fn().mockResolvedValue({ workflows: [savedWorkflow], count: 1 }),
		archive: vi.fn().mockResolvedValue(savedWorkflow),
		unarchive: vi.fn().mockResolvedValue(savedWorkflow),
		activateWorkflow: vi.fn().mockResolvedValue({ activeVersionId: 'version-1' }),
		deactivateWorkflow: vi.fn().mockResolvedValue(savedWorkflow),
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
	const mockCollaborationService = createMockCollaborationService();
	const mockPolicyEnforcementService = createMockPolicyEnforcementService();

	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	const service = new InstanceAiAdapterService(
		mockLogger as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[0],
		globalConfigStub(),
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
			isReadOnly: vi.fn().mockReturnValue(overrides?.branchReadOnly ?? false),
		} as unknown as InstanceWriteAccessService,
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
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		{ isEnabled: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
		mockCollaborationService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[34],
		mockPolicyEnforcementService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[35],
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
		savedWorkflow,
		mockProjectRepository,
		mockWorkflowRepository,
		mockWorkflowFinderService,
		mockSharedWorkflowRepository,
		mockAiBuilderTemporaryWorkflowRepository,
		mockWorkflowService,
		mockWorkflowHistoryService,
		mockEnterpriseWorkflowService,
		mockCollaborationService,
		mockPolicyEnforcementService,
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

	it('summarizes pinned data as node names and item counts, without payloads', async () => {
		const { adapter, mockWorkflowFinderService } = createWorkflowAdapterForTests();
		mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-pins',
			pinData: {
				'Get Job Alert Emails': [{ json: { id: 'msg_1' } }, { json: { id: 'msg_2' } }],
				'Empty Pin': [],
			},
		});

		await expect(adapter.getPinnedDataSummary?.('wf-pins')).resolves.toEqual([
			{ nodeName: 'Get Job Alert Emails', itemCount: 2 },
			{ nodeName: 'Empty Pin', itemCount: 0 },
		]);
	});

	it('returns an empty pinned-data summary when the workflow has no pins', async () => {
		const { adapter, mockWorkflowFinderService } = createWorkflowAdapterForTests();
		mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-clean' });

		await expect(adapter.getPinnedDataSummary?.('wf-clean')).resolves.toEqual([]);
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

	it('returns AI Gateway-managed credentials in a shape accepted by workflow codegen', async () => {
		const { adapter, mockWorkflowFinderService } = createWorkflowAdapterForTests();
		mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-managed',
			name: 'Managed model workflow',
			active: false,
			versionId: 'version-id',
			activeVersionId: null,
			isArchived: false,
			createdAt: new Date('2026-01-01'),
			updatedAt: new Date('2026-01-01'),
			nodes: [
				{
					id: 'agent-id',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 3.1,
					position: [0, 0],
					parameters: { promptType: 'define', text: 'Summarize the input.' },
				},
				{
					id: 'model-id',
					name: 'Google Gemini Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
					typeVersion: 1.1,
					position: [0, 200],
					parameters: { modelName: 'models/gemini-3-flash-preview' },
					credentials: {
						googlePalmApi: {
							id: null,
							name: 'Gateway credits',
							__aiGatewayManaged: true,
						},
					},
				},
			],
			connections: {
				'Google Gemini Chat Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
			},
			settings: {},
		});

		const workflow = await adapter.getAsWorkflowJSON('wf-managed');

		expect(workflow.nodes[1].credentials).toEqual({
			googlePalmApi: {
				id: null,
				name: 'Gateway credits',
				__aiGatewayManaged: true,
			},
		});
		const code = generateWorkflowCode(workflow);
		expect(code).toContain("newCredential('Gateway credits')");
		expect(code).not.toContain("newCredential('Gateway credits', 'null')");
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
		expect(result.workflows).toEqual([
			expect.objectContaining({
				id: 'wf-new',
				isArchived: false,
			}),
		]);
	});

	it('reports how many workflows the name filter left out', async () => {
		const { adapter, mockWorkflowService, mockUser, savedWorkflow } =
			createWorkflowAdapterForTests();
		mockWorkflowService.getMany
			.mockResolvedValueOnce({ workflows: [savedWorkflow], count: 1 })
			.mockResolvedValueOnce({ workflows: [savedWorkflow], count: 3 });

		const result = await adapter.list({ query: 'PRD' });

		// Second call re-counts the same scope without the name filter.
		expect(mockWorkflowService.getMany).toHaveBeenNthCalledWith(2, mockUser, {
			take: 1,
			filter: { isArchived: false, projectId: 'team-project-id' },
		});
		expect(result.total).toBe(1);
		expect(result.totalInScope).toBe(3);
	});

	it('lists a caller-named project as a filter, leaving access resolution to getMany', async () => {
		const { adapter, mockWorkflowService, mockUser } = createWorkflowAdapterForTests();

		await adapter.list({ projectId: 'other-project-id' });

		// The user is still the one the query resolves readability from — the project
		// id only narrows it, so it can never widen what the caller may read.
		expect(mockWorkflowService.getMany).toHaveBeenCalledWith(mockUser, {
			take: 50,
			filter: { isArchived: false, projectId: 'other-project-id' },
		});
	});

	it('attributes the owning project only when the listing can span projects', async () => {
		const { adapter, mockWorkflowService, savedWorkflow } = createWorkflowAdapterForTests();
		mockWorkflowService.getMany.mockResolvedValue({
			workflows: [{ ...savedWorkflow, homeProject: { id: 'p2', name: 'Primary', type: 'team' } }],
			count: 1,
		});

		const instanceWide = await adapter.list({ scope: 'instance' });
		expect(instanceWide.workflows[0].project).toEqual({ id: 'p2', name: 'Primary' });

		// Narrowed to one project — repeating it on every row carries no information.
		const singleProject = await adapter.list({ projectId: 'p2' });
		expect(singleProject.workflows[0].project).toBeUndefined();
	});

	it('omits attribution when the listed row carries no home project', async () => {
		const { adapter, mockWorkflowService, savedWorkflow } = createWorkflowAdapterForTests();
		mockWorkflowService.getMany.mockResolvedValue({ workflows: [savedWorkflow], count: 1 });

		const result = await adapter.list({ scope: 'instance' });

		expect(result.workflows[0].project).toBeUndefined();
	});

	it('skips the extra count query when no name filter is given', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		const result = await adapter.list();

		expect(mockWorkflowService.getMany).toHaveBeenCalledTimes(1);
		expect(result.total).toBe(1);
		expect(result.totalInScope).toBe(1);
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

	// The shell carries no nodes; the generated content is policed by the sealed `update()`
	// below. Enforced here anyway, because no `WorkflowEntity` write may skip the funnel.
	it('enforces the save for the shell and threads the clearance to the write', async () => {
		const { adapter, mockWorkflowRepository, mockPolicyEnforcementService } =
			createWorkflowAdapterForTests();
		const cleared = mock<PolicyCleared<'workflowSave'>>();
		mockPolicyEnforcementService.enforceWorkflowSave.mockResolvedValue(cleared);

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON);

		expect(mockPolicyEnforcementService.enforceWorkflowSave).toHaveBeenCalledWith({
			workflow: { id: null, name: minimalWorkflowJSON.name, nodes: [] },
			storedWorkflow: null,
			projectId: 'team-project-id',
		});
		expect(mockWorkflowRepository.runInTransaction).toHaveBeenCalledWith(
			{ policyCleared: cleared },
			expect.any(Function),
		);
		expect(mockWorkflowRepository.createContent).toHaveBeenCalledWith(
			expect.objectContaining({ nodes: [] }),
			expect.objectContaining({ policyCleared: cleared }),
		);
	});

	it('does not write the shell when the policy blocks the save', async () => {
		const { adapter, mockWorkflowRepository, mockPolicyEnforcementService } =
			createWorkflowAdapterForTests();
		mockPolicyEnforcementService.enforceWorkflowSave.mockRejectedValue(new Error('blocked'));

		await expect(adapter.createFromWorkflowJSON(minimalWorkflowJSON)).rejects.toThrow('blocked');

		expect(mockWorkflowRepository.createContent).not.toHaveBeenCalled();
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
			user_id: 'user-1',
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
		expect(mockWorkflowRepository.runInTransaction).toHaveBeenCalled();
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

	it('defaults executionOrder to v1 when the SDK workflow declares no settings', async () => {
		// Regression: the SDK omits the settings argument when empty, so AI-authored
		// workflows persisted with `{}` and ran on legacy v0.
		const { adapter, mockWorkflowRepository, mockWorkflowService } =
			createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON(minimalWorkflowJSON);

		expect(mockWorkflowRepository.create).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ settings: { executionOrder: 'v1' } }),
		);
		expect(mockWorkflowService.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ settings: { executionOrder: 'v1' } }),
			expect.anything(),
			expect.anything(),
		);
	});

	it('keeps an explicit executionOrder from the SDK workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		await adapter.createFromWorkflowJSON({
			...minimalWorkflowJSON,
			settings: { executionOrder: 'v0' },
		} as unknown as WorkflowJSON);

		expect(mockWorkflowService.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ settings: { executionOrder: 'v0' } }),
			expect.anything(),
			expect.anything(),
		);
	});

	it('does not inject executionOrder on update, leaving the stored value to the merge', async () => {
		// update merges over stored settings, so forcing v1 here would upgrade a
		// workflow the user deliberately kept on v0.
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();

		await adapter.updateFromWorkflowJSON('wf-existing', minimalWorkflowJSON);

		expect(mockWorkflowService.update).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ settings: {} }),
			expect.anything(),
			expect.anything(),
		);
	});

	it('notifies open editors after a successful update so stale canvases reload', async () => {
		// Without this an open editor keeps state the save replaced (e.g. cleared
		// pinned data) and resurrects it via the overwrite-conflict dialog.
		const { adapter, mockCollaborationService, mockUser } = createWorkflowAdapterForTests();

		await adapter.updateFromWorkflowJSON('wf-existing', minimalWorkflowJSON);

		expect(mockCollaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
			'wf-existing',
			mockUser.id,
		);
	});

	it('does not notify editors when the update fails', async () => {
		const { adapter, mockCollaborationService, mockWorkflowService } =
			createWorkflowAdapterForTests();
		mockWorkflowService.update.mockRejectedValueOnce(new Error('save failed'));

		await expect(
			adapter.updateFromWorkflowJSON('wf-existing', minimalWorkflowJSON),
		).rejects.toThrow('save failed');
		expect(mockCollaborationService.broadcastWorkflowUpdate).not.toHaveBeenCalled();
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
						gmailOAuth2: { id: '', name: 'Gmail' },
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

	it('normalizes the managed tag written as a credential id into the runtime sentinel on save', async () => {
		// The builder may write `newCredential('n8n credits', '__AI_GATEWAY_MANAGED__')`,
		// which reaches update as `{ id: '__AI_GATEWAY_MANAGED__', name }`. It must be
		// converted to the null-id sentinel so the runtime never treats the tag as a
		// real, DB-resolvable credential id.
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
						googlePalmApi: { id: AI_GATEWAY_MANAGED_TAG, name: 'n8n credits' },
					},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		await adapter.updateFromWorkflowJSON('wf-existing', workflow);

		const updateData = mockWorkflowService.update.mock.calls[0]?.[1] as { nodes: INode[] };
		expect(updateData.nodes[0].credentials).toEqual({
			googlePalmApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
		});
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
						gmailOAuth2: { id: '  ', name: 'Gmail' },
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

	it('throws WorkflowNotFoundError when workflowService.update cannot find the workflow', async () => {
		const { adapter, mockWorkflowService } = createWorkflowAdapterForTests();
		mockWorkflowService.update.mockRejectedValueOnce(
			new NotFoundError(
				'You do not have permission to update this workflow. Ask the owner to share it with you.',
			),
		);

		await expect(
			adapter.updateFromWorkflowJSON('wf-missing', minimalWorkflowJSON),
		).rejects.toBeInstanceOf(WorkflowNotFoundError);
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

	describe('editor write lock', () => {
		const lockWorkflow = (
			mockCollaborationService: ReturnType<typeof createMockCollaborationService>,
		) => {
			mockCollaborationService.ensureWorkflowEditable.mockRejectedValue(
				new LockedError('Cannot modify workflow while it is being edited by a user in the editor.'),
			);
		};

		it('reports a locked workflow as a WorkflowEditorLockedError instead of a response error', async () => {
			const { adapter, mockCollaborationService, mockWorkflowService } =
				createWorkflowAdapterForTests();
			lockWorkflow(mockCollaborationService);

			await expect(
				adapter.updateFromWorkflowJSON('wf-existing', minimalWorkflowJSON),
			).rejects.toThrow(WorkflowEditorLockedError);
			expect(mockWorkflowService.update).not.toHaveBeenCalled();
		});

		it('refuses to write when the lock cannot be checked, without claiming a lock', async () => {
			// Fail closed: an unreadable lock is no proof that nobody is editing.
			const { adapter, mockCollaborationService, mockWorkflowService } =
				createWorkflowAdapterForTests();
			const lookupFailure = new Error('collaboration cache is unreachable');
			mockCollaborationService.ensureWorkflowEditable.mockRejectedValue(lookupFailure);

			await expect(adapter.updateFromWorkflowJSON('wf-existing', minimalWorkflowJSON)).rejects.toBe(
				lookupFailure,
			);
			expect(mockWorkflowService.update).not.toHaveBeenCalled();
		});

		it('refuses to unpublish a locked workflow', async () => {
			const { adapter, mockCollaborationService, mockWorkflowService } =
				createWorkflowAdapterForTests();
			lockWorkflow(mockCollaborationService);

			await expect(adapter.unpublish('wf-1')).rejects.toThrow(WorkflowEditorLockedError);
			expect(mockWorkflowService.deactivateWorkflow).not.toHaveBeenCalled();
		});

		it('refuses to restore a version of a locked workflow', async () => {
			const { adapter, mockCollaborationService, mockWorkflowService } =
				createWorkflowAdapterForTests();
			lockWorkflow(mockCollaborationService);

			await expect(adapter.restoreVersion?.('wf-1', 'v-1')).rejects.toThrow(
				WorkflowEditorLockedError,
			);
			expect(mockWorkflowService.update).not.toHaveBeenCalled();
		});
	});

	describe('notifying open editors', () => {
		it('notifies after publishing', async () => {
			const { adapter, mockCollaborationService } = createWorkflowAdapterForTests();

			await adapter.publish('wf-1');

			expect(mockCollaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
				'wf-1',
				'user-1',
			);
		});

		it('notifies after unpublishing', async () => {
			const { adapter, mockCollaborationService } = createWorkflowAdapterForTests();

			await adapter.unpublish('wf-1');

			expect(mockCollaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
				'wf-1',
				'user-1',
			);
		});

		it('notifies after archiving', async () => {
			const { adapter, mockCollaborationService } = createWorkflowAdapterForTests();

			await adapter.archive('wf-1');

			expect(mockCollaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
				'wf-1',
				'user-1',
			);
		});

		it('notifies after restoring a version', async () => {
			const { adapter, mockCollaborationService, mockWorkflowHistoryService } =
				createWorkflowAdapterForTests();
			mockWorkflowHistoryService.getVersion.mockResolvedValue({
				versionId: 'v-1',
				nodes: [],
				connections: {},
				nodeGroups: [],
			});

			await adapter.restoreVersion?.('wf-1', 'v-1');

			expect(mockCollaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith(
				'wf-1',
				'user-1',
			);
		});

		it('keeps a committed update when notifying open editors fails', async () => {
			const { adapter, mockCollaborationService, mockLogger } = createWorkflowAdapterForTests();
			mockCollaborationService.broadcastWorkflowUpdate.mockRejectedValue(new Error('push is down'));

			await expect(
				adapter.updateFromWorkflowJSON('wf-existing', minimalWorkflowJSON),
			).resolves.toMatchObject({ id: 'wf-new' });
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Failed to notify open editors of an AI workflow update',
				expect.objectContaining({ workflowId: 'wf-existing', error: 'push is down' }),
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
		globalConfigStub(),
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
			isReadOnly: vi.fn().mockReturnValue(false),
		} as unknown as InstanceWriteAccessService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[22],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[23],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[24],
		mockLicense as unknown as License,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[26],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[27],
		mockRoleService as unknown as RoleService,
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[30],
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		{ isEnabled: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
		createMockCollaborationService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[34],
		createMockPolicyEnforcementService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[35],
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
		allowSendingParameterValues?: boolean;
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
		globalConfigStub({
			allowSendingParameterValues: options?.allowSendingParameterValues,
			queueMode: options?.queueMode,
		}),
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
			isReadOnly: vi.fn().mockReturnValue(false),
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
		mock<OutboundHttp>() as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[31],
		{ isEnabled: vi.fn().mockReturnValue(false) } as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[32],
		{} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[33],
		createMockCollaborationService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[34],
		createMockPolicyEnforcementService() as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[35],
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

	it('reports workflow-pinned nodes on the run result', async () => {
		const { adapter } = createRunAdapterForTests(
			{
				id: 'wf-1',
				nodes: [],
				pinData: { 'Get Job Alert Emails': [{ json: { id: 'msg_1' } }] },
			},
			{ execution: makeExecution({ status: 'success' }) },
		);

		const result = await adapter.run('wf-1');

		expect(result.workflowPinnedNodeNames).toEqual(['Get Job Alert Emails']);
	});

	it('omits workflow-pinned nodes from the run result when the workflow has none', async () => {
		const { adapter } = createRunAdapterForTests(
			{ id: 'wf-1', nodes: [] },
			{ execution: makeExecution({ status: 'success' }) },
		);

		const result = await adapter.run('wf-1');

		expect(result).not.toHaveProperty('workflowPinnedNodeNames');
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
			executionTimeout: 300,
		});
	});

	it('bounds the execution inside the engine with the wait budget, capped at the max', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			nodes: [],
		});

		await adapter.run('wf-1', undefined, { timeout: 60_000 });
		await adapter.run('wf-1', undefined, { timeout: 60 * 60 * 1000 });

		const [firstRun, secondRun] = mockWorkflowRunner.run.mock.calls.map((call) => call[0]);
		expect(firstRun.workflowData.settings?.executionTimeout).toBe(60);
		expect(secondRun.workflowData.settings?.executionTimeout).toBe(600);
	});

	it('omits the listed connections on the ephemeral run copy only', async () => {
		const workflow = {
			id: 'wf-1',
			nodes: [],
			connections: {
				Revise: { main: [[{ node: 'Format', type: 'main', index: 0 }]] },
				Format: { main: [[{ node: 'Gate', type: 'main', index: 0 }]] },
			},
		};
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests(workflow);

		await adapter.run('wf-1', undefined, {
			omitConnections: [{ source: 'Revise', target: 'Format' }],
		});

		const runData = mockWorkflowRunner.run.mock.calls[0][0];
		expect(runData.workflowData.connections.Revise.main).toEqual([[]]);
		expect(runData.workflowData.connections.Format.main).toEqual([
			[{ node: 'Gate', type: 'main', index: 0 }],
		]);
		// The saved workflow object is untouched.
		expect(workflow.connections.Revise.main).toEqual([
			[{ node: 'Format', type: 'main', index: 0 }],
		]);
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
			user_id: 'user-1',
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

	it('scrubs secrets and PII from the tracked execution error', async () => {
		const { adapter, mockTelemetry } = createRunAdapterForTests(
			{ id: 'wf-1', nodes: [], connections: {}, settings: {} },
			{
				execution: makeExecution({
					status: 'error',
					error: {
						message:
							'Auth failed for jane.doe@example.com using sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
					},
				}),
				threadId: 'thread-1',
			},
		);

		await adapter.run('wf-1');

		const tracked = mockTelemetry.track.mock.calls.find(
			([event]) => event === 'Builder executed workflow',
		);
		expect(tracked?.[1].error).not.toContain('jane.doe@example.com');
		expect(tracked?.[1].error).not.toContain('sk-ant-api03');
		expect(tracked?.[1].error).toContain('[REDACTED]');
	});

	it('keeps upstream error details out of telemetry even when the privacy setting allows them', async () => {
		const { adapter, mockTelemetry } = createRunAdapterForTests(
			{ id: 'wf-1', nodes: [], connections: {}, settings: {} },
			{
				execution: makeExecution({
					status: 'error',
					error: {
						message: 'Request failed with status code 403',
						description: 'Account 12 Ridge Road is suspended',
					},
				}),
				threadId: 'thread-1',
				allowSendingParameterValues: true,
			},
		);

		const result = await adapter.run('wf-1');

		// The agent still sees the upstream detail the operator opted into...
		expect(result.error).toContain('Account 12 Ridge Road is suspended');
		// ...but analytics only gets the sanitized message.
		const tracked = mockTelemetry.track.mock.calls.find(
			([event]) => event === 'Builder executed workflow',
		);
		expect(tracked?.[1].error).toContain('Request failed with status code 403');
		expect(tracked?.[1].error).not.toContain('Ridge Road');
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

		expect(mockActiveExecutions.stopExecution).toHaveBeenCalledWith(
			'exec-1',
			expect.objectContaining({ name: 'TimeoutExecutionCancelledError' }),
		);
		expect(mockTelemetry.track).toHaveBeenCalledWith(
			'Builder executed workflow',
			expect.objectContaining({
				workflow_id: 'wf-1',
				status: 'error',
				error: expect.stringContaining('timed out'),
			}),
		);
	});

	it('tracks abort cancellation as a manual cancel, not a timeout', async () => {
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
		const abortController = new AbortController();

		const runPromise = adapter.run('wf-1', undefined, {
			timeout: 60_000,
			abortSignal: abortController.signal,
		});
		abortController.abort();

		await expect(runPromise).resolves.toMatchObject({
			status: 'error',
			error: 'Execution was cancelled',
		});

		expect(mockActiveExecutions.stopExecution).toHaveBeenCalledWith(
			'exec-1',
			expect.objectContaining({ name: 'ManualExecutionCancelledError' }),
		);
		expect(mockTelemetry.track).toHaveBeenCalledWith(
			'Builder executed workflow',
			expect.objectContaining({
				workflow_id: 'wf-1',
				status: 'error',
				error: 'Execution was cancelled',
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

	describe('trigger selection', () => {
		const triggerNode = (
			name: string,
			overrides?: { type?: string; disabled?: boolean },
		): INode => ({
			...makeNode(name, overrides?.type ?? 'n8n-nodes-base.scheduleTrigger'),
			...(overrides?.disabled ? { disabled: true } : {}),
		});

		const startedFrom = (mockWorkflowRunner: { run: Mock }) =>
			mockWorkflowRunner.run.mock.calls[0][0].triggerToStartFrom?.name;

		it('starts from the named trigger instead of the first one', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [triggerNode('Daily 8am'), triggerNode('Weekly 5pm')],
			});

			await adapter.run('wf-1', undefined, { triggerNodeName: 'Weekly 5pm' });

			expect(startedFrom(mockWorkflowRunner)).toBe('Weekly 5pm');
		});

		it('auto-detects the first trigger when none is named', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [triggerNode('Daily 8am'), triggerNode('Weekly 5pm')],
			});

			await adapter.run('wf-1');

			expect(startedFrom(mockWorkflowRunner)).toBe('Daily 8am');
		});

		it('skips a disabled trigger when auto-detecting', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [triggerNode('Daily 8am', { disabled: true }), triggerNode('Weekly 5pm')],
			});

			await adapter.run('wf-1');

			expect(startedFrom(mockWorkflowRunner)).toBe('Weekly 5pm');
		});

		it('falls back to a disabled trigger when every trigger is disabled', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [
					triggerNode('Daily 8am', { disabled: true }),
					triggerNode('Weekly 5pm', { disabled: true }),
				],
			});

			await adapter.run('wf-1');

			expect(startedFrom(mockWorkflowRunner)).toBe('Daily 8am');
		});

		it('prefers a known trigger type over an unknown one earlier in the node list', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [
					triggerNode('On Interval', { type: 'n8n-nodes-base.cron' }),
					triggerNode('On Chat Message', { type: '@n8n/n8n-nodes-langchain.chatTrigger' }),
				],
			});

			await adapter.run('wf-1');

			expect(startedFrom(mockWorkflowRunner)).toBe('On Chat Message');
		});

		it('rejects an unknown trigger name instead of running a different branch', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [triggerNode('Daily 8am'), triggerNode('Weekly 5pm')],
			});

			await expect(
				adapter.run('wf-1', undefined, { triggerNodeName: 'Weekly 5PM' }),
			).rejects.toThrow(/Weekly 5PM.*Daily 8am.*Weekly 5pm/s);
			expect(mockWorkflowRunner.run).not.toHaveBeenCalled();
		});

		it('rejects an empty trigger name instead of silently auto-detecting', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [triggerNode('Daily 8am'), triggerNode('Weekly 5pm')],
			});

			await expect(adapter.run('wf-1', undefined, { triggerNodeName: '' })).rejects.toThrow(
				/Daily 8am.*Weekly 5pm/s,
			);
			expect(mockWorkflowRunner.run).not.toHaveBeenCalled();
		});

		it('rejects a named node that is not a trigger', async () => {
			const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
				id: 'wf-1',
				nodes: [
					triggerNode('Daily 8am'),
					triggerNode('Compute Daily', { type: 'n8n-nodes-base.code' }),
				],
			});

			await expect(
				adapter.run('wf-1', undefined, { triggerNodeName: 'Compute Daily' }),
			).rejects.toThrow(/Compute Daily/);
			expect(mockWorkflowRunner.run).not.toHaveBeenCalled();
		});
	});

	it('opts a verification run out of the error workflow, on the main process and on a worker', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			settings: { errorWorkflow: 'error-wf-1' },
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

		await adapter.run('wf-1', undefined, { isVerificationRun: true });

		const runData = mockWorkflowRunner.run.mock.calls[0][0];
		// A trigger-mode run is a production execution as far as the lifecycle
		// hooks are concerned, so the opt-out is what keeps a failed build attempt
		// from paging the user's error workflow.
		expect(runData.executionMode).toBe('trigger');
		expect(runData.suppressErrorWorkflow).toBe(true);
		// Queue mode rebuilds the run from persisted execution data.
		expect(runData.executionData?.manualData?.suppressErrorWorkflow).toBe(true);
	});

	it('leaves the error workflow enabled for a run the user asked for', async () => {
		const { adapter, mockWorkflowRunner } = createRunAdapterForTests({
			id: 'wf-1',
			settings: { errorWorkflow: 'error-wf-1' },
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
		expect(runData.suppressErrorWorkflow).toBeUndefined();
		expect(runData.executionData?.manualData?.suppressErrorWorkflow).toBeUndefined();
		// The user's setting is never stripped from the run itself.
		expect(runData.workflowData.settings?.errorWorkflow).toBe('error-wf-1');
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

function createAdapterWithGatewayMock(
	getGatewayConfig: Mock,
	overrides?: {
		credentialsService?: unknown;
		telemetry?: unknown;
		enabled?: boolean;
		settingsService?: unknown;
		getWallet?: Mock;
	},
): InstanceAiAdapterService {
	const aiGatewayService = {
		getGatewayConfig,
		isEnabled: vi.fn().mockReturnValue(overrides?.enabled !== false),
		getWallet: overrides?.getWallet ?? vi.fn(),
		assertEnabled: vi.fn().mockImplementation(() => {
			if (overrides?.enabled === false) throw new Error('n8n Connect is disabled');
		}),
	};
	const args = Array.from(
		{ length: 34 },
		() => ({}) as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[number],
	);
	args[0] = {
		error: vi.fn(),
		warn: vi.fn(),
		scoped: vi.fn().mockReturnThis(),
	} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[0];
	args[1] = globalConfigStub();
	if (overrides?.credentialsService) {
		args[8] = overrides.credentialsService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[8];
	}
	args[12] = {} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[12];
	args[14] = { staticCacheDir: '/tmp', n8nFolder: '/tmp' } as unknown as ConstructorParameters<
		typeof InstanceAiAdapterService
	>[14];
	args[21] = {
		isReadOnly: vi.fn().mockReturnValue(false),
	} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[21];
	if (overrides?.settingsService) {
		args[22] = overrides.settingsService as unknown as ConstructorParameters<
			typeof InstanceAiAdapterService
		>[22];
	}
	args[25] = {
		isLicensed: vi.fn().mockReturnValue(true),
	} as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[25];
	args[29] = (overrides?.telemetry ?? {
		track: vi.fn(),
	}) as unknown as ConstructorParameters<typeof InstanceAiAdapterService>[29];
	args[31] = mock<OutboundHttp>() as unknown as ConstructorParameters<
		typeof InstanceAiAdapterService
	>[31];
	args[32] = aiGatewayService as unknown as ConstructorParameters<
		typeof InstanceAiAdapterService
	>[32];
	return new InstanceAiAdapterService(
		...(args as ConstructorParameters<typeof InstanceAiAdapterService>),
	);
}

describe('getGatewayConfigOrNull', () => {
	async function callGet(adapter: InstanceAiAdapterService) {
		return await (
			adapter as unknown as {
				getGatewayConfigOrNull: () => Promise<unknown>;
			}
		).getGatewayConfigOrNull();
	}

	it('returns the config when the gateway service resolves', async () => {
		const config = {
			nodes: ['openAi', 'anthropic'],
			credentialTypes: ['openAiApi', 'anthropicApi'],
			providerConfig: {},
		};
		const adapter = createAdapterWithGatewayMock(vi.fn().mockResolvedValue(config));

		await expect(callGet(adapter)).resolves.toEqual(config);
	});

	it('returns null when the gateway service throws (unlicensed / 404 / network)', async () => {
		const adapter = createAdapterWithGatewayMock(
			vi.fn().mockRejectedValue(new Error('AI Gateway is not licensed')),
		);

		await expect(callGet(adapter)).resolves.toBeNull();
	});

	it('returns null without calling the service when n8n Connect is disabled', async () => {
		const getGatewayConfig = vi.fn().mockResolvedValue({
			nodes: ['openAi'],
			credentialTypes: ['openAiApi'],
			providerConfig: {},
		});
		const adapter = createAdapterWithGatewayMock(getGatewayConfig, { enabled: false });

		await expect(callGet(adapter)).resolves.toBeNull();
		expect(getGatewayConfig).not.toHaveBeenCalled();
	});
});

describe('trackGatewayAvailability', () => {
	async function callTrack(adapter: InstanceAiAdapterService) {
		await (
			adapter as unknown as {
				trackGatewayAvailability: () => Promise<void>;
			}
		).trackGatewayAvailability();
	}

	it('emits instance_ai_gateway_available with node and credential-type counts on success', async () => {
		const track = vi.fn();
		const adapter = createAdapterWithGatewayMock(
			vi.fn().mockResolvedValue({
				nodes: ['openAi', 'anthropic'],
				credentialTypes: ['openAiApi', 'anthropicApi'],
				providerConfig: {},
			}),
			{ telemetry: { track } },
		);

		await callTrack(adapter);

		expect(track).toHaveBeenCalledWith('instance_ai_gateway_available', {
			nodeCount: 2,
			credentialTypeCount: 2,
		});
	});

	it('does not emit gateway_available when the fetch fails', async () => {
		const track = vi.fn();
		const adapter = createAdapterWithGatewayMock(
			vi.fn().mockRejectedValue(new Error('unlicensed')),
			{ telemetry: { track } },
		);

		await callTrack(adapter);

		expect(track).not.toHaveBeenCalled();
	});
});

describe('createNodeAdapter — n8n Connect annotations', () => {
	type GatewayConfigLike = {
		nodes: string[];
		credentialTypes: string[];
		providerConfig: Record<string, unknown>;
		supportedActions?: Record<string, Record<string, string[]>>;
		minNodeTypeVersion?: Record<string, number>;
		hiddenNodeProperties?: Record<string, string[]>;
	};

	function createNodeServiceWithGateway(
		nodes: Array<Record<string, unknown>>,
		gatewayConfig: GatewayConfigLike | null,
	) {
		const getGatewayConfig = vi.fn(async () => {
			if (gatewayConfig === null) throw new Error('AI Gateway is not licensed');
			return gatewayConfig;
		});

		const adapter = createAdapterWithGatewayMock(getGatewayConfig);

		(
			adapter as unknown as {
				nodesCache: {
					promise: Promise<Array<Record<string, unknown>>>;
					expiresAt: number;
				};
			}
		).nodesCache = {
			promise: Promise.resolve(nodes),
			expiresAt: Date.now() + 60_000,
		};

		const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;
		return {
			adapter,
			getGatewayConfig,
			makeContext: () => adapter.createContext(mockUser),
		};
	}

	const openAiNode = {
		name: 'openAi',
		displayName: 'OpenAI',
		description: 'Chat with OpenAI models',
		version: [1, 2],
		properties: [],
		inputs: ['main'],
		outputs: ['main'],
	} satisfies Record<string, unknown>;

	const cohereNode = {
		name: 'cohere',
		displayName: 'Cohere',
		description: 'Chat with Cohere',
		version: 1,
		properties: [],
		inputs: ['main'],
		outputs: ['main'],
	} satisfies Record<string, unknown>;

	it('attaches the gateway meta to a node listed in config.nodes on listSearchable', async () => {
		const { makeContext } = createNodeServiceWithGateway([openAiNode, cohereNode], {
			nodes: ['openAi'],
			credentialTypes: ['openAiApi'],
			providerConfig: {},
			supportedActions: { openAi: { chat: ['message'] } },
			minNodeTypeVersion: { openAi: 2 },
			hiddenNodeProperties: { openAi: ['baseURL'] },
		});

		const results = await makeContext().nodeService.listSearchable();
		const openAiResult = results.find((n) => n.name === 'openAi');

		expect(openAiResult).toBeDefined();
		expect((openAiResult as { aiGateway?: unknown }).aiGateway).toEqual({
			supported: true,
			operations: { chat: ['message'] },
			minVersion: 2,
			hiddenProperties: ['baseURL'],
		});
	});

	it('omits the gateway meta for nodes not in config.nodes', async () => {
		const { makeContext } = createNodeServiceWithGateway([openAiNode, cohereNode], {
			nodes: ['openAi'],
			credentialTypes: ['openAiApi'],
			providerConfig: {},
		});

		const results = await makeContext().nodeService.listSearchable();
		const cohereResult = results.find((n) => n.name === 'cohere');

		expect(cohereResult).toBeDefined();
		expect((cohereResult as { aiGateway?: unknown }).aiGateway).toBeUndefined();
	});

	it('emits no gateway meta on any node when the gateway config is unavailable', async () => {
		const { makeContext } = createNodeServiceWithGateway([openAiNode, cohereNode], null);

		const results = await makeContext().nodeService.listSearchable();

		for (const r of results) {
			expect((r as { aiGateway?: unknown }).aiGateway).toBeUndefined();
		}
	});

	it('attaches the gateway meta on getDescription for a supported node', async () => {
		const { makeContext } = createNodeServiceWithGateway([openAiNode], {
			nodes: ['openAi'],
			credentialTypes: ['openAiApi'],
			providerConfig: {},
			supportedActions: { openAi: { chat: ['message'] } },
			minNodeTypeVersion: { openAi: 2 },
		});

		const desc = await makeContext().nodeService.getDescription('openAi');

		expect((desc as { aiGateway?: unknown }).aiGateway).toEqual({
			supported: true,
			operations: { chat: ['message'] },
			minVersion: 2,
		});
	});

	it('preserves the __operation_only__ marker for nodes without a resource dimension', async () => {
		const pdfCoNode = {
			name: 'pdfCo',
			displayName: 'PDF.co',
			description: 'PDF operations',
			version: 1,
			properties: [],
			inputs: ['main'],
			outputs: ['main'],
		} satisfies Record<string, unknown>;

		const { makeContext } = createNodeServiceWithGateway([pdfCoNode], {
			nodes: ['pdfCo'],
			credentialTypes: ['pdfCoApi'],
			providerConfig: {},
			supportedActions: { pdfCo: { __operation_only__: ['pdfToText', 'ocr'] } },
		});

		const results = await makeContext().nodeService.listSearchable();
		expect((results[0] as { aiGateway?: unknown }).aiGateway).toEqual({
			supported: true,
			operations: { __operation_only__: ['pdfToText', 'ocr'] },
		});
	});
});

describe('isConfigEvalsEnabled', () => {
	const user = { id: 'user-1', createdAt: new Date() } as unknown as User;

	it('resolves true when config-evaluations is on the enabled variant', async () => {
		const adapter = createAdapterWithGatewayMock(vi.fn());
		const getFeatureFlags = vi.fn().mockResolvedValue({
			[CONFIG_EVALUATIONS_FLAG]: CONFIG_EVALUATIONS_ENABLED_VARIANT,
		});
		vi.spyOn(Container, 'get').mockReturnValue({ getFeatureFlags } as unknown as PostHogClient);

		expect(await adapter.isConfigEvalsEnabled(user)).toBe(true);
		expect(getFeatureFlags).toHaveBeenCalledWith(user);
	});

	it('resolves false when config-evaluations is not on the enabled variant', async () => {
		const adapter = createAdapterWithGatewayMock(vi.fn());
		vi.spyOn(Container, 'get').mockReturnValue({
			getFeatureFlags: vi.fn().mockResolvedValue({
				[CONFIG_EVALUATIONS_FLAG]: 'control',
			}),
		} as unknown as PostHogClient);

		expect(await adapter.isConfigEvalsEnabled(user)).toBe(false);
	});

	it('resolves false when the flags are absent (PostHog outage returns {})', async () => {
		const adapter = createAdapterWithGatewayMock(vi.fn());
		vi.spyOn(Container, 'get').mockReturnValue({
			getFeatureFlags: vi.fn().mockResolvedValue({}),
		} as unknown as PostHogClient);

		expect(await adapter.isConfigEvalsEnabled(user)).toBe(false);
	});
});

describe('MCP registry discovery', () => {
	const user = { id: 'user-1', createdAt: new Date() } as unknown as User;

	interface McpStubs {
		moduleActive?: boolean;
		featureFlags?: Record<string, string>;
		registrySearch?: Mock;
		registryResolveBySlugs?: Mock;
		listConnectionsForUser?: Mock;
	}

	/** Route `Container.get` by token — the adapter resolves PostHog and both MCP
	 *  services lazily, so each needs its own stub. */
	function stubContainer(stubs: McpStubs = {}) {
		const getFeatureFlags = vi.fn().mockResolvedValue(stubs.featureFlags ?? {});
		const search = stubs.registrySearch ?? vi.fn().mockResolvedValue([]);
		const resolveBySlugs = stubs.registryResolveBySlugs ?? vi.fn().mockResolvedValue([]);
		const listConnectionsForUser = stubs.listConnectionsForUser ?? vi.fn().mockResolvedValue([]);

		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === PostHogClient) return { getFeatureFlags };
			if (token === McpRegistryService) return { search, resolveBySlugs };
			if (token === InstanceAiMcpRegistryService) return { listConnectionsForUser };
			// Stands in for ModuleRegistry: `mcp-registry` active, `agents` not.
			return {
				isActive: (name: string) => (stubs.moduleActive ?? true) && name === 'mcp-registry',
			};
		});

		return { getFeatureFlags, search, resolveBySlugs, listConnectionsForUser };
	}

	function createAdapter(mcpAccessEnabled = true): InstanceAiAdapterService {
		return createAdapterWithGatewayMock(vi.fn(), {
			settingsService: { isMcpAccessEnabled: vi.fn().mockReturnValue(mcpAccessEnabled) },
		});
	}

	const enabledFlags = {
		[INSTANCE_AI_MCP_CONNECTIONS_FLAG]: INSTANCE_AI_MCP_CONNECTIONS_ENABLED_VARIANT,
	};

	describe('isMcpConnectionsEnabled', () => {
		it('is on when the module is active, MCP access is enabled, and the user is on the enabled variant', async () => {
			const { getFeatureFlags } = stubContainer({ featureFlags: enabledFlags });

			expect(await createAdapter().isMcpConnectionsEnabled(user)).toBe(true);
			expect(getFeatureFlags).toHaveBeenCalledWith(user);
		});

		it('is off when the mcp-registry module is disabled, without consulting the flag', async () => {
			// With the module off the registry entity is never registered, so a
			// search would throw rather than return nothing.
			const { getFeatureFlags } = stubContainer({
				moduleActive: false,
				featureFlags: enabledFlags,
			});

			expect(await createAdapter().isMcpConnectionsEnabled(user)).toBe(false);
			expect(getFeatureFlags).not.toHaveBeenCalled();
		});

		it('is off when the admin disabled MCP access, without consulting the flag', async () => {
			const { getFeatureFlags } = stubContainer({ featureFlags: enabledFlags });

			expect(await createAdapter(false).isMcpConnectionsEnabled(user)).toBe(false);
			expect(getFeatureFlags).not.toHaveBeenCalled();
		});

		it('is off when the user is on the control variant', async () => {
			stubContainer({ featureFlags: { [INSTANCE_AI_MCP_CONNECTIONS_FLAG]: 'control' } });

			expect(await createAdapter().isMcpConnectionsEnabled(user)).toBe(false);
		});

		it('fails closed when no flags resolve (PostHog outage or diagnostics off)', async () => {
			stubContainer({ featureFlags: {} });

			expect(await createAdapter().isMcpConnectionsEnabled(user)).toBe(false);
		});
	});

	describe('mcpService', () => {
		const registryHit = {
			slug: 'google-drive',
			name: 'googleDrive',
			title: 'Google Drive',
			description: 'Work with Drive files',
			url: 'https://example.com/mcp',
			transport: 'streamableHttp',
			authentication: 'googleDriveMcpOAuth2Api',
			credentialType: 'googleDriveMcpOAuth2Api',
			tools: [{ name: 'list_files', title: 'List files' }],
			metadata: { nodeTypeName: '@n8n/mcp-registry.googleDrive' },
		};

		it('is absent from the context unless the gate passed', () => {
			stubContainer();

			expect(createAdapter().createContext(user).mcpService).toBeUndefined();
		});

		it('strips host-only fields from registry hits', async () => {
			const { search } = stubContainer({
				registrySearch: vi.fn().mockResolvedValue([registryHit]),
			});
			const context = createAdapter().createContext(user, { mcpConnectionsEnabled: true });

			const results = await context.mcpService!.search(['drive']);

			expect(search).toHaveBeenCalledWith(['drive']);
			// url/transport/authentication/metadata never reach the agent.
			expect(results).toEqual([
				{
					slug: 'google-drive',
					title: 'Google Drive',
					description: 'Work with Drive files',
					credentialType: 'googleDriveMcpOAuth2Api',
					tools: ['list_files'],
				},
			]);
		});

		it('drops a server the user already has a connection for', async () => {
			stubContainer({
				registrySearch: vi
					.fn()
					.mockResolvedValue([registryHit, { ...registryHit, slug: 'notion', title: 'Notion' }]),
				listConnectionsForUser: vi.fn().mockResolvedValue([{ serverSlug: 'google-drive' }]),
			});
			const context = createAdapter().createContext(user, { mcpConnectionsEnabled: true });

			const results = await context.mcpService!.search(['drive', 'notion']);

			expect(results.map((result) => result.slug)).toEqual(['notion']);
		});

		it('resolves exact slugs through the same summary shape', async () => {
			const { resolveBySlugs } = stubContainer({
				registryResolveBySlugs: vi.fn().mockResolvedValue([registryHit]),
			});
			const context = createAdapter().createContext(user, { mcpConnectionsEnabled: true });

			const results = await context.mcpService!.getServers(['google-drive', 'made-up']);

			expect(resolveBySlugs).toHaveBeenCalledWith(['google-drive', 'made-up']);
			expect(results.map((result) => result.slug)).toEqual(['google-drive']);
		});

		it('lists slugs with a connection row, not just the loadable ones', async () => {
			stubContainer({
				listConnectionsForUser: vi
					.fn()
					.mockResolvedValue([{ serverSlug: 'google-drive' }, { serverSlug: 'retired' }]),
			});
			const context = createAdapter().createContext(user, { mcpConnectionsEnabled: true });

			expect(await context.mcpService!.listConnections()).toEqual([
				{ slug: 'google-drive' },
				{ slug: 'retired' },
			]);
		});

		it('reports a slug once even with several connection rows for it', async () => {
			stubContainer({
				listConnectionsForUser: vi
					.fn()
					.mockResolvedValue([{ serverSlug: 'google-drive' }, { serverSlug: 'google-drive' }]),
			});
			const context = createAdapter().createContext(user, { mcpConnectionsEnabled: true });

			expect(await context.mcpService!.listConnections()).toEqual([{ slug: 'google-drive' }]);
		});

		it('surfaces a lookup failure rather than reporting no connections', async () => {
			stubContainer({
				listConnectionsForUser: vi.fn().mockRejectedValue(new Error('query failed')),
			});
			const context = createAdapter().createContext(user, { mcpConnectionsEnabled: true });

			await expect(context.mcpService!.listConnections()).rejects.toThrow('query failed');
		});
	});
});

describe('resolveMetricProviders', () => {
	const registry = new LlmJudgeProviderRegistry();
	const user = mock<User>();

	const baseInput = (metricOverrides: Record<string, unknown> = {}) => ({
		name: 'Eval',
		startNodeName: 'Chat',
		endNodeName: 'Agent',
		dataTableId: 'dt1',
		metrics: [
			{
				name: 'Helpfulness',
				preset: 'helpfulness' as const,
				credentialId: 'cred1',
				model: 'gpt-4o',
				outputType: 'numeric' as const,
				actualAnswer: '={{ $json.output }}',
				userQuery: '={{ $json.input }}',
				...metricOverrides,
			},
		],
	});

	it('derives the provider node type from the credential type', async () => {
		const credentialsFinderService = mock<CredentialsFinderService>();
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({ type: 'openAiApi' }),
		);

		const result = await resolveMetricProviders(baseInput(), {
			user,
			credentialsFinderService,
			llmJudgeProviderRegistry: registry,
		});

		expect(result.metrics[0].provider).toBe('@n8n/n8n-nodes-langchain.lmChatOpenAi');
		expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred1', user, [
			'credential:read',
		]);
	});

	it('leaves an explicitly supplied provider untouched (no credential lookup)', async () => {
		const credentialsFinderService = mock<CredentialsFinderService>();

		const result = await resolveMetricProviders(
			baseInput({ provider: '@n8n/n8n-nodes-langchain.lmChatAnthropic' }),
			{ user, credentialsFinderService, llmJudgeProviderRegistry: registry },
		);

		expect(result.metrics[0].provider).toBe('@n8n/n8n-nodes-langchain.lmChatAnthropic');
		expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
	});

	it('throws a UserError when the credential is not found or inaccessible', async () => {
		const credentialsFinderService = mock<CredentialsFinderService>();
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

		await expect(
			resolveMetricProviders(baseInput(), {
				user,
				credentialsFinderService,
				llmJudgeProviderRegistry: registry,
			}),
		).rejects.toThrow(UserError);
	});

	it('throws a UserError when the credential type is not a supported provider', async () => {
		const credentialsFinderService = mock<CredentialsFinderService>();
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({ type: 'httpBasicAuth' }),
		);

		await expect(
			resolveMetricProviders(baseInput(), {
				user,
				credentialsFinderService,
				llmJudgeProviderRegistry: registry,
			}),
		).rejects.toThrow(UserError);
	});

	it('throws an UnexpectedError when the provider registry is unavailable', async () => {
		const credentialsFinderService = mock<CredentialsFinderService>();

		await expect(
			resolveMetricProviders(baseInput(), {
				user,
				credentialsFinderService,
				llmJudgeProviderRegistry: undefined,
			}),
		).rejects.toThrow(UnexpectedError);
	});
});

// ---------------------------------------------------------------------------
// createContext — builder delegate wiring
// ---------------------------------------------------------------------------

describe('createContext — builder delegate wiring', () => {
	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	afterEach(() => {
		// Container.get is globally spied below (multiple tokens routed through
		// one mockImplementation) — restore it so later tests keep the real,
		// module-inactive-by-default ModuleRegistry.
		vi.restoreAllMocks();
	});

	/** Route Container.get for the two tokens createContext resolves when wiring the builder delegate. */
	function mockBuilderModuleActive(delegate: InstanceAiBuilderDelegate) {
		const moduleRegistry = { isActive: vi.fn().mockReturnValue(true) };
		const builderDelegateAdapter = { createDelegate: vi.fn().mockReturnValue(delegate) };
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return moduleRegistry;
			if (token === InstanceAiBuilderDelegateAdapterService) return builderDelegateAdapter;
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});
	}

	it('exposes the delegate unwrapped, so creation telemetry stays in AgentsService', async () => {
		const mockTelemetry = { track: vi.fn() };
		const service = createAdapterWithGatewayMock(vi.fn(), { telemetry: mockTelemetry });
		const delegate = mock<InstanceAiBuilderDelegate>();
		delegate.createAgent.mockResolvedValue({ agentId: 'agent-9', projectId: 'proj-1' });
		mockBuilderModuleActive(delegate);

		const context = service.createContext(mockUser, { threadId: 'thread-1', projectId: 'proj-1' });
		const created = await context.builderDelegate?.createAgent('New agent', 'aBcDeFgHiJkLmNoP');

		expect(created).toEqual({ agentId: 'agent-9', projectId: 'proj-1' });
		// No wrapper means no re-declared signature that could drop an argument.
		expect(delegate.createAgent).toHaveBeenCalledWith('New agent', 'aBcDeFgHiJkLmNoP');
		expect(mockTelemetry.track).not.toHaveBeenCalled();
	});

	it('passes listAgents through to the underlying delegate unchanged', async () => {
		const service = createAdapterWithGatewayMock(vi.fn(), { telemetry: { track: vi.fn() } });
		const delegate = mock<InstanceAiBuilderDelegate>();
		const agents = [
			{ agentId: 'agent-1', name: 'Agent', published: true, updatedAt: '2026-07-14T00:00:00.000Z' },
		];
		delegate.listAgents.mockResolvedValue(agents);
		mockBuilderModuleActive(delegate);

		const context = service.createContext(mockUser, { threadId: 'thread-1', projectId: 'proj-1' });
		const result = await context.builderDelegate?.listAgents();

		expect(result).toEqual(agents);
		expect(delegate.listAgents).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// createContext — run model wiring
// ---------------------------------------------------------------------------

describe('createContext — run model wiring', () => {
	const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

	// Guards the one link of the INS-948 fix that instance-ai's own unit tests
	// cannot see: the run's resolved (proxy-aware) model must land on the domain
	// context, where simulation fixture/classifier LLM calls read it as their
	// fallback on deployments without env model keys (cloud). Dropping this
	// wiring regresses silently — every simulated node degrades back to a
	// single empty pinned item.
	it('copies the host-resolved modelId onto the context', () => {
		const service = createAdapterWithGatewayMock(vi.fn());
		const modelId = {
			id: 'anthropic/claude-opus-4-8' as const,
			url: 'https://proxy.example.com/anthropic/v1',
			apiKey: 'proxy-token',
		};

		const context = service.createContext(mockUser, { modelId });

		expect(context.modelId).toEqual(modelId);
	});

	it('leaves modelId undefined when the host does not resolve one', () => {
		const service = createAdapterWithGatewayMock(vi.fn());

		expect(service.createContext(mockUser).modelId).toBeUndefined();
	});
});

describe('createCredentialAdapter', () => {
	describe('getCredentialFillState', () => {
		/** An adapter over a credential type declaring `properties` and holding `data`. */
		const adapterFor = (
			properties: Array<Record<string, unknown>>,
			data: Record<string, unknown>,
		) =>
			createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: {
					getCredential: () => ({ type: { name: 'httpHeaderAuth', properties } }),
					knownCredentials: { httpHeaderAuth: {} },
				},
				credentialsFinderService: {
					findCredentialForUser: vi.fn().mockResolvedValue({
						id: 'cred-1',
						name: 'Header Auth account',
						type: 'httpHeaderAuth',
					}),
				},
				credentialsService: { decrypt: vi.fn().mockResolvedValue(data) },
			}).credentialService;

		const headerAuthProperties = [
			{ name: 'name', type: 'string' },
			{ name: 'value', type: 'string', typeOptions: { password: true } },
			{ name: 'useCustomAuth', type: 'notice' },
		];

		it('reports blank when every declared value field is empty', async () => {
			const credentialService = adapterFor(headerAuthProperties, { name: '', value: '' });

			await expect(credentialService.getCredentialFillState!('cred-1')).resolves.toBe('blank');
		});

		it('reports filled when a declared value field carries a value', async () => {
			const credentialService = adapterFor(headerAuthProperties, {
				name: 'Authorization',
				value: 'Bearer abc',
			});

			await expect(credentialService.getCredentialFillState!('cred-1')).resolves.toBe('filled');
		});

		it('reports blank when only a notice field is populated', async () => {
			// A notice carries no credential data, so it must never read as filled.
			const credentialService = adapterFor(headerAuthProperties, {
				name: '',
				value: '',
				useCustomAuth: 'some copy',
			});

			await expect(credentialService.getCredentialFillState!('cred-1')).resolves.toBe('blank');
		});

		// Types like Templated Custom Auth keep their secrets in one structured field,
		// so emptiness has to be judged inside the value, not just on the key.
		it.each([
			['an object with no entries', {}, 'blank'],
			['an object with entries', { api_key: 'abc' }, 'filled'],
			['an array with no entries', [], 'blank'],
			['a JSON string with no entries', '{}', 'blank'],
			['a JSON string with entries', '{"api_key":"abc"}', 'filled'],
		])('judges a structured field holding %s', async (_label, placeholderValues, expected) => {
			const credentialService = adapterFor(
				[
					{ name: 'placeholderValues', type: 'json' },
					{ name: 'testUrl', type: 'string' },
				],
				{ placeholderValues, testUrl: '' },
			);

			await expect(credentialService.getCredentialFillState!('cred-1')).resolves.toBe(expected);
		});

		it('reports unknown when the type declares no value fields to judge', async () => {
			const credentialService = adapterFor([{ name: 'notice', type: 'notice' }], {});

			await expect(credentialService.getCredentialFillState!('cred-1')).resolves.toBe('unknown');
		});

		it('reports unknown when the credential is not readable by the user', async () => {
			const credentialService = createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: {
					getCredential: () => ({ type: { name: 'httpHeaderAuth', properties: [] } }),
					knownCredentials: {},
				},
				credentialsFinderService: { findCredentialForUser: vi.fn().mockResolvedValue(null) },
				credentialsService: { decrypt: vi.fn() },
			}).credentialService;

			await expect(credentialService.getCredentialFillState!('cred-1')).resolves.toBe('unknown');
		});
	});

	describe('isTestable', () => {
		// A versioned node whose `testedBy` sits only on the versions named in `testedByOn`.
		const loaderWithTestedByOn = (testedByOn: number[]) => {
			const descriptionFor = (version: number) => ({
				description: {
					credentials: [
						{
							name: 'kafka',
							...(testedByOn.includes(version) ? { testedBy: 'kafkaConnectionTest' } : {}),
						},
					],
				},
			});

			return {
				// No class-level `test`, so resolution falls through to the nodes.
				getCredential: () => ({ type: { name: 'kafka' } }),
				knownCredentials: { kafka: { supportedNodes: ['kafka'] } },
				getNode: () => ({
					type: { nodeVersions: { 1: descriptionFor(1), 2: descriptionFor(2) } },
				}),
			};
		};

		it('finds a test declared only on an older node version', async () => {
			// Regression guard: reading a single version reported Kafka as untestable once v2
			// registered without `testedBy`, which silently disabled its connection test.
			const { credentialService } = createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: loaderWithTestedByOn([1]),
			});

			expect(credentialService.isTestable).toBeDefined();
			await expect(credentialService.isTestable!('kafka')).resolves.toBe(true);
		});

		it('is false when no registered version declares a test', async () => {
			const { credentialService } = createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: loaderWithTestedByOn([]),
			});

			await expect(credentialService.isTestable!('kafka')).resolves.toBe(false);
		});
	});

	describe('getAiGatewayWallet', () => {
		const mockUser = { id: 'user-1', role: { slug: 'global:member' } } as unknown as User;

		function credentialServiceForWallet(overrides?: { enabled?: boolean; getWallet?: Mock }) {
			const adapter = createAdapterWithGatewayMock(vi.fn(), overrides);
			return adapter.createContext(mockUser).credentialService;
		}

		it('returns null when Connect is off', async () => {
			const getWallet = vi.fn();
			const credentialService = credentialServiceForWallet({ enabled: false, getWallet });

			await expect(credentialService.getAiGatewayWallet!()).resolves.toBeNull();
			expect(getWallet).not.toHaveBeenCalled();
		});

		it('returns null when getWallet throws', async () => {
			const credentialService = credentialServiceForWallet({
				getWallet: vi.fn().mockRejectedValue(new Error('network')),
			});

			await expect(credentialService.getAiGatewayWallet!()).resolves.toBeNull();
		});

		it('returns balance: 0 as-is', async () => {
			const wallet = { balance: 0, budget: 10, hasEverToppedUp: false };
			const getWallet = vi.fn().mockResolvedValue(wallet);
			const credentialService = credentialServiceForWallet({ getWallet });

			await expect(credentialService.getAiGatewayWallet!()).resolves.toEqual(wallet);
			expect(getWallet).toHaveBeenCalledWith('user-1');
		});
	});

	describe('credentialTypeExists', () => {
		const loader = {
			knownCredentials: { gmailOAuth2: {} },
			getCredential: (type: string) => {
				// Runtime-registered types resolve through a loader without being in
				// knownCredentials (e.g. MCP registry).
				if (type === 'linearMcpOAuth2Api') return { type: { name: type } };
				throw new Error(`Unrecognized credential type: ${type}`);
			},
		};

		it('is true for a known credential type', async () => {
			const { credentialService } = createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: loader,
			});

			await expect(credentialService.credentialTypeExists!('gmailOAuth2')).resolves.toBe(true);
		});

		it('is true for a runtime-registered type resolvable only via getCredential', async () => {
			const { credentialService } = createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: loader,
			});

			await expect(credentialService.credentialTypeExists!('linearMcpOAuth2Api')).resolves.toBe(
				true,
			);
		});

		it('is false for an unregistered type', async () => {
			const { credentialService } = createNodeAdapterServiceForTests([], {
				loadNodesAndCredentials: loader,
			});

			await expect(credentialService.credentialTypeExists!('gmailOAuth2Api')).resolves.toBe(false);
		});
	});
});
