import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type {
	INode,
	IRunExecutionData,
	IRun,
	IWorkflowBase,
	INodeTypeDescription,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import type { PostHogClient } from '@/posthog';
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
}));
const mockWireServerStart = jest.fn();
const mockWireServerStop = jest.fn();
const capturedWireServerOptions: { last: unknown } = { last: undefined };
jest.mock('../llm-wire-server', () => ({
	LlmWireServer: jest.fn().mockImplementation((options: unknown) => {
		capturedWireServerOptions.last = options;
		return {
			start: mockWireServerStart,
			stop: mockWireServerStop,
			url: 'http://127.0.0.1:54321',
		};
	}),
}));
const mockRestoreNoProxy = jest.fn();
jest.mock('../proxy-loopback', () => ({
	patchNoProxyForLoopback: jest.fn(() => mockRestoreNoProxy),
}));
jest.mock('@n8n/workflow-sdk', () => ({
	normalizePinData: jest.fn((pd: unknown) => pd),
}));
jest.mock('@/workflow-execute-additional-data', () => ({
	getBase: jest.fn().mockResolvedValue({
		hooks: undefined,
		evalLlmMockHandler: undefined,
	}),
}));

// WorkflowExecute is a class instantiated with `new` — mock it so
// processRunExecutionData returns a controllable IRun.
const mockProcessRunExecutionData = jest.fn();
jest.mock('n8n-core', () => {
	const actual = jest.requireActual('n8n-core');
	return {
		...actual,
		WorkflowExecute: jest.fn().mockImplementation(() => ({
			processRunExecutionData: mockProcessRunExecutionData,
		})),
		ExecutionLifecycleHooks: jest.fn().mockImplementation(() => ({})),
	};
});

// Workflow is a class instantiated with `new` — mock getStartNode
const mockGetStartNode = jest.fn();
jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		Workflow: jest.fn().mockImplementation(() => ({
			getStartNode: mockGetStartNode,
			nodes: {},
		})),
	};
});

// ---------------------------------------------------------------------------
// Import SUT and mocked modules (after jest.mock calls)
// ---------------------------------------------------------------------------

