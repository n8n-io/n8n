// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { describe, expect, it } from 'vitest';

import {
	classifyConfirmation,
	pendingPromptsFromSnapshot,
	promptFromLocalRequest,
} from './prompt-classification';
import type {
	InstanceAiAgentNode,
	InstanceAiConfirmation,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '../../shared/types';

const CONTEXT = { toolCallId: 'tool-1', runId: 'run-1' };

function makeConfirmation(overrides: Partial<InstanceAiConfirmation> = {}): InstanceAiConfirmation {
	return {
		requestId: 'req-1',
		severity: 'warning',
		message: 'Allow the thing?',
		...overrides,
	};
}

describe('classifyConfirmation', () => {
	it('classifies a plain approval (no inputType) and carries the bookkeeping fields', () => {
		const prompt = classifyConfirmation('t1', makeConfirmation(), CONTEXT);

		expect(prompt).toMatchObject({
			id: 'instance:req-1',
			source: 'instance',
			kind: 'approval',
			threadId: 't1',
			requestId: 'req-1',
			toolCallId: 'tool-1',
			runId: 'run-1',
			severity: 'warning',
			message: 'Allow the thing?',
		});
	});

	it('returns null for an expired confirmation', () => {
		expect(classifyConfirmation('t1', makeConfirmation({ expired: true }), CONTEXT)).toBeNull();
	});

	it.each([
		['continue', makeConfirmation({ inputType: 'continue' })],
		['external', makeConfirmation({ inputType: 'questions' })],
		['external', makeConfirmation({ inputType: 'plan-review' })],
		['external', makeConfirmation({ inputType: 'text' })],
	] as const)('classifies inputType-driven kind %s', (kind, confirmation) => {
		expect(classifyConfirmation('t1', confirmation, CONTEXT)?.kind).toBe(kind);
	});

	it('classifies a resource decision and copies its details', () => {
		const prompt = classifyConfirmation(
			't1',
			makeConfirmation({
				inputType: 'resource-decision',
				resourceDecision: {
					toolGroup: 'filesystemWrite',
					resource: '/tmp/ok.txt',
					description: 'Write file',
					options: ['denyOnce', 'allowOnce'],
				},
			}),
			CONTEXT,
		);

		expect(prompt?.kind).toBe('resourceDecision');
		expect(prompt?.resourceDecision).toEqual({
			resource: '/tmp/ok.txt',
			description: 'Write file',
			options: ['denyOnce', 'allowOnce'],
		});
	});

	it('falls back to external when a resource-decision confirmation lacks its payload', () => {
		const prompt = classifyConfirmation(
			't1',
			makeConfirmation({ inputType: 'resource-decision' }),
			CONTEXT,
		);
		expect(prompt?.kind).toBe('external');
	});

	it('classifies domain access and web search by presence, regardless of inputType', () => {
		const domain = classifyConfirmation(
			't1',
			makeConfirmation({ domainAccess: { url: 'https://a.example/x', host: 'a.example' } }),
			CONTEXT,
		);
		expect(domain?.kind).toBe('domainAccess');
		expect(domain?.domainAccess).toEqual({ url: 'https://a.example/x', host: 'a.example' });

		const search = classifyConfirmation(
			't1',
			makeConfirmation({ webSearch: { query: 'n8n release notes' } }),
			CONTEXT,
		);
		expect(search?.kind).toBe('domainAccess');
		expect(search?.webSearch).toEqual({ query: 'n8n release notes' });
	});

	it('rich editor flows win over other markers (setup/credentials are external)', () => {
		const prompt = classifyConfirmation(
			't1',
			makeConfirmation({
				inputType: 'approval',
				credentialRequests: [
					{ credentialType: 'slackApi', reason: 'post messages', existingCredentials: [] },
				],
			}),
			CONTEXT,
		);
		expect(prompt?.kind).toBe('external');
	});
});

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tool-1',
		toolName: 'computer_use',
		args: {},
		isLoading: true,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'a1',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'm1',
		role: 'assistant',
		createdAt: '2026-06-11T00:00:00Z',
		content: '',
		reasoning: '',
		isStreaming: true,
		...overrides,
	};
}

describe('pendingPromptsFromSnapshot', () => {
	it('collects pending confirmations from nested agent trees with the latest runId', () => {
		const message = makeMessage({
			runIds: ['run-1', 'run-2'],
			agentTree: makeAgentNode({
				toolCalls: [makeToolCall({ confirmation: makeConfirmation() })],
				children: [
					makeAgentNode({
						agentId: 'a2',
						toolCalls: [
							makeToolCall({
								toolCallId: 'tool-2',
								confirmation: makeConfirmation({ requestId: 'req-2' }),
							}),
						],
					}),
				],
			}),
		});

		const prompts = pendingPromptsFromSnapshot('t1', [message]);

		expect(prompts.map((prompt) => prompt.requestId)).toEqual(['req-1', 'req-2']);
		expect(prompts.every((prompt) => prompt.runId === 'run-2')).toBe(true);
	});

	it('skips resolved, expired, and completed tool calls', () => {
		const message = makeMessage({
			runId: 'run-1',
			agentTree: makeAgentNode({
				toolCalls: [
					makeToolCall({ confirmation: makeConfirmation(), confirmationStatus: 'approved' }),
					makeToolCall({ confirmation: makeConfirmation(), confirmationStatus: 'denied' }),
					makeToolCall({ confirmation: makeConfirmation({ expired: true }) }),
					makeToolCall({ confirmation: makeConfirmation(), isLoading: false }),
					makeToolCall({}),
					makeToolCall({
						toolCallId: 'tool-9',
						confirmation: makeConfirmation({ requestId: 'req-9' }),
						confirmationStatus: 'pending',
					}),
				],
			}),
		});

		const prompts = pendingPromptsFromSnapshot('t1', [message]);

		expect(prompts).toHaveLength(1);
		expect(prompts[0]).toMatchObject({ requestId: 'req-9', toolCallId: 'tool-9', runId: 'run-1' });
	});

	it('ignores messages without an agent tree', () => {
		expect(pendingPromptsFromSnapshot('t1', [makeMessage({ role: 'user' })])).toEqual([]);
	});
});

describe('promptFromLocalRequest', () => {
	it('maps the main-process request to a warning-severity resource prompt', () => {
		const prompt = promptFromLocalRequest({
			id: 'p1',
			resource: {
				toolGroup: 'shell',
				resource: 'rm -rf ./build',
				description: 'Run shell command',
			},
			options: ['denyOnce', 'allowOnce', 'allowForSession'],
		});

		expect(prompt).toEqual({
			id: 'local:p1',
			source: 'local',
			kind: 'resourceDecision',
			localId: 'p1',
			severity: 'warning',
			message: 'Run shell command',
			resourceDecision: {
				resource: 'rm -rf ./build',
				description: 'Run shell command',
				options: ['denyOnce', 'allowOnce', 'allowForSession'],
			},
		});
	});
});
