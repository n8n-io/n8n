import { describe, expect, test } from 'vitest';
import type { InstanceAiMessage, InstanceAiThreadStatusResponse } from '@n8n/api-types';
import {
	isOrchestratorLive,
	resolveActiveRunId,
	shouldRearmRunAfterConfirm,
	syncLiveRunFromStatus,
} from '../instanceAi.liveRunState';

function assistantMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		runId: 'run-a',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('instanceAi.liveRunState', () => {
	describe('isOrchestratorLive', () => {
		test('is true when suspended', () => {
			expect(isOrchestratorLive({ hasActiveRun: false, isSuspended: true })).toBe(true);
		});

		test('is false when idle', () => {
			expect(isOrchestratorLive({ hasActiveRun: false, isSuspended: false })).toBe(false);
		});
	});

	describe('resolveActiveRunId', () => {
		test('prefers confirmRunId over apiRunId and messages', () => {
			const messages = [assistantMessage({ runId: 'run-msg' })];
			expect(
				resolveActiveRunId({
					confirmRunId: 'run-confirm',
					apiRunId: 'run-api',
					messages,
				}),
			).toBe('run-confirm');
		});

		test('prefers apiRunId over message inference', () => {
			const messages = [assistantMessage({ runIds: ['run-a', 'run-b'] })];
			expect(
				resolveActiveRunId({
					apiRunId: 'run-api',
					messages,
				}),
			).toBe('run-api');
		});

		test('uses latest runIds entry from last assistant', () => {
			const messages = [assistantMessage({ runIds: ['run-a', 'run-b'] })];
			expect(resolveActiveRunId({ messages })).toBe('run-b');
		});

		test('finds run id from matching confirmation in agent tree', () => {
			const messages = [
				assistantMessage({
					runId: 'run-live',
					runIds: ['run-live'],
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [
							{
								toolCallId: 'tc-1',
								toolName: 'workflows',
								args: {},
								isLoading: true,
								confirmation: { requestId: 'req-1', severity: 'info', message: 'Run?' },
							},
						],
						children: [],
						timeline: [],
					},
				}),
			];

			expect(resolveActiveRunId({ messages, requestId: 'req-1' })).toBe('run-live');
		});
	});

	describe('syncLiveRunFromStatus', () => {
		test('sets isStreaming and returns run id for suspended status', () => {
			const messages = [assistantMessage({ runIds: ['run-a', 'run-b'], isStreaming: false })];
			const status: InstanceAiThreadStatusResponse = {
				hasActiveRun: false,
				isSuspended: true,
				runId: 'run-authoritative',
				backgroundTasks: [],
			};

			const runId = syncLiveRunFromStatus(status, messages);

			expect(runId).toBe('run-authoritative');
			expect(messages[0].isStreaming).toBe(true);
		});

		test('returns null when orchestrator is idle', () => {
			const messages = [assistantMessage()];
			const status: InstanceAiThreadStatusResponse = {
				hasActiveRun: false,
				isSuspended: false,
				backgroundTasks: [],
			};

			expect(syncLiveRunFromStatus(status, messages)).toBeNull();
		});
	});

	describe('shouldRearmRunAfterConfirm', () => {
		test('re-arms on approval', () => {
			expect(shouldRearmRunAfterConfirm({ kind: 'approval', approved: true })).toBe(true);
		});

		test('does not re-arm on deny', () => {
			expect(shouldRearmRunAfterConfirm({ kind: 'approval', approved: false })).toBe(false);
		});

		test('re-arms on resume-capable confirm kinds', () => {
			expect(
				shouldRearmRunAfterConfirm({
					kind: 'credentialSelection',
					credentials: { slackApi: 'cred-1' },
				}),
			).toBe(true);
			expect(
				shouldRearmRunAfterConfirm({
					kind: 'domainAccessApprove',
					domainAccessAction: 'allow_once',
				}),
			).toBe(true);
			expect(
				shouldRearmRunAfterConfirm({
					kind: 'resourceDecision',
					resourceDecision: 'allowOnce',
				}),
			).toBe(true);
			expect(
				shouldRearmRunAfterConfirm({
					kind: 'questions',
					answers: [{ questionId: 'q-1', selectedOptions: ['a'] }],
				}),
			).toBe(true);
			expect(shouldRearmRunAfterConfirm({ kind: 'setupWorkflowApply' })).toBe(true);
			expect(
				shouldRearmRunAfterConfirm({
					kind: 'setupWorkflowTestTrigger',
					testTriggerNode: 'Trigger',
				}),
			).toBe(true);
		});

		test('does not re-arm on terminal confirm kinds', () => {
			expect(shouldRearmRunAfterConfirm({ kind: 'domainAccessDeny' })).toBe(false);
			expect(shouldRearmRunAfterConfirm({ kind: 'planDeny' })).toBe(false);
		});
	});
});
