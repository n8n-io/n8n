/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import {
	APPROVAL_TOOL_NAME,
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_QUESTIONS_TOOL_NAME,
	CONFIGURE_CHANNEL_TOOL_NAME,
} from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';

import InteractiveCard from '../components/interactive/InteractiveCard.vue';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';

/**
 * The real cards (`AskQuestionsCard`/`AskCredentialCard`/`ConfigureChannelCard`)
 * pull in stores and composables that need their own dedicated setup — see
 * `AskQuestionsCard.test.ts` / `AskCredentialCard.test.ts` /
 * `ConfigureChannelCard.test.ts` for their behavior. Here we only care that
 * `InteractiveCard`'s payload-shape dispatch routes to the right one with
 * the right props, so stub them out and assert on the props they receive.
 */
vi.mock('../components/interactive/AskQuestionsCard.vue', () => ({
	default: {
		props: ['questions', 'introMessage', 'disabled', 'resolvedValue'],
		template:
			'<div data-testid="ask-questions-card-stub" :data-questions="JSON.stringify(questions)" />',
	},
}));
vi.mock('../components/interactive/AskCredentialCard.vue', () => ({
	default: {
		props: ['credentialRequests', 'message', 'projectId', 'disabled', 'resolvedValue'],
		template:
			'<div data-testid="ask-credential-card-stub" :data-message="message" :data-project-id="projectId" />',
	},
}));
vi.mock('../components/interactive/ConfigureChannelCard.vue', () => ({
	default: {
		props: ['integrationType', 'agentId', 'projectId', 'disabled', 'resolvedValue'],
		template:
			'<div data-testid="configure-channel-card-stub" :data-integration-type="integrationType" :data-agent-id="agentId" :data-project-id="projectId" />',
	},
}));

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			if (key === 'agents.chat.approval.title') return 'Approval required';
			if (key === 'agents.chat.approval.description') {
				return `The agent wants to run the ${options?.interpolate?.toolName ?? ''} tool.`;
			}
			if (key === 'agents.chat.approval.approve') return 'Approve';
			if (key === 'agents.chat.approval.reject') return 'Reject';
			if (key === 'agents.chat.approval.approved') return 'Approved';
			if (key === 'agents.chat.approval.rejected') return 'Rejected';
			return key;
		},
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

function mountCard(payload: InteractivePayload) {
	return mount(InteractiveCard, {
		props: { payload },
		global: {
			stubs: {
				N8nCard: { template: '<section><slot /></section>' },
				N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
				N8nIcon: { template: '<i />', props: ['icon', 'size', 'color'] },
				N8nButton: {
					template:
						'<button :disabled="disabled" :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot /></button>',
					props: ['disabled', 'type', 'variant', 'size'],
					emits: ['click'],
				},
			},
		},
	});
}

const approvalPayload: InteractivePayload = {
	toolName: APPROVAL_TOOL_NAME,
	toolCallId: 'tc-approval',
	runId: 'run-approval',
	input: {
		type: 'approval',
		toolName: 'calculator',
		displayName: 'Calculator',
		args: { input: '2 + 2' },
	},
};

