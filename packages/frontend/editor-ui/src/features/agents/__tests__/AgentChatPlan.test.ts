import { N8nAiActivityStepGroup, N8nIcon } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AgentChatPlan from '../components/AgentChatPlan.vue';
import { planTask, planView } from './fixtures/agent-plan';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			if (key === 'agents.chat.plan.title') return `Plan: ${options?.interpolate?.title}`;
			if (key === 'agents.chat.plan.progress')
				return `${options?.interpolate?.done} of ${options?.interpolate?.total} tasks done`;
			return key;
		},
	}),
}));

describe('AgentChatPlan', () => {
	it('starts collapsed and supports keyboard expansion without changing focus', async () => {
		const user = userEvent.setup();
		const wrapper = mount(AgentChatPlan, { props: { plan: planView() }, attachTo: document.body });
		try {
			const trigger = wrapper.get('button');
			expect(trigger.attributes('aria-expanded')).toBe('false');
			expect(trigger.text()).toContain('Plan: Compare support platforms');
			expect(wrapper.getComponent(N8nAiActivityStepGroup).props('contentPosition')).toBe('above');
			expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe(
				'1 of 3 tasks done',
			);
			trigger.element.focus();
			await user.keyboard('{Enter}');
			expect(trigger.attributes('aria-expanded')).toBe('true');
			expect(wrapper.get('[data-testid="agent-chat-plan-items"]').text()).toContain('Research');
			expect(wrapper.get('[data-testid="agent-chat-plan-items"]').attributes('tabindex')).toBe('0');
			expect(wrapper.get('[data-testid="agent-chat-plan-items"]').attributes('aria-label')).toBe(
				'Compare support platforms',
			);
			expect(wrapper.findAll('[data-status]').map((row) => row.attributes('aria-label'))).toEqual([
				'agents.chat.plan.status.pending',
				'agents.chat.plan.status.inProgress',
				'agents.chat.plan.status.done',
				'agents.chat.plan.status.pending',
			]);
			await wrapper.setProps({ plan: planView({ revision: 2, closed: true }) });
			expect(wrapper.text()).toContain('agents.chat.plan.closed');
			expect(trigger.attributes('aria-expanded')).toBe('true');
			await user.keyboard(' ');
			expect(trigger.attributes('aria-expanded')).toBe('false');
			expect(document.activeElement).toBe(trigger.element);
		} finally {
			wrapper.unmount();
		}
	});

	it('renders each status distinctly without inferring group completion', async () => {
		const statuses = ['pending', 'in_progress', 'done', 'failed', 'cancelled'] as const;
		const plan = planView({
			document: {
				title: 'Statuses',
				items: [
					{
						...planTask(10, 'done'),
						kind: 'group',
						tasks: statuses.map((status, index) => planTask(index + 1, status)),
					},
				],
			},
		});
		const wrapper = mount(AgentChatPlan, { props: { plan } });
		await wrapper.get('button').trigger('click');
		expect(
			wrapper.findAll('[data-status]').map((row) => row.getComponent(N8nIcon).props('icon')),
		).toEqual(['check', 'circle', 'loader-circle', 'check', 'x', 'x']);
		expect(wrapper.findAll('[data-status]').map((row) => row.attributes('data-status'))).toEqual([
			'done',
			...statuses,
		]);
		expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe('1 of 5 tasks done');
		expect(
			wrapper.findAll('[data-status]').map((row) => row.getComponent(N8nIcon).props('spin')),
		).toEqual([false, false, true, false, false, false]);
		expect(wrapper.find('[class*="shimmer"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('preserves document order and treats long titles as plain text', async () => {
		const title = '<img src=x onerror=alert(1)>'.repeat(20);
		const plan = planView({ document: { title, items: [{ ...planTask(1), title }, planTask(2)] } });
		const wrapper = mount(AgentChatPlan, { props: { plan } });
		await wrapper.get('button').trigger('click');
		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.findAll('li').map((row) => row.text())).toEqual([title, 'Task 2']);
		expect(wrapper.getComponent(N8nAiActivityStepGroup).attributes('title')).toBe(title);
		wrapper.unmount();
	});

	it('shows empty plans and resets expansion for a new plan', async () => {
		const wrapper = mount(AgentChatPlan, { props: { plan: planView() } });
		await wrapper.get('button').trigger('click');
		await wrapper.setProps({
			plan: planView({
				planId: '22222222-2222-4222-8222-222222222222',
				document: { title: 'New plan', items: [] },
			}),
		});
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('false');
		expect(wrapper.text()).toContain('0 of 0 tasks done');
		await wrapper.get('button').trigger('click');
		expect(wrapper.findAll('li')).toHaveLength(0);
		wrapper.unmount();
	});
});
