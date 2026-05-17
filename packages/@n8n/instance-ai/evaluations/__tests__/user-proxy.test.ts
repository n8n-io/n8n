// ---------------------------------------------------------------------------
// Tests for UserProxyLlm — structured-output dispatch with deterministic shortcuts.
//
// The proxy delegates LLM-driven decisions to an injectable agent
// (UserProxyAgent). Tests pass a programmable fake agent to assert routing,
// deterministic shortcuts, repeat detection, and budget enforcement.
// ---------------------------------------------------------------------------

import type { CapturedEvent } from '../types';
import { UserProxyLlm } from '../utils/user-proxy';
import type { UserProxyAgent } from '../utils/user-proxy/agent';
import type { Decision } from '../utils/user-proxy/tools';

// ---------------------------------------------------------------------------
// FakeAgent — programmable agent for tests
// ---------------------------------------------------------------------------

class FakeAgent implements UserProxyAgent {
	readonly prompts: string[] = [];
	private queue: Array<Decision | undefined | Error> = [];

	enqueue(...decisions: Array<Decision | undefined | Error>): void {
		this.queue.push(...decisions);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async decide(userPrompt: string): Promise<Decision | undefined> {
		this.prompts.push(userPrompt);
		const next = this.queue.shift();
		if (next instanceof Error) throw next;
		return next;
	}

	get callCount(): number {
		return this.prompts.length;
	}
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

function questionEvent(
	requestId: string,
	questions: Array<{
		id: string;
		question: string;
		type: 'single' | 'multi' | 'text';
		options?: string[];
	}>,
): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'ask-user',
				args: {},
				severity: 'info',
				message: 'Please answer',
				inputType: 'questions',
				questions,
			},
		},
	};
}

function planReviewEvent(requestId: string): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'plan',
				args: {},
				severity: 'info',
				message: 'Approve plan?',
				inputType: 'plan-review',
			},
		},
	};
}

function setupWizardEvent(requestId: string): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'setup-workflow',
				args: {},
				severity: 'info',
				message: 'Set up the workflow',
				setupRequests: [{ nodeId: 'n1', nodeName: 'Send Slack Message', parameterRequests: [] }],
			},
		},
	};
}

function credentialEvent(requestId: string): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'credential-setup',
				args: {},
				severity: 'info',
				message: 'Set up credentials',
				credentialRequests: [{ type: 'slackApi' }],
			},
		},
	};
}

function domainAccessEvent(requestId: string): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'web-research',
				args: {},
				severity: 'info',
				message: 'Allow domain?',
				domainAccess: { url: 'https://docs.example.com', host: 'docs.example.com' },
			},
		},
	};
}

function resourceDecisionEvent(requestId: string, options: string[]): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'gateway-resource',
				args: {},
				severity: 'info',
				message: 'Pick option',
				resourceDecision: { options },
			},
		},
	};
}

function textInputEvent(requestId: string): CapturedEvent {
	return {
		timestamp: 100,
		type: 'confirmation-request',
		data: {
			type: 'confirmation-request',
			payload: {
				requestId,
				toolCallId: 'tc-x',
				toolName: 'pause-for-user',
				args: {},
				severity: 'info',
				message: 'Please respond',
				inputType: 'text',
			},
		},
	};
}

// ---------------------------------------------------------------------------
// respondToConfirmation
// ---------------------------------------------------------------------------

