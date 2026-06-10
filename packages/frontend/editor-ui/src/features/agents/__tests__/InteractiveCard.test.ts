/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import { APPROVAL_TOOL_NAME } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';

import InteractiveCard from '../components/interactive/InteractiveCard.vue';
import type { InteractivePayload } from '../composables/agentChatMessages';

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
});