import { EvalExecutionService } from '../execution.service';
import { createLlmMockHandler } from '../mock-handler';
import {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EvalExecutionService', () => {
	let service: EvalExecutionService;
	const workflowFinderService = mock<WorkflowFinderService>();
	const nodeTypes = mock<NodeTypes>();
	const logger = mock<Logger>();
	const postHogClient = mock<PostHogClient>();

	beforeEach(() => {
		jest.clearAllMocks();

		service = new EvalExecutionService(workflowFinderService, nodeTypes, logger, postHogClient);

		// Default mock returns — happy path. partitionAiRoots returns an empty
		// partition (no AI roots in the test workflow) so the kill-switch
		// short-circuits and the wire server stays off unless a test overrides.
		identifyNodesForHintsMock.mockReturnValue([]);
		identifyNodesForPinDataMock.mockReturnValue([]);
		partitionAiRootsMock.mockReturnValue({ unpinNodes: [], pinNodes: [], autoPinned: [] });
		generateMockHintsMock.mockResolvedValue(makeEmptyHints());
		createLlmMockHandlerMock.mockReturnValue(jest.fn());
		mockGetStartNode.mockReturnValue(makeStartNode());
		mockProcessRunExecutionData.mockResolvedValue(makeIRun());
		mockWireServerStart.mockResolvedValue('http://127.0.0.1:54321');
		mockWireServerStop.mockResolvedValue(undefined);
		// Default: kill-switch enabled. Tests that need it off flip this.
		postHogClient.getFeatureFlags.mockResolvedValue({});

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

		it('returns executionId in the result', async () => {
			const result = await service.executeWithLlmMock('wf-1', makeUser());

			expect(result.executionId).toBeDefined();
			expect(typeof result.executionId).toBe('string');
			expect(result.executionId.length).toBeGreaterThan(0);
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
			expect(mockProcessRunExecutionData).not.toHaveBeenCalled();
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
				expect(mockProcessRunExecutionData).toHaveBeenCalledTimes(1);
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
				expect(mockProcessRunExecutionData).toHaveBeenCalledTimes(1);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
				expect(mockRestoreNoProxy).toHaveBeenCalledTimes(1);
			});

			it('tears down the wire server even if the workflow run throws', async () => {
				mockProcessRunExecutionData.mockRejectedValue(new Error('explode'));

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
				// invoking the captured callback before processRunExecutionData
				// resolves. This exercises `recordWireServerTurn` end-to-end
				// without booting a real Express server.
				mockProcessRunExecutionData.mockImplementation(async () => {
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
				// Force a name collision between the bypass-pin path and the
				// wire-server interception path. The bypass-pin loop in
				// execute() pre-marks `bypassPinData` keys as 'pinned' BEFORE
				// runWorkflow fires, so injecting 'Agent' into bypassPinData
				// (and then firing onIntercept for the same name during the
				// mocked run) exercises the genuine collision case.
				generateMockHintsMock.mockResolvedValue({
					...makeEmptyHints(),
					bypassPinData: {
						Agent: [{ json: { triggered: 'pre-pin' } }],
					},
				});

				mockProcessRunExecutionData.mockImplementation(async () => {
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
				// The turn is still recorded against the same entry.
				expect(result.nodeResults['Agent'].interceptedRequests).toHaveLength(1);
			});

			// Headline ledger-attribution rule for M3: a single eval run produces
			// two kinds of traffic — vendor-SDK model turns (attributed to the AI
			// root via the wire server's URL path) and tool HTTP traffic
			// (attributed to the tool node via the existing helpers.httpRequest
			// interceptor in `request-helper-functions.ts:1147`). The two must
			// land in separate `nodeResults` entries; tools whose HTTP traffic
			// gets folded into the Agent's ledger would mask real bugs.
			it('splits the ledger: model turns to the Agent root, tool HTTP to the tool node', async () => {
				const innerMockHandler = jest.fn().mockResolvedValue({
					body: { content: 'tool result' },
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});
				createLlmMockHandlerMock.mockReturnValue(innerMockHandler);

				mockProcessRunExecutionData.mockImplementation(async () => {
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

					// Tool HTTP — `evalLlmMockHandler` is invoked from
					// `request-helper-functions.ts` with the tool node's
					// identity. The SUT passes `additionalData` as the first
					// positional argument to the `WorkflowExecute` constructor
					// (see `runWorkflow()` in `execution.service.ts`). If that
					// contract ever changes, the explicit guard below fails
					// loudly with an actionable message instead of silently
					// reading the wrong argument slot.
					const wfExecuteCtor = jest.mocked(
						(await import('n8n-core')).WorkflowExecute,
					) as unknown as jest.Mock;
					const additionalData = wfExecuteCtor.mock.calls[0][0] as {
						evalLlmMockHandler?: (req: unknown, node: unknown) => Promise<unknown>;
					};
					if (!additionalData?.evalLlmMockHandler) {
						throw new Error(
							'WorkflowExecute(additionalData, ...) contract changed — ' +
								'arg 0 no longer carries evalLlmMockHandler. Update the ledger-split test.',
						);
					}
					await additionalData.evalLlmMockHandler(
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
				// checkNodeConfig() pre-marks any node with a config-issue as
				// `executionMode: 'real'` BEFORE runWorkflow runs. If a wire-
				// server turn later arrives for that node, the turn IS mocked
				// and should be classified as such — 'real' must not stick.
				// Reproduce by making the node's config check fail.
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

				mockProcessRunExecutionData.mockImplementation(async () => {
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

	// ── buildResult behavior ─────────────────────────────────────────

	describe('buildResult (via execution)', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
		});

		it('returns success=true when no errors in run data', async () => {
			mockProcessRunExecutionData.mockResolvedValue(
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
			mockProcessRunExecutionData.mockResolvedValue(
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
			mockProcessRunExecutionData.mockResolvedValue(
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
			mockProcessRunExecutionData.mockResolvedValue(
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
			mockProcessRunExecutionData.mockResolvedValue(
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

		it('captures output limited to MAX_OUTPUT_ITEMS_PER_NODE and reports full outputCount', async () => {
			const items = Array.from({ length: 15 }, (_, i) => ({ json: { idx: i } }));
			mockProcessRunExecutionData.mockResolvedValue(
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

			expect(result.nodeResults['HTTP Request'].output).toHaveLength(10);
			expect(result.nodeResults['HTTP Request'].outputCount).toBe(15);
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

		it('does not create pin data when triggerContent is empty', async () => {
			const hints = makeEmptyHints();
			hints.triggerContent = {};
			generateMockHintsMock.mockResolvedValue(hints);

			mockProcessRunExecutionData.mockResolvedValue(makeIRun());

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
