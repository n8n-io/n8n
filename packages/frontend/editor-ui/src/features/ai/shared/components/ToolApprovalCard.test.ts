/* eslint-disable import-x/no-extraneous-dependencies -- test-only */
import { mount } from '@vue/test-utils';
import { i18nInstance, setLanguage } from '@n8n/i18n';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';

import ToolApprovalCard from './ToolApprovalCard.vue';
import type { ApprovalInput } from '@/features/ai/shared/agentsChat/types';
import { parseApprovalInput } from '@/features/ai/shared/agentsChat/messageMappers';

const approvalInput = {
	type: 'approval',
	toolName: 'calculator',
	displayName: 'Calculator',
	args: { input: '2 + 2' },
} satisfies ApprovalInput;

function mountCard(input: ApprovalInput = approvalInput) {
	return mount(ToolApprovalCard, { props: { input }, global: { plugins: [i18nInstance] } });
}

describe('ToolApprovalCard', () => {
	afterEach(() => {
		setLanguage('en');
	});

	it('updates shared approval labels from the app locale', async () => {
		const input = parseApprovalInput({ ...approvalInput, supportsSessionApproval: true });
		const wrapper = mountCard(input!);
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Always allow');

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
		expect(wrapper.get('[data-test-id="approval-card-allow-once"]').text()).toContain(
			'Einmal erlauben',
		);
		expect(wrapper.get('[data-test-id="approval-card-deny"]').text()).toContain('Ablehnen');
		const args = wrapper.get('[data-test-id="approval-card-args"]');
		expect(args.isVisible()).toBe(true);

		setLanguage('en');
		await nextTick();
		expect(wrapper.get('[data-test-id="approval-card-deny"]').text()).toContain('Deny');
	});

	it('preserves session support from the backend and emits the chosen scope', async () => {
		const input = parseApprovalInput({ ...approvalInput, supportsSessionApproval: true });
		const wrapper = mountCard(input!);
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Always allow');
		await wrapper.get('[data-test-id="approval-card-always-allow"]').trigger('click');
		expect(wrapper.emitted('submit')).toEqual([[{ approved: true, scope: 'session' }]]);
	});

	it('shows the explanation and the HTTP request body together', () => {
		const input = parseApprovalInput({
			type: 'approval',
			toolName: 'send_request',
			description: '  Update the status of the selected record.  ',
			args: { parameters: { method: 'POST', body: { status: 'active' } } },
		});
		const wrapper = mountCard(input!);

		expect(wrapper.text()).toContain('Update the status of the selected record.');
		expect(wrapper.get('[data-test-id="approval-card-args"]').text()).toContain(
			'"status": "active"',
		);
	});

	it('keeps arguments marked as redacted out of the card', () => {
		const input = parseApprovalInput({
			type: 'approval',
			toolName: 'send_request',
			description: 'Request details are hidden by the caller settings.',
			argumentsRedacted: true,
			args: { parameters: { body: { status: 'active' } } },
		});
		const wrapper = mountCard(input!);

		expect(wrapper.text()).toContain('Request details are hidden by the caller settings.');
		expect(wrapper.find('[data-test-id="approval-card-args"]').exists()).toBe(false);
	});

	it('shows call arguments inline and emits approved resume data', async () => {
		const input = parseApprovalInput({
			...approvalInput,
			details: { toolName: 'calculator', kind: 'tool', input: {} },
		});
		const wrapper = mountCard(input!);
		expect(wrapper.find('[data-test-id="approval-card-always-allow"]').exists()).toBe(false);

		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Agent wants to use Calculator');
		expect(wrapper.text()).not.toContain('calculator.');
		const args = wrapper.get('[data-test-id="approval-card-args"]');
		expect(args.isVisible()).toBe(true);
		expect(args.text()).toBe('{\n  "input": "2 + 2"\n}');
		expect(wrapper.find('details').exists()).toBe(false);

		await wrapper.find('[data-test-id="approval-card-allow-once"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: true }]]);
	});

	it('updates the agent name and falls back for a blank name', async () => {
		const wrapper = mountCard();
		await wrapper.setProps({ agentName: '  Helper  ' });
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Helper wants to use Calculator');
		await wrapper.setProps({ agentName: '  ', tools: [] });
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Agent wants to use Calculator');
	});

	it('falls back to the tool name when display metadata is missing', () => {
		const wrapper = mountCard({ type: 'approval', toolName: 'calculator', args: {} });
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('Agent wants to use calculator');
		expect(wrapper.find('[data-test-id="approval-ask-reason"]').exists()).toBe(false);
	});

	it('shows the action description and why the "Approve for me" mode asks', () => {
		const input = parseApprovalInput({
			...approvalInput,
			description: 'Update the selected issue.',
			askReason: { kind: 'judge', text: 'The request does not name this issue.' },
		});
		const wrapper = mountCard(input!);
		expect(wrapper.get('[data-test-id="approval-ask-reason"]').text()).toBe(
			'The request does not name this issue.',
		);
		expect(wrapper.text()).toContain('Update the selected issue.');
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

		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('project status');
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('super-secret-password');
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('api-key-value');
		expect(wrapper.text().replace(/\s+/g, ' ')).toContain('token-value');
	});

	it('emits declined resume data from the deny action', async () => {
		const wrapper = mountCard();

		await wrapper.find('[data-test-id="approval-card-deny"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ approved: false }]]);
	});
});
