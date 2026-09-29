/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import { APPROVAL_TOOL_NAME, WAIT_TOOL_NAME } from '@n8n/api-types';
import { i18nInstance, setLanguage } from '@n8n/i18n';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import InteractiveCard from '../components/interactive/InteractiveCard.vue';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import { parseApprovalInput } from '@/features/ai/shared/agentsChat/messageMappers';

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
		details: {
			toolName: 'calculator',
			input: { input: '2 + 2' },
			node: { parameters: { operation: 'calculate' } },
		},
	},
};

describe('InteractiveCard', () => {
	afterEach(() => {
		setLanguage('en');
	});

	it('updates shared approval choices and saved results from the app locale', async () => {
		const input = parseApprovalInput({ ...approvalPayload.input, supportsSessionApproval: true });
		const payload = { ...approvalPayload, input: input! };
		const wrapper = mountCard(payload);
		expect(wrapper.text()).toContain('Always allow');

		i18nInstance.global.setLocaleMessage('de', {
			...i18nInstance.global.getLocaleMessage('en'),
			...Object.fromEntries([
				['instanceAi.confirmation.alwaysAllow', 'Immer erlauben'],
				['instanceAi.confirmation.alwaysAllowSuffix', 'in dieser Sitzung'],
				['instanceAi.confirmation.approve', 'Einmal erlauben'],
				['instanceAi.confirmation.deny', 'Ablehnen'],
				['instanceAi.confirmation.approved', 'Erlaubt'],
				['instanceAi.confirmation.denied', 'Abgelehnt'],
			]),
		});
		setLanguage('de');
		await nextTick();

		const sessionChoice = wrapper.get('[data-test-id="approval-card-always-allow"]');
		expect(sessionChoice.text()).toContain('Immer erlauben');
		expect(sessionChoice.text()).toContain('in dieser Sitzung');
		expect(wrapper.get('[data-test-id="approval-card-allow-once"]').text()).toBe('Einmal erlauben');
		expect(wrapper.get('[data-test-id="approval-card-deny"]').text()).toBe('Ablehnen');

		await wrapper.setProps({
			payload: { ...payload, resolvedAt: 1, resolvedValue: { approved: true } },
		});
		expect(wrapper.text()).toContain('Erlaubt');
		await wrapper.setProps({
			payload: { ...payload, resolvedAt: 1, resolvedValue: { approved: false } },
		});
		expect(wrapper.text()).toContain('Abgelehnt');

		setLanguage('en');
		await nextTick();
		expect(wrapper.text()).toContain('Denied');
	});

	it('preserves session support from the backend and emits the chosen scope', async () => {
		const input = parseApprovalInput({ ...approvalPayload.input, supportsSessionApproval: true });
		const wrapper = mountCard({ ...approvalPayload, input: input! });
		expect(wrapper.text()).toContain('Always allow');
		await wrapper.get('[data-test-id="approval-card-always-allow"]').trigger('click');
		expect(wrapper.emitted('submit')).toEqual([[{ approved: true, scope: 'session' }]]);
	});

	it('renders approval details and emits approved resume data', async () => {
		const wrapper = mountCard(approvalPayload);
		expect(wrapper.find('[data-test-id="approval-card-always-allow"]').exists()).toBe(false);

		expect(wrapper.text()).toContain('Approval required');
		expect(wrapper.text()).toContain('The agent wants to run the Calculator tool.');
		expect(wrapper.text()).not.toContain('calculator.');
		expect(wrapper.text()).toContain('2 + 2');
		expect(wrapper.text()).toContain('operation');
		const details = wrapper.find('[data-testid="agent-approval-tool-details"]');
		expect(details.exists()).toBe(true);
		expect(details.attributes('open')).toBeUndefined();

		await wrapper.find('[data-test-id="approval-card-allow-once"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: true }]]);
	});

	it('renders approval args as provided by the backend', () => {
		const wrapper = mountCard({
			...approvalPayload,
			input: {
				type: 'approval',
				toolName: 'calculator',
				displayName: 'Calculator',
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

	it('emits declined resume data from the deny action', async () => {
		const wrapper = mountCard(approvalPayload);

		await wrapper.find('[data-test-id="approval-card-deny"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: false }]]);
	});

	it('renders resolved approval state without active actions', () => {
		const wrapper = mountCard({
			...approvalPayload,
			resolvedAt: 1,
			resolvedValue: { approved: false },
		});

		expect(wrapper.text()).toContain('Denied');
		expect(wrapper.find('[data-test-id="approval-card-allow-once"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="approval-card-deny"]').exists()).toBe(false);
	});
	// A workflow tool parked on a Wait node reuses the chat card renderer, and its
	// buttons resume the parked run with the value the backend declared.
	it('renders the waiting card and emits the clicked button as resume data', async () => {
		const wrapper = mountCard({
			toolName: WAIT_TOOL_NAME,
			toolCallId: 'tc-wait',
			runId: 'run-wait',
			input: {
				card: {
					title: 'Waiting on "Approval workflow"',
					components: [
						{ type: 'section', text: 'The "Approval workflow" workflow is paused.' },
						{ type: 'button', label: 'Check for the result', value: 'continue' },
						{ type: 'button', label: 'Stop waiting', value: 'cancel' },
					],
				},
			},
		});

		expect(wrapper.text()).toContain('Waiting on "Approval workflow"');
		const buttons = wrapper.findAll('[data-testid="n8n-chat-card-button"]');
		expect(buttons.map((button) => button.text())).toEqual([
			'Check for the result',
			'Stop waiting',
		]);

		await buttons[1].trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ type: 'button', value: 'cancel' }]]);
	});
});
