/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import { i18nInstance, setLanguage } from '@n8n/i18n';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import ApprovalCard from '../components/interactive/ApprovalCard.vue';
import type { ApprovalInput } from '@/features/ai/shared/agentsChat/types';
import { parseApprovalInput } from '@/features/ai/shared/agentsChat/messageMappers';

const approvalInput = {
	type: 'approval',
	toolName: 'calculator',
	displayName: 'Calculator',
	args: { input: '2 + 2' },
} satisfies ApprovalInput;

function mountCard(input: ApprovalInput = approvalInput) {
	return mount(ApprovalCard, { props: { input } });
}

describe('ApprovalCard', () => {
	afterEach(() => {
		setLanguage('en');
	});

	it('updates shared approval labels from the app locale', async () => {
		const input = parseApprovalInput({ ...approvalInput, supportsSessionApproval: true });
		const wrapper = mountCard(input!);
		expect(wrapper.text()).toContain('Always allow');

		i18nInstance.global.setLocaleMessage('de', {
			...i18nInstance.global.getLocaleMessage('en'),
			...Object.fromEntries([
				['instanceAi.confirmation.alwaysAllow', 'Immer erlauben'],
				['instanceAi.confirmation.alwaysAllowSuffix', 'in dieser Sitzung'],
				['instanceAi.confirmation.approve', 'Einmal erlauben'],
				['instanceAi.confirmation.deny', 'Ablehnen'],
				['instanceAi.toolCall.input', 'Eingabe'],
			]),
		});
		setLanguage('de');
		await nextTick();

		const sessionChoice = wrapper.get('[data-test-id="approval-card-always-allow"]');
		expect(sessionChoice.text()).toContain('Immer erlauben');
		expect(sessionChoice.text()).toContain('in dieser Sitzung');
		expect(wrapper.get('[data-test-id="approval-card-allow-once"]').text()).toBe('Einmal erlauben');
		expect(wrapper.get('[data-test-id="approval-card-deny"]').text()).toBe('Ablehnen');
		const args = wrapper.get('[data-test-id="approval-card-args"]');
		expect(args.attributes('role')).toBe('region');
		expect(args.element).toHaveAccessibleName('Eingabe');

		setLanguage('en');
		await nextTick();
		expect(wrapper.get('[data-test-id="approval-card-deny"]').text()).toBe('Deny');
	});

	it('preserves session support from the backend and emits the chosen scope', async () => {
		const input = parseApprovalInput({ ...approvalInput, supportsSessionApproval: true });
		const wrapper = mountCard(input!);
		expect(wrapper.text()).toContain('Always allow');
		await wrapper.get('[data-test-id="approval-card-always-allow"]').trigger('click');
		expect(wrapper.emitted('submit')).toEqual([[{ approved: true, scope: 'session' }]]);
	});

	it('shows call arguments inline and emits approved resume data', async () => {
		const input = parseApprovalInput({
			...approvalInput,
			details: { toolName: 'calculator', kind: 'tool', input: {} },
		});
		const wrapper = mountCard(input!);
		expect(wrapper.find('[data-test-id="approval-card-always-allow"]').exists()).toBe(false);

		expect(wrapper.text()).toContain('Approval required');
		expect(wrapper.text()).toContain('The agent wants to run the Calculator tool.');
		expect(wrapper.text()).not.toContain('calculator.');
		const args = wrapper.get('[data-test-id="approval-card-args"]');
		expect(args.isVisible()).toBe(true);
		expect(args.text()).toBe('{\n  "input": "2 + 2"\n}');
		expect(wrapper.find('details').exists()).toBe(false);

		await wrapper.find('[data-test-id="approval-card-allow-once"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: true }]]);
	});

	it('renders approval args as provided by the backend', () => {
		const wrapper = mountCard({
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
		});

		expect(wrapper.text()).toContain('project status');
		expect(wrapper.text()).toContain('super-secret-password');
		expect(wrapper.text()).toContain('api-key-value');
		expect(wrapper.text()).toContain('token-value');
	});

	it('emits declined resume data from the deny action', async () => {
		const wrapper = mountCard();

		await wrapper.find('[data-test-id="approval-card-deny"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: false }]]);
	});
});