describe('InteractiveCard', () => {
	it('renders approval details and emits approved resume data', async () => {
		const wrapper = mountCard(approvalPayload);

		expect(wrapper.text()).toContain('Approval required');
		expect(wrapper.text()).toContain('The agent wants to run the Calculator tool.');
		expect(wrapper.text()).not.toContain('calculator.');
		expect(wrapper.text()).toContain('2 + 2');

		await wrapper.find('[data-testid="agent-approval-approve"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: true }]]);
	});

	it('renders approval args as provided by the backend', () => {
		const wrapper = mountCard({
			...approvalPayload,
			input: {
				...approvalPayload.input,
				args: {
					query: 'project status',
					password: 'super-secret-password',
					nested: {
						apiKey: 'api-key-value',
						authorization: 'Bearer token-value',
					},
				},
			},
		});

		expect(wrapper.text()).toContain('project status');
		expect(wrapper.text()).toContain('super-secret-password');
		expect(wrapper.text()).toContain('api-key-value');
		expect(wrapper.text()).toContain('token-value');
	});

	it('emits rejected resume data from the reject action', async () => {
		const wrapper = mountCard(approvalPayload);

		await wrapper.find('[data-testid="agent-approval-reject"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: false }]]);
	});

	it('renders resolved approval state without active actions', () => {
		const wrapper = mountCard({
			...approvalPayload,
			resolvedAt: 1,
			resolvedValue: { approved: false },
		});

		expect(wrapper.text()).toContain('Rejected');
		expect(wrapper.find('[data-testid="agent-approval-approve"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-approval-reject"]').exists()).toBe(false);
	});

	it('dispatches to AskQuestionsCard by the `inputType: questions` payload field, not toolName', () => {
		const wrapper = mountCard({
			toolName: ASK_QUESTIONS_TOOL_NAME,
			toolCallId: 'tc-q',
			runId: 'run-q',
			input: {
				requestId: 'req-1',
				message: 'The agent builder has questions',
				severity: 'info',
				inputType: 'questions',
				questions: [{ id: 'q1', question: 'Pick one', type: 'single', options: ['a'] }],
			},
		});

		const stub = wrapper.find('[data-testid="ask-questions-card-stub"]');
		expect(stub.exists()).toBe(true);
		expect(JSON.parse(stub.attributes('data-questions') ?? '[]')).toEqual([
			{ id: 'q1', question: 'Pick one', type: 'single', options: ['a'] },
		]);
	});

	it('dispatches to AskCredentialCard by the `credentialRequests` payload field, for both ask_credential and ask_embedding_credential', () => {
		const input = {
			requestId: 'req-2',
			message: 'Slack credential',
			severity: 'info' as const,
			credentialRequests: [
				{ credentialType: 'slackApi', reason: 'Slack credential', existingCredentials: [] },
			],
			credentialFlow: { stage: 'generic' as const },
		};

		const wrapper = mountCard({
			toolName: ASK_CREDENTIAL_TOOL_NAME,
			toolCallId: 'tc-c',
			runId: 'run-c',
			input,
		});

		const stub = wrapper.find('[data-testid="ask-credential-card-stub"]');
		expect(stub.exists()).toBe(true);
		expect(stub.attributes('data-message')).toBe('Slack credential');
	});

	it('dispatches to ConfigureChannelCard by the `channelConfig` payload field', () => {
		const wrapper = mount(InteractiveCard, {
			props: {
				payload: {
					toolName: CONFIGURE_CHANNEL_TOOL_NAME,
					toolCallId: 'tc-ch',
					runId: 'run-ch',
					input: {
						requestId: 'req-3',
						message: 'Set up the slack channel',
						severity: 'info',
						channelConfig: { integrationType: 'slack', agentId: 'a1' },
						projectId: 'p1',
					},
				} satisfies InteractivePayload,
				projectId: 'p1',
				agentId: 'a1',
			},
			global: {
				stubs: {
					N8nCard: { template: '<section><slot /></section>' },
					N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
					N8nIcon: { template: '<i />', props: ['icon', 'size', 'color'] },
					N8nButton: { template: '<button><slot /></button>', props: ['disabled'] },
				},
			},
		});

		const stub = wrapper.find('[data-testid="configure-channel-card-stub"]');
		expect(stub.exists()).toBe(true);
		expect(stub.attributes('data-integration-type')).toBe('slack');
		expect(stub.attributes('data-agent-id')).toBe('a1');
		expect(stub.attributes('data-project-id')).toBe('p1');
	});

	it('renders nothing, without crashing, for a payload whose toolName does not match the field it carries', () => {
		// Malformed/corrupted payload: `channelConfig` is present (which the
		// presence-based `matches()` checks for) but `toolName` is neither
		// `configure_channel` nor any other known tool. Before the
		// toolName+presence hardening, `'channelConfig' in payload.input` alone
		// used to match the channel renderer and hand it `{}` from `getProps`
		// (a strict toolName narrow), which would crash a real card expecting
		// `integrationType` etc.
		const malformedPayload = {
			toolName: 'unknown_tool',
			toolCallId: 'tc-malformed',
			runId: 'run-malformed',
			input: {
				channelConfig: { integrationType: 'slack', agentId: 'a1' },
			},
		} as unknown as InteractivePayload;

		expect(() => mountCard(malformedPayload)).not.toThrow();
		const wrapper = mountCard(malformedPayload);

		expect(wrapper.find('[data-testid="configure-channel-card-stub"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="ask-questions-card-stub"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="ask-credential-card-stub"]').exists()).toBe(false);
	});
});
