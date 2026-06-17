import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService } from 'n8n-core';
import type {
	INode,
	IRunExecutionData,
	IRun,
	IWorkflowBase,
	INodeTypeDescription,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { NodeTypes } from '@/node-types';
import type { PostHogClient } from '@/posthog';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

// ---------------------------------------------------------------------------
// Mocks — must be before the import of the class under test
// ---------------------------------------------------------------------------

jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: jest.fn(),
	extractText: jest.fn(),
}));
jest.mock('../pin-data-generator', () => ({
	generatePinData: jest.fn(),
}));
jest.mock('../mock-handler', () => ({
	createLlmMockHandler: jest.fn(),
}));
jest.mock('../workflow-analysis', () => ({
	partitionAiRoots: jest.fn(),
	buildVendorLlmRouting: jest.fn().mockReturnValue({
		subNodeToRoot: new Map(),
		rootToSubNode: new Map(),
	}),
	generateMockHints: jest.fn(),
	identifyNodesForHints: jest.fn(),
	identifyNodesForPinData: jest.fn(),
	detectBinaryDependencies: jest.fn(),
}));

// Class-based mock — `jest.fn().mockImplementation(() => obj)` doesn't reliably return the object via `new`.
const mockWireServerStart = jest.fn();
const mockWireServerStop = jest.fn();
const capturedWireServerOptions: { last: unknown } = { last: undefined };
jest.mock('../llm-wire-server', () => {
	class MockLlmWireServer {
		start = mockWireServerStart;
		stop = mockWireServerStop;
		url = 'http://127.0.0.1:54321';
		constructor(options: unknown) {
			capturedWireServerOptions.last = options;
		}
	}
	return { LlmWireServer: MockLlmWireServer };
});

const mockRestoreNoProxy = jest.fn();
jest.mock('../proxy-loopback', () => ({
	patchNoProxyForLoopback: jest.fn(() => mockRestoreNoProxy),
}));
jest.mock('@n8n/workflow-sdk', () => ({
	normalizePinData: jest.fn((pd: unknown) => pd),
}));

// Same constructor-protocol gotcha — use a class so `new Workflow()` returns an instance with `getStartNode`.
const mockGetStartNode = jest.fn();
jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	class MockWorkflow {
		nodes: Record<string, unknown>;
		getStartNode = mockGetStartNode;
		constructor(options: { nodes?: Array<{ name: string }> }) {
			// Key the entity's node objects by name (same references, so the SUT's
			// in-place parameter patching propagates to the executed workflow).
			this.nodes = Object.fromEntries((options?.nodes ?? []).map((node) => [node.name, node]));
		}
	}
	return {
		...actual,
		Workflow: MockWorkflow,
	};
});

// ---------------------------------------------------------------------------
// Import SUT and mocked modules (after jest.mock calls)
// ---------------------------------------------------------------------------

import { EvalExecutionService } from '../execution.service';
import { createLlmMockHandler } from '../mock-handler';
import {
	detectBinaryDependencies,
	generateMockHints,
	identifyNodesForHints,
	identifyNodesForPinData,
	partitionAiRoots,
} from '../workflow-analysis';
import type { MockHints } from '../workflow-analysis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateMockHintsMock = jest.mocked(generateMockHints);
const detectBinaryDependenciesMock = jest.mocked(detectBinaryDependencies);
const identifyNodesForHintsMock = jest.mocked(identifyNodesForHints);
const identifyNodesForPinDataMock = jest.mocked(identifyNodesForPinData);
const partitionAiRootsMock = jest.mocked(partitionAiRoots);
const createLlmMockHandlerMock = jest.mocked(createLlmMockHandler);