describe('UserProxyLlm.respondToConfirmation', () => {
	it('answers questions when the agent returns answer_questions', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'answer_questions',
			answers: [{ questionId: 'q1', selectedOptions: ['#general'] }],
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'post to #general' }],
			agent,
		});

		const event = questionEvent('req-1', [
			{ id: 'q1', question: 'Which channel?', type: 'single', options: ['#general'] },
		]);
		const response = await proxy.respondToConfirmation(event);

		expect(response.kind).toBe('questions');
		if (response.kind === 'questions') {
			expect(response.answers).toEqual([{ questionId: 'q1', selectedOptions: ['#general'] }]);
		}
		expect(agent.callCount).toBe(1);
	});

	it('returns approval with userInput when the agent picks approve_or_reject', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'approve_or_reject',
			approved: true,
			userInput: 'looks good',
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'approve' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-pr'));
		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(true);
			expect(response.userInput).toBe('looks good');
		}
	});

	it('returns approval with no userInput when the agent omits it', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'approve_or_reject', approved: true });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'approve' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-pr'));
		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(true);
			expect(response.userInput).toBeUndefined();
		}
	});

	it('rejects a plan when the agent returns approve_or_reject with approved=false', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'approve_or_reject',
			approved: false,
			userInput: 'I wanted email, not data table',
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'send an email' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-pr'));
		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
			expect(response.userInput).toContain('email');
		}
	});

	it('encodes apply_setup_wizard into setupWorkflowApply with nodeParameters', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({
				'Send Slack Message': { channelId: 'general', text: 'hi' },
			}),
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'post hi to #general' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(setupWizardEvent('req-sw'));
		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeParameters).toEqual({
				'Send Slack Message': { channelId: 'general', text: 'hi' },
			});
			expect(response.nodeCredentials).toBeUndefined();
		}
	});

	it('handles credential events deterministically without invoking the agent', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(credentialEvent('req-cred'));
		expect(response.kind).toBe('credentialSelection');
		if (response.kind === 'credentialSelection') {
			expect(response.credentials).toEqual({});
		}
		expect(agent.callCount).toBe(0);
	});

	it('handles domain-access events deterministically with allow_all', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(domainAccessEvent('req-dom'));
		expect(response.kind).toBe('domainAccessApprove');
		if (response.kind === 'domainAccessApprove') {
			expect(response.domainAccessAction).toBe('allow_all');
		}
		expect(agent.callCount).toBe(0);
	});

	it('handles resource-decision events deterministically with first allow option', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			resourceDecisionEvent('req-res', ['deny', 'allowOnce', 'allowAll']),
		);
		expect(response.kind).toBe('resourceDecision');
		if (response.kind === 'resourceDecision') {
			expect(response.resourceDecision).toBe('allowOnce');
		}
		expect(agent.callCount).toBe(0);
	});

	it('routes setup-wizard events to the agent even when they include credentialRequests', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({ Node1: { p1: 'v1' } }),
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const event: CapturedEvent = {
			timestamp: 100,
			type: 'confirmation-request',
			data: {
				type: 'confirmation-request',
				payload: {
					requestId: 'req-mixed',
					setupRequests: [{ nodeId: 'n1', nodeName: 'Node1' }],
					credentialRequests: [{ type: 'slackApi' }],
				},
			},
		};

		const response = await proxy.respondToConfirmation(event);
		expect(response.kind).toBe('setupWorkflowApply');
		expect(agent.callCount).toBe(1);
	});

	it('falls back to the permissive payload when the agent returns undefined', async () => {
		const agent = new FakeAgent();
		agent.enqueue(undefined);
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-fail'));
		// buildAutoApprovePayload returns kind: 'approval' approved: true for plan-review
		expect(response.kind).toBe('approval');
	});

	it('falls back to the permissive payload when the agent picks a between-run action', async () => {
		const agent = new FakeAgent();
		// declare_done is a between-run action, invalid as a confirmation response.
		agent.enqueue({ action: 'declare_done' });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-mis'));
		expect(response.kind).toBe('approval');
	});

	it('returns the permissive payload on a repeat requestId without consulting the agent', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'answer_questions',
			answers: [{ questionId: 'q1', selectedOptions: ['#general'] }],
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const event = questionEvent('req-repeat', [
			{ id: 'q1', question: 'Q?', type: 'single', options: ['#general'] },
		]);
		await proxy.respondToConfirmation(event);
		const second = await proxy.respondToConfirmation(event);

		// Repeat falls back to buildAutoApprovePayload; for questions inputType
		// that means kind: 'questions' with empty answers.
		expect(second.kind).toBe('questions');
		if (second.kind === 'questions') expect(second.answers).toEqual([]);
		expect(agent.callCount).toBe(1); // only first call invoked the agent
	});

	it('handles text input by routing to the agent and encoding as approval', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'approve_or_reject',
			approved: true,
			userInput: 'continue',
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(textInputEvent('req-txt'));
		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.userInput).toBe('continue');
		}
	});
});

// ---------------------------------------------------------------------------
// decideFollowUp
// ---------------------------------------------------------------------------

