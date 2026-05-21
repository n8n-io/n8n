import { mock } from 'jest-mock-extended';
import type { User } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import type {
	INode,
	IRunExecutionData,
	IRun,
	IWorkflowBase,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { NodeTypes } from '@/node-types';
import type { PostHogClient } from '@/posthog';

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
	assertUnpinCompatibility: jest.fn(),
	generateMockHints: jest.fn(),
	identifyNodesForHints: jest.fn(),
	identifyNodesForPinData: jest.fn(),
}));
const mockWireServerStart = jest.fn();
const mockWireServerStop = jest.fn();
jest.mock('../llm-wire-server', () => ({
	LlmWireServer: jest.fn().mockImplementation(() => ({
		start: mockWireServerStart,
		stop: mockWireServerStop,
		url: 'http://127.0.0.1:54321',
	})),
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
import {
	assertUnpinCompatibility,
	generateMockHints,
	identifyNodesForHints,
	identifyNodesForPinData,
} from '../workflow-analysis';
import { createLlmMockHandler } from '../mock-handler';
import type { MockHints } from '../workflow-analysis';
import { UserError } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateMockHintsMock = jest.mocked(generateMockHints);
const identifyNodesForHintsMock = jest.mocked(identifyNodesForHints);
const identifyNodesForPinDataMock = jest.mocked(identifyNodesForPinData);
const assertUnpinCompatibilityMock = jest.mocked(assertUnpinCompatibility);
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

		// Default mock returns — happy path
		identifyNodesForHintsMock.mockReturnValue([]);
		identifyNodesForPinDataMock.mockReturnValue([]);
		assertUnpinCompatibilityMock.mockImplementation(() => undefined);
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

	// ── unpinNodes handling ──────────────────────────────────────────

	describe('unpinNodes', () => {
		beforeEach(() => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(makeWorkflowEntity() as never);
		});

		it('calls assertUnpinCompatibility with an empty list when unpinNodes is omitted', async () => {
			await service.executeWithLlmMock('wf-1', makeUser());

			expect(assertUnpinCompatibilityMock).toHaveBeenCalledWith(expect.anything(), []);
		});

		it('omits the exclusion set when unpinNodes is empty', async () => {
			await service.executeWithLlmMock('wf-1', makeUser(), { unpinNodes: [] });

			expect(identifyNodesForPinDataMock).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'wf-1' }),
				undefined,
			);
		});

		// PostHog kill-switch: non-empty unpinNodes only runs when the flag
		// resolves to ON. Flag OFF refuses the request before any other work
		// so vendor traffic can never reach the real provider.
		describe('PostHog kill-switch (flag off)', () => {
			beforeEach(() => {
				postHogClient.getFeatureFlags.mockResolvedValue({
					'085_eval_vendor_sdk_interception': false,
				});
			});

			it('runs the compatibility guard first, then refuses with the gate error when the guard passes', async () => {
				const result = await service.executeWithLlmMock('wf-1', makeUser(), {
					unpinNodes: ['Agent'],
				});

				expect(result.success).toBe(false);
				expect(result.errors).toEqual([expect.stringContaining('currently disabled')]);
				// Guard runs first so the user gets actionable diagnostics when their
				// workflow has a permanent compatibility issue. When the guard passes,
				// the gate fires with the generic "currently disabled" message.
				expect(assertUnpinCompatibilityMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					['Agent'],
				);
				expect(generateMockHintsMock).not.toHaveBeenCalled();
				expect(mockProcessRunExecutionData).not.toHaveBeenCalled();
			});

			it("surfaces the guard's error when the workflow has a permanent compatibility issue", async () => {
				assertUnpinCompatibilityMock.mockImplementation(() => {
					throw new UserError(
						'Cannot unpin AI root nodes — protocol-binary sub-nodes ' +
							'(cannot be intercepted via HTTP): "Mem" (memoryPostgresChat) → "Agent"',
					);
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser(), {
					unpinNodes: ['Agent'],
				});

				expect(result.success).toBe(false);
				// Guard's protocol-binary message wins over the generic gate message —
				// the user needs to fix the workflow regardless of when the feature ships.
				expect(result.errors).toEqual([expect.stringContaining('memoryPostgresChat')]);
				expect(result.errors[0]).not.toContain('currently disabled');
				// Guard refused before the PostHog check fires.
				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
			});

			it('still runs the normal pinned path when unpinNodes is omitted (no flag check)', async () => {
				await service.executeWithLlmMock('wf-1', makeUser());

				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
				expect(generateMockHintsMock).toHaveBeenCalled();
				expect(mockProcessRunExecutionData).toHaveBeenCalled();
			});
		});

		// Flag ON (or unset — fail-open default): non-empty unpinNodes proceeds
		// into the rewrite path and boots the wire server.
		describe('PostHog kill-switch (flag on)', () => {
			it('forwards unpinNodes to assertUnpinCompatibility', async () => {
				await service.executeWithLlmMock('wf-1', makeUser(), { unpinNodes: ['Agent'] });

				expect(assertUnpinCompatibilityMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					['Agent'],
				);
			});

			it('forwards the exclusion set to identifyNodesForPinData', async () => {
				await service.executeWithLlmMock('wf-1', makeUser(), { unpinNodes: ['Agent'] });

				expect(identifyNodesForPinDataMock).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'wf-1' }),
					new Set(['Agent']),
				);
			});

			it('boots and tears down the wire server around the workflow run', async () => {
				await service.executeWithLlmMock('wf-1', makeUser(), { unpinNodes: ['Agent'] });

				expect(mockWireServerStart).toHaveBeenCalledTimes(1);
				expect(mockProcessRunExecutionData).toHaveBeenCalledTimes(1);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
				expect(mockRestoreNoProxy).toHaveBeenCalledTimes(1);
			});

			it('tears down the wire server even if the workflow run throws', async () => {
				mockProcessRunExecutionData.mockRejectedValue(new Error('explode'));

				const result = await service.executeWithLlmMock('wf-1', makeUser(), {
					unpinNodes: ['Agent'],
				});

				expect(result.success).toBe(false);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
				expect(mockRestoreNoProxy).toHaveBeenCalledTimes(1);
			});

			it('does not boot the wire server when unpinNodes is empty', async () => {
				await service.executeWithLlmMock('wf-1', makeUser(), { unpinNodes: [] });

				expect(mockWireServerStart).not.toHaveBeenCalled();
				expect(mockWireServerStop).not.toHaveBeenCalled();
			});

			it('fails closed when PostHog rejects (treats flag as off and refuses the request)', async () => {
				postHogClient.getFeatureFlags.mockRejectedValue(new Error('PostHog down'));

				const result = await service.executeWithLlmMock('wf-1', makeUser(), {
					unpinNodes: ['Agent'],
				});

				expect(result.success).toBe(false);
				expect(result.errors).toEqual([expect.stringContaining('currently disabled')]);
				expect(mockWireServerStart).not.toHaveBeenCalled();
			});

			it('tears down the wire server when NO_PROXY patching throws after boot', async () => {
				const proxyLoopback = require('../proxy-loopback');
				proxyLoopback.patchNoProxyForLoopback.mockImplementationOnce(() => {
					throw new Error('env mutation blocked');
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser(), {
					unpinNodes: ['Agent'],
				});

				expect(result.success).toBe(false);
				expect(result.errors).toEqual([expect.stringContaining('env mutation blocked')]);
				expect(mockWireServerStart).toHaveBeenCalledTimes(1);
				expect(mockWireServerStop).toHaveBeenCalledTimes(1);
			});

			it('returns an error result and skips workflow execution when the compatibility guard refuses', async () => {
				assertUnpinCompatibilityMock.mockImplementation(() => {
					throw new (require('n8n-workflow').UserError)(
						'Cannot unpin "Agent" — incompatible memory backend',
					);
				});

				const result = await service.executeWithLlmMock('wf-1', makeUser(), {
					unpinNodes: ['Agent'],
				});

				expect(result.success).toBe(false);
				expect(result.errors).toEqual([expect.stringContaining('Cannot unpin "Agent"')]);
				expect(mockProcessRunExecutionData).not.toHaveBeenCalled();
				// Server was never started — guard runs before boot.
				expect(mockWireServerStart).not.toHaveBeenCalled();
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