function makeWorkflowEntity(overrides: Partial<IWorkflowBase> = {}) {
	return {
		id: 'wf-1',
		name: 'Test Workflow',
		active: false,
		nodes: [
			{
				id: 'node-1',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode,
			{
				id: 'node-2',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [200, 0],
				parameters: {},
			} as INode,
		],
		connections: {},
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	} as unknown as IWorkflowBase;
}

function makeUser(): User {
	return { id: 'user-1' } as User;
}

function makeEmptyHints(): MockHints {
	return {
		globalContext: 'Test context',
		triggerContent: { body: { email: 'test@example.com' } },
		nodeHints: { 'HTTP Request': 'Return user data' },
		warnings: [],
		bypassPinData: {},
	};
}

function makeIRun(overrides: Partial<IRun> = {}): IRun {
	return {
		data: {
			resultData: {
				runData: {},
			},
		} as unknown as IRunExecutionData,
		mode: 'evaluation',
		startedAt: new Date(),
		status: 'success',
		...overrides,
	} as IRun;
}

function makeStartNode(): INode {
	return {
		id: 'node-1',
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	} as INode;
}

function placeholderValue(hint: string): string {
	return `<__PLACEHOLDER_VALUE__${hint}__>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EvalExecutionService', () => {
	const DB_EXECUTION_ID = 'exec-42';

	let service: EvalExecutionService;
	const workflowFinderService = mock<WorkflowFinderService>();
	const nodeTypes = mock<NodeTypes>();
	const logger = mock<Logger>();
	const postHogClient = mock<PostHogClient>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	const executionsConfig = mock<ExecutionsConfig>({ mode: 'regular' });
	const binaryDataService = mock<BinaryDataService>();

	// Captured configureAdditionalData closure so tests can re-invoke it on a
	// stub additionalData without booting the real runner.
	let lastConfigureAdditionalData:
		| ((ad: { credentialsHelper?: unknown; evalLlmMockHandler?: unknown }) => unknown)
		| undefined;

	type StubAdditionalData = {
		credentialsHelper: unknown;
		evalLlmMockHandler?: (req: unknown, node: unknown) => Promise<unknown>;
	};

	function makeMockedAdditionalData(): StubAdditionalData {
		return {
			credentialsHelper: { resolve: jest.fn() },
			evalLlmMockHandler: undefined,
		};
	}

	beforeEach(() => {
		jest.clearAllMocks();
		lastConfigureAdditionalData = undefined;

		service = new EvalExecutionService(
			workflowFinderService,
			nodeTypes,
			logger,
			postHogClient,
			workflowRunner,
			activeExecutions,
			executionsConfig,
			binaryDataService,
		);
		// Reset to safe default — tests that flip queue mode reassign in-test.
		Object.assign(executionsConfig, { mode: 'regular' });

		// Root jest config sets `restoreMocks: true`, which strips implementations
		// between tests — re-set every impl we depend on here.
		identifyNodesForHintsMock.mockReturnValue([]);
		identifyNodesForPinDataMock.mockReturnValue([]);
		partitionAiRootsMock.mockReturnValue({ unpinNodes: [], pinNodes: [], autoPinned: [] });
		generateMockHintsMock.mockResolvedValue(makeEmptyHints());
		createLlmMockHandlerMock.mockReturnValue(jest.fn());
		mockGetStartNode.mockReturnValue(makeStartNode());
		mockWireServerStart.mockResolvedValue('http://127.0.0.1:54321');
		mockWireServerStop.mockResolvedValue(undefined);
		// Default: kill-switch enabled. Tests that need it off flip this.
		postHogClient.getFeatureFlags.mockResolvedValue({});

		const proxyLoopback = require('../proxy-loopback') as {
			patchNoProxyForLoopback: jest.Mock;
		};
		proxyLoopback.patchNoProxyForLoopback.mockImplementation(() => mockRestoreNoProxy);

		// Mirror runMainProcess: capture + invoke the closure on a stub additionalData.
		workflowRunner.run.mockImplementation(async (data) => {
			const ad = makeMockedAdditionalData();
			lastConfigureAdditionalData = data.configureAdditionalData;
			if (data.configureAdditionalData) {
				await data.configureAdditionalData(ad as never);
			}
			return DB_EXECUTION_ID;
		});
		activeExecutions.getPostExecutePromise.mockResolvedValue(makeIRun());

		// NodeTypes.getByNameAndVersion returns a minimal node type with no webhook
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { properties: [] } as unknown as INodeTypeDescription,
		} as never);
	});

	// ── errorResult (workflow not found) ─────────────────────────────

	describe('when workflow is not found', () => {
		it('returns error result with descriptive message', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const result = await service.executeWithLlmMock('wf-missing', makeUser());

			expect(result.success).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('wf-missing')]),
			);
		});

		it('returns empty nodeResults', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const result = await service.executeWithLlmMock('wf-missing', makeUser());

			expect(result.nodeResults).toEqual({});
		});

		it('returns empty hints with defaults', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			const result = await service.executeWithLlmMock('wf-missing', makeUser());

			expect(result.hints.globalContext).toBe('');
			expect(result.hints.triggerContent).toEqual({});
			expect(result.hints.nodeHints).toEqual({});
		});
	});

	// ── executeWithLlmMock orchestration ─────────────────────────────

	describe('orchestration', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
		});

		it('calls generateMockHints with workflow and node names', async () => {
			const hintNodes = [makeStartNode()];
			identifyNodesForHintsMock.mockReturnValue(hintNodes);

			await service.executeWithLlmMock('wf-1', makeUser());

			expect(generateMockHintsMock).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow: expect.objectContaining({ id: 'wf-1' }),
					nodeNames: ['Webhook'],
				}),
			);
		});

		it('forwards scenarioHints to generateMockHints', async () => {
			identifyNodesForHintsMock.mockReturnValue([]);

			await service.executeWithLlmMock('wf-1', makeUser(), {
				scenarioHints: 'error scenario',
			});

			expect(generateMockHintsMock).toHaveBeenCalledWith(
				expect.objectContaining({ scenarioHints: 'error scenario' }),
			);
		});

		it('calls createLlmMockHandler with hints from Phase 1', async () => {
			const hints = makeEmptyHints();
			hints.globalContext = 'shared context';
			hints.nodeHints = { 'HTTP Request': 'return list of users' };
			generateMockHintsMock.mockResolvedValue(hints);

			await service.executeWithLlmMock('wf-1', makeUser());

			expect(createLlmMockHandlerMock).toHaveBeenCalledWith(
				expect.objectContaining({
					globalContext: 'shared context',
					nodeHints: { 'HTTP Request': 'return list of users' },
				}),
			);
		});

		it('returns the DB-assigned executionId from workflowRunner.run', async () => {
			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.executionId).toBe(DB_EXECUTION_ID);
		});

		it('routes through WorkflowRunner with evaluation mode + pin data + user', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = { body: { email: 'jane@example.com' } };
			generateMockHintsMock.mockResolvedValue(hints);

			await service.executeWithLlmMock('wf-1', makeUser());

			expect(workflowRunner.run).toHaveBeenCalledWith(
				expect.objectContaining({
					executionMode: 'evaluation',
					userId: 'user-1',
					workflowData: expect.objectContaining({ id: 'wf-1' }),
					pinData: expect.objectContaining({
						Webhook: [{ json: { body: { email: 'jane@example.com' } } }],
					}),
					configureAdditionalData: expect.any(Function),
				}),
			);
		});

		it('awaits the run via ActiveExecutions.getPostExecutePromise', async () => {
			await service.executeWithLlmMock('wf-1', makeUser());

			expect(activeExecutions.getPostExecutePromise).toHaveBeenCalledWith(DB_EXECUTION_ID);
		});

		it('wraps additionalData.credentialsHelper inside configureAdditionalData', async () => {
			await service.executeWithLlmMock('wf-1', makeUser());

			const ad = makeMockedAdditionalData();
			const originalHelper = ad.credentialsHelper;
			await lastConfigureAdditionalData!(ad as never);

			// The helper should be replaced (wrapped) — not the same reference.
			expect(ad.credentialsHelper).not.toBe(originalHelper);
			// And the eval LLM handler should be set.
			expect(ad.evalLlmMockHandler).toEqual(expect.any(Function));
		});

		it('returns a partial-failure result when the run resolves with undefined', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(undefined);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.success).toBe(false);
			expect(result.executionId).toBe(DB_EXECUTION_ID);
			expect(result.errors).toEqual([expect.stringContaining('no run data')]);
		});

		it('refuses to run in queue mode before touching anything else', async () => {
			Object.assign(executionsConfig, { mode: 'queue' });

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.success).toBe(false);
			expect(result.errors).toEqual([expect.stringContaining('queue mode')]);
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(workflowRunner.run).not.toHaveBeenCalled();
		});
	});

	// ── pinNodes / interception partition ────────────────────────────

	describe('interception partition', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
		});

		it('calls partitionAiRoots with an empty explicit pin list when pinNodes is omitted', async () => {
			await service.executeWithLlmMock('wf-1', makeUser());

			expect(partitionAiRootsMock).toHaveBeenCalledWith(expect.anything(), []);
		});

		it('forwards explicit pinNodes from the request to partitionAiRoots', async () => {
			await service.executeWithLlmMock('wf-1', makeUser(), { pinNodes: ['Agent'] });

			expect(partitionAiRootsMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'wf-1' }), [
				'Agent',
			]);
		});

		it('omits the exclusion set when the partition returns no unpinNodes', async () => {
			// Default mock returns empty unpinNodes → no AI roots intercepted.
			await service.executeWithLlmMock('wf-1', makeUser());

			expect(identifyNodesForPinDataMock).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				undefined,
			);
		});

		it("surfaces the partition's typo-guard error when an explicit pin name is invalid", async () => {
			partitionAiRootsMock.mockImplementation(() => {
				throw new UserError('Cannot pin — not found in workflow: "Ghost".');
			});

			const result = await service.executeWithLlmMock('wf-1', makeUser(), {
				pinNodes: ['Ghost'],
			});

			expect(result.success).toBe(false);
			expect(result.errors).toEqual([expect.stringContaining('not found in workflow')]);
			expect(workflowRunner.run).not.toHaveBeenCalled();
			expect(mockWireServerStart).not.toHaveBeenCalled();
		});

		// PostHog kill-switch: when partitionAiRoots wants to intercept any
		// roots, the flag is consulted. Flag OFF silently degrades to the
		// pinned baseline so the eval still produces a result — no error,
		// just the today-baseline behaviour. This is the right default once
		// interception is the default-on path.
		describe('PostHog kill-switch (flag off)', () => {
			beforeEach(() => {
				partitionAiRootsMock.mockReturnValue({
					unpinNodes: ['Agent'],
					pinNodes: [],
					autoPinned: [],
				});
				postHogClient.getFeatureFlags.mockResolvedValue({
					'085_eval_vendor_sdk_interception': false,
				});
			});

			it('silently degrades to the pinned baseline (no wire server, no error)', async () => {
				const result = await service.executeWithLlmMock('wf-1', makeUser());

				// No refusal — the eval still completes through the pinned path.
				expect(result.errors).toEqual([]);
				expect(mockWireServerStart).not.toHaveBeenCalled();
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
			});

			it('does not consult PostHog when the partition has nothing to intercept', async () => {
				partitionAiRootsMock.mockReturnValue({
					unpinNodes: [],
					pinNodes: [],
					autoPinned: [],
				});

				await service.executeWithLlmMock('wf-1', makeUser());

				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
			});

			it('also degrades silently when PostHog itself rejects (fail-closed)', async () => {
				postHogClient.getFeatureFlags.mockRejectedValue(new Error('PostHog down'));

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				expect(result.errors).toEqual([]);
				expect(mockWireServerStart).not.toHaveBeenCalled();
			});
		});

		// Flag ON (or unset — fail-open default): the partition's unpinNodes
		// drive the rewrite path and boot the wire server.
		describe('PostHog kill-switch (flag on)', () => {
			beforeEach(() => {
				partitionAiRootsMock.mockReturnValue({
					unpinNodes: ['Agent'],
					pinNodes: [],
					autoPinned: [],
				});
			});

			it('forwards the exclusion set to identifyNodesForPinData when interception is enabled', async () => {
				await service.executeWithLlmMock('wf-1', makeUser());

				expect(identifyNodesForPinDataMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					new Set(['Agent']),
				);
			});

			it('boots and tears down the wire server around the workflow run', async () => {
				await service.executeWithLlmMock('wf-1', makeUser());

				expect(mockWireServerStart).toHaveBeenCalledTimes(1);
				expect(workflowRunner.run).toHaveBeenCalledTimes(1);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
				expect(mockRestoreNoProxy).toHaveBeenCalledTimes(1);
			});

			it('tears down the wire server even if the workflow run throws', async () => {
				workflowRunner.run.mockRejectedValue(new Error('explode'));

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				expect(result.success).toBe(false);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
				expect(mockRestoreNoProxy).toHaveBeenCalledTimes(1);
			});

			it('does not boot the wire server when the partition has no unpinNodes', async () => {
				partitionAiRootsMock.mockReturnValue({
					unpinNodes: [],
					pinNodes: [],
					autoPinned: [],
				});

				await service.executeWithLlmMock('wf-1', makeUser());

				expect(mockWireServerStart).not.toHaveBeenCalled();
				expect(mockWireServerStop).not.toHaveBeenCalled();
			});

			it('tears down the wire server when NO_PROXY patching throws after boot', async () => {
				const proxyLoopback = require('../proxy-loopback');
				proxyLoopback.patchNoProxyForLoopback.mockImplementationOnce(() => {
					throw new Error('env mutation blocked');
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				expect(result.success).toBe(false);
				expect(result.errors).toEqual([expect.stringContaining('env mutation blocked')]);
				expect(mockWireServerStart).toHaveBeenCalledTimes(1);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
			});

			it('records a wire-server turn against the AI root in nodeResults via onIntercept', async () => {
				// Simulate the wire server firing onIntercept mid-execution by
				// invoking the captured callback after run() returns but before
				// getPostExecutePromise resolves. This exercises
				// `recordWireServerTurn` end-to-end without booting a real
				// Express server.
				activeExecutions.getPostExecutePromise.mockImplementation(async () => {
					const opts = capturedWireServerOptions.last as {
						onIntercept?: (turn: unknown) => void;
					};
					opts.onIntercept?.({
						rootName: 'Agent',
						url: 'https://api.openai.com/v1/chat/completions',
						method: 'POST',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						requestBody: { model: 'gpt-4o', messages: [] },
						mockResponse: { content: 'hello from mock' },
					});
					return makeIRun();
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				expect(result.nodeResults['Agent']).toBeDefined();
				expect(result.nodeResults['Agent'].executionMode).toBe('mocked');
				expect(result.nodeResults['Agent'].interceptedRequests).toEqual([
					{
						url: 'https://api.openai.com/v1/chat/completions',
						method: 'POST',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						requestBody: { model: 'gpt-4o', messages: [] },
						mockResponse: { content: 'hello from mock' },
					},
				]);
			});

			it('preserves a pre-existing pinned executionMode when a wire-server turn fires for the same name', async () => {
				generateMockHintsMock.mockResolvedValue({
					...makeEmptyHints(),
					bypassPinData: {
						Agent: [{ json: { triggered: 'pre-pin' } }],
					},
				});

				activeExecutions.getPostExecutePromise.mockImplementation(async () => {
					const opts = capturedWireServerOptions.last as {
						onIntercept?: (turn: unknown) => void;
					};
					opts.onIntercept?.({
						rootName: 'Agent',
						url: 'https://api.openai.com/v1/chat/completions',
						method: 'POST',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						requestBody: { model: 'gpt-4o', messages: [] },
						mockResponse: { content: 'reply' },
					});
					return makeIRun();
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				// 'pinned' from the bypass pass survives — preservation rule.
				expect(result.nodeResults['Agent'].executionMode).toBe('pinned');
				expect(result.nodeResults['Agent'].interceptedRequests).toHaveLength(1);
			});

			// Headline ledger-attribution rule for M3: a single eval run produces
			// two kinds of traffic — vendor-SDK model turns (attributed to the AI
			// root via the wire server's URL path) and tool HTTP traffic
			// (attributed to the tool node via the existing helpers.httpRequest
			// interceptor). The two must land in separate `nodeResults` entries;
			// tools whose HTTP traffic gets folded into the Agent's ledger would
			// mask real bugs.
			it('splits the ledger: model turns to the Agent root, tool HTTP to the tool node', async () => {
				const innerMockHandler = jest.fn().mockResolvedValue({
					body: { content: 'tool result' },
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});
				createLlmMockHandlerMock.mockReturnValue(innerMockHandler);

				// Capture the configureAdditionalData closure so we can invoke
				// the evalLlmMockHandler it installs (tool-HTTP path).
				let capturedAd: StubAdditionalData | undefined;
				workflowRunner.run.mockImplementation(async (data) => {
					const ad = makeMockedAdditionalData();
					await data.configureAdditionalData?.(ad as never);
					capturedAd = ad;
					return DB_EXECUTION_ID;
				});

				activeExecutions.getPostExecutePromise.mockImplementation(async () => {
					const opts = capturedWireServerOptions.last as {
						onIntercept?: (turn: unknown) => void;
					};
					// Model turn — wire server's onIntercept fires with the root name.
					opts.onIntercept?.({
						rootName: 'Agent',
						url: 'https://api.openai.com/v1/chat/completions',
						method: 'POST',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						requestBody: { model: 'gpt-4o', messages: [] },
						mockResponse: {
							tool_calls: [{ id: 'c1', function: { name: 'getOrder', arguments: '{}' } }],
						},
					});

					// Tool HTTP — invoked from `request-helper-functions.ts` with
					// the tool node's identity. We pulled it off the stub
					// additionalData via configureAdditionalData above.
					if (!capturedAd?.evalLlmMockHandler) {
						throw new Error(
							'configureAdditionalData did not install evalLlmMockHandler — ledger-split test invariant broken.',
						);
					}
					await capturedAd.evalLlmMockHandler(
						{ url: 'https://orders.example.com/v1/orders/42', method: 'GET' },
						{
							id: 'tool-node',
							name: 'Get Order Tool',
							type: 'n8n-nodes-base.httpRequestTool',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					);

					return makeIRun();
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				// Model turn attributed to Agent only.
				expect(result.nodeResults['Agent']).toBeDefined();
				expect(result.nodeResults['Agent'].interceptedRequests).toHaveLength(1);
				expect(result.nodeResults['Agent'].interceptedRequests[0].nodeType).toBe(
					'@n8n/n8n-nodes-langchain.lmChatOpenAi',
				);

				// Tool HTTP attributed to the tool node, NOT to the Agent.
				expect(result.nodeResults['Get Order Tool']).toBeDefined();
				expect(result.nodeResults['Get Order Tool'].interceptedRequests).toHaveLength(1);
				expect(result.nodeResults['Get Order Tool'].interceptedRequests[0].url).toBe(
					'https://orders.example.com/v1/orders/42',
				);
				expect(result.nodeResults['Get Order Tool'].interceptedRequests[0].nodeType).toBe(
					'n8n-nodes-base.httpRequestTool',
				);
				expect(result.nodeResults['Get Order Tool'].executionMode).toBe('mocked');

				// Cross-check: neither side's ledger contains the other side's URL.
				const agentUrls = result.nodeResults['Agent'].interceptedRequests.map((r) => r.url);
				const toolUrls = result.nodeResults['Get Order Tool'].interceptedRequests.map((r) => r.url);
				expect(agentUrls).not.toContain('https://orders.example.com/v1/orders/42');
				expect(toolUrls).not.toContain('https://api.openai.com/v1/chat/completions');
			});

			it('upgrades a pre-marked "real" entry to "mocked" when a wire-server turn fires', async () => {
				nodeTypes.getByNameAndVersion.mockReturnValue({
					description: {
						properties: [
							{
								name: 'requiredField',
								type: 'string',
								required: true,
								default: '',
								displayName: 'Required Field',
							},
						],
					} as unknown as INodeTypeDescription,
				} as never);

				activeExecutions.getPostExecutePromise.mockImplementation(async () => {
					const opts = capturedWireServerOptions.last as {
						onIntercept?: (turn: unknown) => void;
					};
					opts.onIntercept?.({
						rootName: 'HTTP Request',
						url: 'https://api.openai.com/v1/chat/completions',
						method: 'POST',
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						requestBody: { model: 'gpt-4o', messages: [] },
						mockResponse: { content: 'reply' },
					});
					return makeIRun();
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser());

				// 'real' (from config-issue pre-marking) gets upgraded to 'mocked'.
				expect(result.nodeResults['HTTP Request']).toBeDefined();
				expect(result.nodeResults['HTTP Request'].executionMode).toBe('mocked');
			});
		});
	});

	// ── Parameter issue patching ─────────────────────────────────────

	describe('parameter issue patching', () => {
		it('keeps missing required parameters visible as failed config issues after synthesis', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
			nodeTypes.getByNameAndVersion.mockImplementation((nodeType) => {
				if (nodeType !== 'n8n-nodes-base.httpRequest') {
					return {
						description: { properties: [] } as unknown as INodeTypeDescription,
					} as never;
				}

				return {
					description: {
						properties: [
							{
								name: 'requiredField',
								type: 'string',
								required: true,
								default: '',
								displayName: 'Required Field',
							},
						],
					} as unknown as INodeTypeDescription,
				} as never;
			});
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'HTTP Request': [
									{
										startTime: 1000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: { main: [[{ json: { ok: true } }]] },
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());
			const runArg = workflowRunner.run.mock.calls[0][0];
			const httpNode = runArg.workflowData.nodes.find((node) => node.name === 'HTTP Request');

			expect(httpNode?.parameters).toMatchObject({
				requiredField: '__evalMockValue',
			});
			expect(result.nodeResults['HTTP Request'].configIssues).toBeDefined();
			expect(result.success).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('HTTP Request')]),
			);
		});

		it('synthesizes validator-shaped values for selected resource placeholders', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				makeWorkflowEntity({
					nodes: [
						makeStartNode(),
						{
							id: 'node-2',
							name: 'Resource Node',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [200, 0],
							parameters: {
								calendarId: placeholderValue('Select a calendar'),
								documentId: placeholderValue('Select spreadsheet'),
								folderId: placeholderValue('Select folder'),
								sheetName: placeholderValue('Select sheet'),
								fileId: placeholderValue('Select file'),
								driveId: placeholderValue('Select drive'),
							},
						} as INode,
					],
				}) as never,
			);

			await service.executeWithLlmMock('wf-1', makeUser());
			const runArg = workflowRunner.run.mock.calls[0][0];
			const resourceNode = runArg.workflowData.nodes.find((node) => node.name === 'Resource Node');

			expect(resourceNode?.parameters).toMatchObject({
				calendarId: 'eval-calendar-id',
				documentId: 'eval-spreadsheet-id',
				folderId: 'eval-folder-id',
				sheetName: '0',
				fileId: 'eval-file-id',
				driveId: 'eval-drive-id',
			});
		});
	});

	// ── buildResult behavior ─────────────────────────────────────────

	describe('buildResult (via execution)', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
		});

		it('returns success=true when no errors in run data', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'HTTP Request': [
									{
										startTime: 1000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: { main: [[{ json: { id: 1 } }]] },
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.success).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('captures node errors from run data', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'HTTP Request': [
									{
										startTime: 1000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: { main: [[{ json: {} }]] },
										error: { message: 'Connection refused' } as Error,
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.success).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('Connection refused')]),
			);
		});

		it('captures workflow-level execution error', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {},
							error: { message: 'Workflow timed out' } as Error,
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.success).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('Workflow timed out')]),
			);
		});

		it('sets executionMode to "real" for logic nodes in run data', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'Set Node': [
									{
										startTime: 2000,
										executionTime: 50,
										executionIndex: 0,
										source: [],
										data: { main: [[{ json: { key: 'value' } }]] },
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.nodeResults['Set Node']).toBeDefined();
			expect(result.nodeResults['Set Node'].executionMode).toBe('real');
		});

		it('captures startTime from run data', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'HTTP Request': [
									{
										startTime: 1710000000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: { main: [[{ json: { ok: true } }]] },
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.nodeResults['HTTP Request'].startTime).toBe(1710000000);
		});

		it('truncates per-branch items to MAX_OUTPUT_ITEMS_PER_BRANCH and reports full outputCount', async () => {
			const items = Array.from({ length: 15 }, (_, i) => ({ json: { idx: i } }));
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'HTTP Request': [
									{
										startTime: 1000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: { main: [items] },
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			const entry = result.nodeResults['HTTP Request'];
			expect(entry.outputs.main[0]).toHaveLength(10);
			expect(entry.outputCount).toBe(15);
			expect(entry.truncated).toBe(true);
			expect(entry.iterationCount).toBe(1);
		});

		it('preserves per-branch structure for Filter/IF/Switch nodes', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								Filter: [
									{
										startTime: 1000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: {
											main: [
												[{ json: { id: 1, kept: true } }, { json: { id: 2, kept: true } }],
												[{ json: { id: 3, dropped: true } }],
											],
										},
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			const entry = result.nodeResults['Filter'];
			expect(entry.outputs.main).toHaveLength(2);
			expect(entry.outputs.main[0]).toHaveLength(2);
			expect(entry.outputs.main[1]).toHaveLength(1);
			expect(entry.outputCount).toBe(3);
		});

		it('captures non-main connection outputs (AI sub-nodes)', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'OpenAI Chat Model': [
									{
										startTime: 1000,
										executionTime: 200,
										executionIndex: 0,
										source: [],
										data: {
											ai_languageModel: [[{ json: { response: 'hi' } }]],
										},
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			const entry = result.nodeResults['OpenAI Chat Model'];
			expect(entry.outputs.ai_languageModel).toBeDefined();
			expect(entry.outputs.ai_languageModel[0]).toHaveLength(1);
			expect(entry.outputs.main).toBeUndefined();
			expect(entry.outputCount).toBe(1);
		});

		it('records iterationCount and firstErrorIteration for nodes that ran multiple times', async () => {
			activeExecutions.getPostExecutePromise.mockResolvedValue(
				makeIRun({
					data: {
						resultData: {
							runData: {
								'Code (in loop)': [
									{
										startTime: 1000,
										executionTime: 50,
										executionIndex: 0,
										source: [],
										data: { main: [[{ json: { iter: 0 } }]] },
									},
									{
										startTime: 1100,
										executionTime: 50,
										executionIndex: 1,
										source: [],
										data: { main: [[{ json: { iter: 1 } }]] },
										error: { message: 'boom' } as unknown as Error,
									},
									{
										startTime: 1200,
										executionTime: 50,
										executionIndex: 2,
										source: [],
										data: { main: [[{ json: { iter: 2 } }]] },
									},
								],
							},
						},
					} as unknown as IRunExecutionData,
				}),
			);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			const entry = result.nodeResults['Code (in loop)'];
			expect(entry.iterationCount).toBe(3);
			expect(entry.firstErrorIteration).toBe(1);
		});
	});

	// ── buildTriggerPinData (via execution) ──────────────────────────

	describe('buildTriggerPinData (via execution)', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
		});

		it('marks the trigger node as pinned when triggerContent is present', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = { body: { email: 'test@example.com' } };
			generateMockHintsMock.mockResolvedValue(hints);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.nodeResults['Webhook']).toBeDefined();
			expect(result.nodeResults['Webhook'].executionMode).toBe('pinned');
		});

		it('mirrors an LLM-embedded binary map as real item.binary while keeping json intact', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = {
				body: { subject: 'invoice' },
				binary: { image: { mimeType: 'image/png', fileName: 'chart.png', data: 'bm90LWEtcG5n' } },
			};
			generateMockHintsMock.mockResolvedValue(hints);

			await service.executeWithLlmMock('wf-1', makeUser());

			const runData = workflowRunner.run.mock.calls[0][0];
			const item = runData.pinData?.['Webhook']?.[0];
			// json stays untouched so $json.binary.* references keep resolving
			expect(item?.json).toEqual(hints.triggerContent);
			expect(item?.binary?.image).toMatchObject({
				mimeType: 'image/png',
				fileName: 'chart.png',
			});
			// Real synthesized bytes back the item-level binary, not the LLM's fake base64
			expect(item?.binary?.image.data).not.toBe('bm90LWEtcG5n');
			expect(Buffer.from(item?.binary?.image.data ?? '', 'base64').length).toBeGreaterThan(0);
		});

		it('does not treat name-only object maps under a binary json key as file metadata', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = {
				body: {},
				binary: { probe: { name: 'Temp Sensor', value: 23 } },
			};
			generateMockHintsMock.mockResolvedValue(hints);

			await service.executeWithLlmMock('wf-1', makeUser());

			const runData = workflowRunner.run.mock.calls[0][0];
			const item = runData.pinData?.['Webhook']?.[0];
			expect(item?.json).toEqual(hints.triggerContent);
			expect(item?.binary).toBeUndefined();
		});

		it('prefers richer embedded metadata when the consumer requirement is the generic fallback', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = {
				body: {},
				binary: { Document: { mimeType: 'application/pdf', fileName: 'contract.pdf' } },
			};
			generateMockHintsMock.mockResolvedValue(hints);
			detectBinaryDependenciesMock.mockReturnValueOnce({
				propertyName: 'Document',
				contentType: 'application/octet-stream',
				filename: 'input.bin',
			});

			await service.executeWithLlmMock('wf-1', makeUser());

			const runData = workflowRunner.run.mock.calls[0][0];
			const item = runData.pinData?.['Webhook']?.[0];
			expect(item?.binary?.Document).toMatchObject({
				mimeType: 'application/pdf',
				fileName: 'contract.pdf',
			});
		});

		it('keeps a non-binary-shaped "binary" json field untouched', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = { binary: true, body: { mode: 'fast' } };
			generateMockHintsMock.mockResolvedValue(hints);

			await service.executeWithLlmMock('wf-1', makeUser());

			const runData = workflowRunner.run.mock.calls[0][0];
			const item = runData.pinData?.['Webhook']?.[0];
			expect(item?.json).toEqual({ binary: true, body: { mode: 'fast' } });
			expect(item?.binary).toBeUndefined();
		});

		it('lets a consumer-derived binary requirement override an embedded entry with the same key', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = {
				body: {},
				binary: { upload: { mimeType: 'image/png', fileName: 'wrong.png' } },
			};
			generateMockHintsMock.mockResolvedValue(hints);
			detectBinaryDependenciesMock.mockReturnValueOnce({
				propertyName: 'upload',
				contentType: 'application/pdf',
				filename: 'input.pdf',
			});

			await service.executeWithLlmMock('wf-1', makeUser());

			const runData = workflowRunner.run.mock.calls[0][0];
			const item = runData.pinData?.['Webhook']?.[0];
			expect(item?.binary?.upload).toMatchObject({
				mimeType: 'application/pdf',
				fileName: 'input.pdf',
			});
		});

		it('does not create pin data when triggerContent is empty', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = {};
			generateMockHintsMock.mockResolvedValue(hints);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			// When triggerContent is empty, the start node is NOT marked as pinned
			// (it may still appear in results from run data as 'real')
			const webhookResult = result.nodeResults['Webhook'];
			if (webhookResult) {
				expect(webhookResult.executionMode).not.toBe('pinned');
			}
		});
	});

	// ── No start node ────────────────────────────────────────────────

	describe('when no start node is found', () => {
		it('returns error result', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
			mockGetStartNode.mockReturnValue(undefined);
			// Also ensure findWebhookNode returns nothing — nodeTypes must not match webhook
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { properties: [] } as unknown as INodeTypeDescription,
			} as never);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.success).toBe(false);
			expect(result.errors).toEqual(
				expect.arrayContaining([expect.stringContaining('No trigger or start node')]),
			);
		});
	});

	// ── hints passthrough ────────────────────────────────────────────

	describe('hints in result', () => {
		it('includes Phase 1 hints in the execution result', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
			const hints = makeEmptyHints();
			hints.globalContext = 'Users: jane@example.com, john@example.com';
			hints.nodeHints = { 'HTTP Request': 'Return user profiles' };
			hints.triggerContent = { body: { action: 'create' } };
			generateMockHintsMock.mockResolvedValue(hints);

			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.hints.globalContext).toBe('Users: jane@example.com, john@example.com');
			expect(result.hints.nodeHints).toEqual({ 'HTTP Request': 'Return user profiles' });
		});
	});
});