describe('UserProxyLlm.decideFollowUp', () => {
	it('returns done immediately when messageBudget is 0 without invoking the agent', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'do it' }],
			messageBudget: 0,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('done');
		expect(agent.callCount).toBe(0);
	});

	it('sends the next reference user turn verbatim without invoking the agent', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'build the workflow' },
				{ role: 'assistant', text: 'done!' },
				{ role: 'user', text: 'now also log to sheets' },
			],
			messageBudget: 5,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('followUp');
		if (decision.kind === 'followUp') {
			expect(decision.message).toBe('now also log to sheets');
		}
		expect(proxy.getMessagesSent()).toBe(1);
		expect(agent.callCount).toBe(0);
	});

	it('falls back to the agent once the reference is exhausted', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'send_follow_up_message', message: 'one more thing' });
		const proxy = new UserProxyLlm({
			// Only one user turn — opening drains it.
			conversation: [{ role: 'user', text: 'build it' }],
			messageBudget: 5,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('followUp');
		if (decision.kind === 'followUp') {
			expect(decision.message).toBe('one more thing');
		}
		expect(agent.callCount).toBe(1);
	});

	it('treats declare_done as done', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'declare_done' });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'all set' }],
			messageBudget: 3,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('done');
	});

	it('returns done when the agent returns undefined', async () => {
		const agent = new FakeAgent();
		agent.enqueue(undefined);
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			messageBudget: 3,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('done');
	});

	it('returns done when the agent picks a confirmation-only action', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'answer_questions',
			answers: [{ questionId: 'q1', selectedOptions: [] }],
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			messageBudget: 3,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('done');
	});

	it('treats an empty follow-up message as done without consuming budget', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'send_follow_up_message', message: '   ' });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			messageBudget: 3,
			agent,
		});

		const decision = await proxy.decideFollowUp();
		expect(decision.kind).toBe('done');
		expect(proxy.getMessagesSent()).toBe(0);
	});

	it('caps follow-ups at messageBudget across multiple invocations', async () => {
		const agent = new FakeAgent();
		agent.enqueue(
			{ action: 'send_follow_up_message', message: 'msg1' },
			{ action: 'send_follow_up_message', message: 'msg2' },
		);
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			messageBudget: 2,
			agent,
		});

		expect((await proxy.decideFollowUp()).kind).toBe('followUp');
		expect((await proxy.decideFollowUp()).kind).toBe('followUp');
		const third = await proxy.decideFollowUp();
		expect(third.kind).toBe('done');
		expect(proxy.getMessagesSent()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// ingestEvents
// ---------------------------------------------------------------------------

describe('UserProxyLlm.ingestEvents', () => {
	it('accumulates text-delta payloads into the rolling transcript', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'declare_done' });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'open a ticket' }],
			messageBudget: 3,
			agent,
		});

		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'text-delta',
				data: { type: 'text-delta', payload: { text: 'Hello ' } },
			},
			{
				timestamp: 3,
				type: 'text-delta',
				data: { type: 'text-delta', payload: { text: 'world' } },
			},
			{ timestamp: 4, type: 'run-finish', data: { type: 'run-finish' } },
			{ timestamp: 5, type: 'run-start', data: { type: 'run-start' } },
			{ timestamp: 6, type: 'text-delta', data: { type: 'text-delta', text: 'second' } },
			{ timestamp: 7, type: 'run-finish', data: { type: 'run-finish' } },
		];
		proxy.ingestEvents(events);

		await proxy.decideFollowUp();
		const lastPrompt = agent.prompts[agent.prompts.length - 1];
		expect(lastPrompt).toContain('Hello world');
		expect(lastPrompt).toContain('second');
	});

	it('is idempotent — re-ingesting the same array does not duplicate transcript entries', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'declare_done' });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			messageBudget: 3,
			agent,
		});

		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'text-delta',
				data: { type: 'text-delta', payload: { text: 'echoed' } },
			},
			{ timestamp: 3, type: 'run-finish', data: { type: 'run-finish' } },
		];
		proxy.ingestEvents(events);
		proxy.ingestEvents(events); // second call should be a no-op
		proxy.ingestEvents(events); // and a third

		await proxy.decideFollowUp();
		const prompt = agent.prompts[0];
		// 'echoed' should appear once in the transcript, not three times.
		expect((prompt.match(/echoed/g) ?? []).length).toBe(1);
	});
});
