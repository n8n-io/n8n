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
import {
	confirmationDecisionSchema,
	userTurnDecisionSchema,
	type Decision,
	type ProxyDecisionMode,
} from '../utils/user-proxy/tools';

// ---------------------------------------------------------------------------
// FakeAgent — programmable agent for tests
// ---------------------------------------------------------------------------

class FakeAgent implements UserProxyAgent {
	readonly prompts: string[] = [];
	readonly modes: ProxyDecisionMode[] = [];
	private queue: Array<Decision | undefined | Error> = [];

	enqueue(...decisions: Array<Decision | undefined | Error>): void {
		this.queue.push(...decisions);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async decide(userPrompt: string, mode: ProxyDecisionMode): Promise<Decision | undefined> {
		this.prompts.push(userPrompt);
		this.modes.push(mode);
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
				toolName: 'create-tasks',
				args: {},
				severity: 'info',
				message: 'Approve plan?',
				inputType: 'plan-review',
			},
		},
	};
}

function setupWizardEvent(
	requestId: string,
	setupRequests: Array<Record<string, unknown>> = [
		{
			nodeId: 'n1',
			nodeName: 'Send Slack Message',
			editableParameters: [{ name: 'channelId' }],
		},
	],
): CapturedEvent {
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
				setupRequests,
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

/** Real `credentials.tool.ts` shape (`credentialType` + `existingCredentials`),
 *  needed once the payload is actually parsed for `choose_credential_setup_option`. */
function credentialEventWithRequests(
	requestId: string,
	requests: Array<{
		credentialType: string;
		existingCredentials?: Array<{ id: string; name: string }>;
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
				toolName: 'credential-setup',
				args: {},
				severity: 'info',
				message: 'Set up credentials',
				credentialRequests: requests.map((r) => ({
					credentialType: r.credentialType,
					existingCredentials: r.existingCredentials ?? [],
				})),
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
		expect(agent.modes[0]).toBe('confirmation');
	});

	it('routes ask-user questions to the agent even when scripted user turns remain (no deterministic shortcut)', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'answer_questions',
			answers: [
				{ questionId: 'cities', selectedOptions: [], customText: 'London, New York, Tokyo' },
				{ questionId: 'destination', selectedOptions: ['Slack'] },
			],
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'I need weather alerts.' },
				{ role: 'assistant', text: 'Which cities and where should alerts go?' },
				{
					role: 'user',
					text: 'London, New York, Tokyo. Alert above 30C via Telegram chat -1001234567890.',
				},
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			questionEvent('req-scripted-q', [
				{ id: 'cities', question: 'Which cities?', type: 'text' },
				{
					id: 'destination',
					question: 'Where should alerts go?',
					type: 'single',
					options: ['Email', 'Slack', 'SMS'],
				},
			]),
		);

		expect(agent.callCount).toBe(1);
		expect(response.kind).toBe('questions');
		if (response.kind === 'questions') {
			expect(response.answers).toEqual([
				{ questionId: 'cities', selectedOptions: [], customText: 'London, New York, Tokyo' },
				{ questionId: 'destination', selectedOptions: ['Slack'] },
			]);
		}
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

	it('rejects plan review with remaining scripted details before consulting the agent', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Build an Airtable to Slack workflow.' },
				{ role: 'assistant', text: 'Which table and channel?' },
				{
					role: 'user',
					text: 'Use GET https://api.airtable.com/v0/app123abc/Tasks and Slack #daily-tasks.',
				},
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-scripted-plan'));

		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
			expect(response.userInput).toContain('Before I approve');
			expect(response.userInput).toContain('https://api.airtable.com/v0/app123abc/Tasks');
			expect(response.userInput).toContain('#daily-tasks');
		}
		expect(agent.callCount).toBe(0);
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

	it('normalizes a single setup node parameter map into nodeParameters', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({
				channelId: { __rl: true, mode: 'name', value: '#berlin-weather-rain' },
			}),
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'post rain alerts to #berlin-weather-rain' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw', [
				{
					nodeId: 'slack-rain',
					nodeName: 'Send Rain Alert',
					editableParameters: [{ name: 'channelId' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeParameters).toEqual({
				'Send Rain Alert': {
					channelId: { __rl: true, mode: 'name', value: '#berlin-weather-rain' },
				},
			});
		}
	});

	it('maps setup node id keys to setup node names', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({
				'slack-rain': { channelId: '#berlin-weather-rain' },
			}),
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'post rain alerts to #berlin-weather-rain' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw', [
				{
					nodeId: 'slack-rain',
					nodeName: 'Send Rain Alert',
					editableParameters: [{ name: 'channelId' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeParameters).toEqual({
				'Send Rain Alert': { channelId: '#berlin-weather-rain' },
			});
		}
	});

	it('rejects mixed valid and unknown setup node keys', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({
				'Send Rain Alert': { channelId: '#berlin-weather-rain' },
				UnknownNode: { channelId: '#other-channel' },
			}),
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'post rain alerts to #berlin-weather-rain' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw', [
				{
					nodeId: 'slack-rain',
					nodeName: 'Send Rain Alert',
					editableParameters: [{ name: 'channelId' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeParameters).toEqual({});
		}
	});

	it('rejects setup parameters that do not match the setup card', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({ __rl: true, mode: 'name' }),
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'post rain alerts to #berlin-weather-rain' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw', [
				{
					nodeId: 'slack-rain',
					nodeName: 'Send Rain Alert',
					editableParameters: [{ name: 'channelId' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeParameters).toEqual({});
		}
	});

	// -------------------------------------------------------------------------
	// TRUST-349 — setup-wizard credential slots (nodeCredentialsJson)
	// -------------------------------------------------------------------------

	it('fills both parameters and a credential slot on a mixed wizard card when engaged', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: JSON.stringify({ 'Post Standup Reminder': { channelId: 'general' } }),
			nodeCredentialsJson: JSON.stringify({ 'Post Standup Reminder': { slackApi: 'cred-team' } }),
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post a standup reminder to Slack every morning.' },
				{
					role: 'user',
					text: '[Set up the Slack credential now, using Team Slack, on the setup card.]',
				},
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw-mixed', [
				{
					nodeId: 'n1',
					nodeName: 'Post Standup Reminder',
					editableParameters: [{ name: 'channelId' }],
				},
				{
					nodeId: 'n1',
					nodeName: 'Post Standup Reminder',
					credentialType: 'slackApi',
					existingCredentials: [
						{ id: 'cred-personal', name: 'Personal Slack' },
						{ id: 'cred-team', name: 'Team Slack' },
					],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeParameters).toEqual({
				'Post Standup Reminder': { channelId: 'general' },
			});
			expect(response.nodeCredentials).toEqual({
				'Post Standup Reminder': { slackApi: 'cred-team' },
			});
		}
	});

	it('routes a credential-only wizard card to the agent when engaged, instead of auto-declining', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: '{}',
			nodeCredentialsJson: JSON.stringify({ 'Post To Slack': { slackApi: 'cred-team' } }),
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the Slack credential now, using Team Slack.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw-cred-only', [
				{
					nodeId: 'n1',
					nodeName: 'Post To Slack',
					credentialType: 'slackApi',
					existingCredentials: [{ id: 'cred-team', name: 'Team Slack' }],
				},
			]),
		);

		expect(agent.callCount).toBe(1);
		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeCredentials).toEqual({ 'Post To Slack': { slackApi: 'cred-team' } });
		}
	});

	it('still auto-declines a credential-only wizard card with no governing stage direction', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'Post to Slack every morning.' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw-cred-only-default', [
				{
					nodeId: 'n1',
					nodeName: 'Post To Slack',
					credentialType: 'slackApi',
					existingCredentials: [{ id: 'cred-team', name: 'Team Slack' }],
				},
			]),
		);

		expect(agent.callCount).toBe(0);
		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
		}
	});

	it('maps different credential types for two different nodes on the same wizard card', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: '{}',
			nodeCredentialsJson: JSON.stringify({
				'Get Notion Pages': { notionApi: 'cred-notion' },
				'Post To Slack': { slackApi: 'cred-team' },
			}),
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Summarize Notion pages to Slack.' },
				{ role: 'user', text: '[Set up both the Notion and Slack credentials now.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw-two-nodes', [
				{
					nodeId: 'n1',
					nodeName: 'Get Notion Pages',
					credentialType: 'notionApi',
					existingCredentials: [{ id: 'cred-notion', name: 'Notion' }],
				},
				{
					nodeId: 'n2',
					nodeName: 'Post To Slack',
					credentialType: 'slackApi',
					existingCredentials: [{ id: 'cred-team', name: 'Team Slack' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeCredentials).toEqual({
				'Get Notion Pages': { notionApi: 'cred-notion' },
				'Post To Slack': { slackApi: 'cred-team' },
			});
		}
	});

	it('drops a nodeCredentialsJson entry naming a node not on the setup card', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: '{}',
			nodeCredentialsJson: JSON.stringify({ 'Unknown Node': { slackApi: 'cred-team' } }),
		});
		const logger = {
			warn: vi.fn(),
			info: vi.fn(),
			verbose: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			isVerbose: false,
		};
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the Slack credential now.]' },
			],
			agent,
			logger,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw-unknown-node', [
				{
					nodeId: 'n1',
					nodeName: 'Post To Slack',
					credentialType: 'slackApi',
					existingCredentials: [{ id: 'cred-team', name: 'Team Slack' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeCredentials).toBeUndefined();
		}
		expect(logger.warn).toHaveBeenCalled();
	});

	it('drops a nodeCredentialsJson entry naming a credential id not in that node/type existingCredentials', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'apply_setup_wizard',
			nodeParametersJson: '{}',
			nodeCredentialsJson: JSON.stringify({ 'Post To Slack': { slackApi: 'cred-bogus' } }),
		});
		const logger = {
			warn: vi.fn(),
			info: vi.fn(),
			verbose: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			isVerbose: false,
		};
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the Slack credential now.]' },
			],
			agent,
			logger,
		});

		const response = await proxy.respondToConfirmation(
			setupWizardEvent('req-sw-bogus-id', [
				{
					nodeId: 'n1',
					nodeName: 'Post To Slack',
					credentialType: 'slackApi',
					existingCredentials: [{ id: 'cred-team', name: 'Team Slack' }],
				},
			]),
		);

		expect(response.kind).toBe('setupWorkflowApply');
		if (response.kind === 'setupWorkflowApply') {
			expect(response.nodeCredentials).toBeUndefined();
		}
		expect(logger.warn).toHaveBeenCalled();
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

	// -------------------------------------------------------------------------
	// TRUST-349 — credential-setup engagement (choose_credential_setup_option)
	// -------------------------------------------------------------------------

	it('still defers credentials deterministically when the script has an unrelated stage direction', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Build a Slack digest.' },
				{ role: 'user', text: '[Reject the plan unless it sorts descending by count.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(credentialEvent('req-cred-unrelated'));
		expect(response.kind).toBe('credentialSelection');
		if (response.kind === 'credentialSelection') {
			expect(response.credentials).toEqual({});
		}
		expect(agent.callCount).toBe(0);
	});

	it('routes credential setup to the agent when a stage direction asks the user to engage', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'choose_credential_setup_option', option: 'manual' });
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{
					role: 'user',
					text: '[When the credential setup card for Slack appears, set up the credential now using the existing Slack credential shown on the card.]',
				},
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-manual', [
				{ credentialType: 'slackApi', existingCredentials: [{ id: 'cred-1', name: 'My Slack' }] },
			]),
		);

		expect(agent.callCount).toBe(1);
		expect(response.kind).toBe('credentialSelection');
		if (response.kind === 'credentialSelection') {
			expect(response.credentials).toEqual({ slackApi: 'cred-1' });
		}
	});

	it('resolves manual selection by explicit credentialType among multiple requests', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'choose_credential_setup_option',
			option: 'manual',
			credentialType: 'notionApi',
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Summarize Notion pages to Slack.' },
				{ role: 'user', text: '[Connect the Notion credential shown on the card.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-multi', [
				{ credentialType: 'slackApi', existingCredentials: [{ id: 'cred-slack', name: 'Slack' }] },
				{
					credentialType: 'notionApi',
					existingCredentials: [{ id: 'cred-notion', name: 'Notion' }],
				},
			]),
		);

		expect(response.kind).toBe('credentialSelection');
		if (response.kind === 'credentialSelection') {
			expect(response.credentials).toEqual({ notionApi: 'cred-notion' });
		}
	});

	it('resolves manual selection to a specific credential by existingCredentialId when several match the same type', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'choose_credential_setup_option',
			option: 'manual',
			existingCredentialId: 'cred-team',
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the credential now, using the Team Slack one.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-disambiguate', [
				{
					credentialType: 'slackApi',
					existingCredentials: [
						{ id: 'cred-personal', name: 'Personal Slack' },
						{ id: 'cred-team', name: 'Team Slack' },
					],
				},
			]),
		);

		expect(response.kind).toBe('credentialSelection');
		if (response.kind === 'credentialSelection') {
			expect(response.credentials).toEqual({ slackApi: 'cred-team' });
		}
	});

	it('declines manual selection when existingCredentialId does not match any listed credential', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'choose_credential_setup_option',
			option: 'manual',
			existingCredentialId: 'cred-does-not-exist',
		});
		const logger = {
			warn: vi.fn(),
			info: vi.fn(),
			verbose: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			isVerbose: false,
		};
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the credential now.]' },
			],
			agent,
			logger,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-bad-id', [
				{
					credentialType: 'slackApi',
					existingCredentials: [
						{ id: 'cred-personal', name: 'Personal Slack' },
						{ id: 'cred-team', name: 'Team Slack' },
					],
				},
			]),
		);

		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
		}
		expect(logger.warn).toHaveBeenCalled();
	});

	it('declines manual selection when several candidates exist and no existingCredentialId disambiguates', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'choose_credential_setup_option', option: 'manual' });
		const logger = {
			warn: vi.fn(),
			info: vi.fn(),
			verbose: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			isVerbose: false,
		};
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the credential now.]' },
			],
			agent,
			logger,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-ambiguous', [
				{
					credentialType: 'slackApi',
					existingCredentials: [
						{ id: 'cred-personal', name: 'Personal Slack' },
						{ id: 'cred-team', name: 'Team Slack' },
					],
				},
			]),
		);

		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
		}
		expect(logger.warn).toHaveBeenCalled();
	});

	it('declines manual selection when the requested type has no existing credential', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'choose_credential_setup_option', option: 'manual' });
		const logger = {
			warn: vi.fn(),
			info: vi.fn(),
			verbose: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			isVerbose: false,
		};
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Set up the Slack credential now.]' },
			],
			agent,
			logger,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-none', [{ credentialType: 'slackApi' }]),
		);

		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
		}
		expect(logger.warn).toHaveBeenCalled();
	});

	it('requests automatic setup when the agent picks auto', async () => {
		const agent = new FakeAgent();
		agent.enqueue({
			action: 'choose_credential_setup_option',
			option: 'auto',
			credentialType: 'slackApi',
		});
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Ask for automatic setup of the Slack credential on the card.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-auto', [
				{ credentialType: 'slackApi', existingCredentials: [{ id: 'cred-1', name: 'My Slack' }] },
			]),
		);

		expect(response.kind).toBe('credentialAutoSetup');
		if (response.kind === 'credentialAutoSetup') {
			expect(response.credentialType).toBe('slackApi');
		}
	});

	it('declines auto setup when no credentialType can be resolved from context or the decision', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'choose_credential_setup_option', option: 'auto' });
		const logger = {
			warn: vi.fn(),
			info: vi.fn(),
			verbose: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			isVerbose: false,
		};
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Summarize Notion pages to Slack.' },
				{ role: 'user', text: '[Ask for automatic setup of the credential on the card.]' },
			],
			agent,
			logger,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-auto-ambiguous', [
				{ credentialType: 'slackApi', existingCredentials: [{ id: 'cred-slack', name: 'Slack' }] },
				{
					credentialType: 'notionApi',
					existingCredentials: [{ id: 'cred-notion', name: 'Notion' }],
				},
			]),
		);

		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
		}
		expect(logger.warn).toHaveBeenCalled();
	});

	it('declines when the agent picks skip', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'choose_credential_setup_option', option: 'skip' });
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: '[Explicitly decline the credential setup card for Slack.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(
			credentialEventWithRequests('req-cred-skip', [
				{ credentialType: 'slackApi', existingCredentials: [{ id: 'cred-1', name: 'My Slack' }] },
			]),
		);

		expect(response.kind).toBe('approval');
		if (response.kind === 'approval') {
			expect(response.approved).toBe(false);
		}
	});

	it('does not let a credential-engagement stage direction affect unrelated domain-access events', async () => {
		const agent = new FakeAgent();
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Research competitors.' },
				{ role: 'user', text: '[Set up the credential now using the existing one shown.]' },
			],
			agent,
		});

		const response = await proxy.respondToConfirmation(domainAccessEvent('req-dom-2'));
		expect(response.kind).toBe('domainAccessApprove');
		expect(agent.callCount).toBe(0);
	});

	it.each([
		['[set up the credential now]', true],
		['[connect the OAuth account]', true],
		['[use automatic setup for the API key]', true],
		['[sign in to Slack now]', true],
		['[reject the plan unless it sorts descending]', false],
		['[withhold the channel until asked]', false],
		['[keep requesting changes until the list is exhausted]', false],
	])('stage direction %j routes credential card to agent = %s', async (note, shouldEngage) => {
		const agent = new FakeAgent();
		if (shouldEngage) {
			agent.enqueue({ action: 'choose_credential_setup_option', option: 'skip' });
		}
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Post to Slack every morning.' },
				{ role: 'user', text: note },
			],
			agent,
		});

		await proxy.respondToConfirmation(credentialEvent(`req-note-${note}`));
		expect(agent.callCount).toBe(shouldEngage ? 1 : 0);
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

	it('falls back to the permissive payload when the agent picks a user-turn action', async () => {
		const agent = new FakeAgent();
		// declare_done is a user-turn action, invalid as a confirmation response.
		agent.enqueue({ action: 'declare_done' });
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});

		const response = await proxy.respondToConfirmation(planReviewEvent('req-mis'));
		expect(response.kind).toBe('approval');
	});

	it('reuses the first payload on a repeat requestId without consulting the agent', async () => {
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

		expect(second.kind).toBe('questions');
		if (second.kind === 'questions') {
			expect(second.answers).toEqual([{ questionId: 'q1', selectedOptions: ['#general'] }]);
		}
		expect(agent.callCount).toBe(1); // only first call invoked the agent
	});

	it('does not treat a requestId as handled when decision generation throws', async () => {
		const agent = new FakeAgent();
		agent.enqueue(new Error('temporary model failure'), {
			action: 'answer_questions',
			answers: [{ questionId: 'q1', selectedOptions: ['#general'] }],
		});
		const proxy = new UserProxyLlm({
			conversation: [{ role: 'user', text: 'go' }],
			agent,
		});
		const event = questionEvent('req-retry', [
			{ id: 'q1', question: 'Q?', type: 'single', options: ['#general'] },
		]);

		await expect(proxy.respondToConfirmation(event)).rejects.toThrow('temporary model failure');
		const response = await proxy.respondToConfirmation(event);

		expect(response.kind).toBe('questions');
		if (response.kind === 'questions') {
			expect(response.answers).toEqual([{ questionId: 'q1', selectedOptions: ['#general'] }]);
		}
		expect(agent.callCount).toBe(2);
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

	it('always invokes the agent to compose the next user turn', async () => {
		// Previously the proxy short-circuited to "next script user turn
		// verbatim". The new design always defers to the agent so the message
		// can adapt to whatever the assistant just said while staying faithful
		// to the script's intent.
		const agent = new FakeAgent();
		agent.enqueue({ action: 'send_follow_up_message', message: 'also log to sheets' });
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
			expect(decision.message).toBe('also log to sheets');
		}
		expect(proxy.getMessagesSent()).toBe(1);
		expect(agent.callCount).toBe(1);
		expect(agent.modes[0]).toBe('user-turn');
	});

	it('invokes the agent on every follow-up — no verbatim shortcut for short scripts', async () => {
		const agent = new FakeAgent();
		agent.enqueue({ action: 'send_follow_up_message', message: 'one more thing' });
		const proxy = new UserProxyLlm({
			// Only one user turn in the script.
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

	it('falls back to the next scripted user turn when follow-up generation fails', async () => {
		const agent = new FakeAgent();
		agent.enqueue(undefined);
		const proxy = new UserProxyLlm({
			conversation: [
				{ role: 'user', text: 'Build a workflow.' },
				{ role: 'assistant', text: 'Which channel?' },
				{ role: 'user', text: 'Use #ops-alerts.' },
			],
			messageBudget: 3,
			agent,
		});

		const decision = await proxy.decideFollowUp();

		expect(decision).toEqual({ kind: 'followUp', message: 'Use #ops-alerts.' });
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
// Mode-scoped decision schemas
// ---------------------------------------------------------------------------

describe('mode-scoped decision schemas', () => {
	it('user-turn schema does not offer confirmation actions', () => {
		expect(
			userTurnDecisionSchema.safeParse({
				action: 'approve_or_reject',
				approved: false,
				userInput: 'two changes first',
			}).success,
		).toBe(false);
		expect(
			userTurnDecisionSchema.safeParse({ action: 'send_follow_up_message', message: 'hi' }).success,
		).toBe(true);
		expect(userTurnDecisionSchema.safeParse({ action: 'declare_done' }).success).toBe(true);
	});

	it('confirmation schema does not offer user-turn actions', () => {
		expect(
			confirmationDecisionSchema.safeParse({ action: 'send_follow_up_message', message: 'hi' })
				.success,
		).toBe(false);
		expect(confirmationDecisionSchema.safeParse({ action: 'declare_done' }).success).toBe(false);
		expect(
			confirmationDecisionSchema.safeParse({ action: 'approve_or_reject', approved: true }).success,
		).toBe(true);
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
