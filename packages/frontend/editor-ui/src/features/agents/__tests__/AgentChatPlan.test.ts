import { N8nAiActivityStepGroup, N8nIcon } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
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

describe('AgentChatPlan timer', () => {
	const startedAt = '2026-10-01T10:00:00.000Z';
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(startedAt));
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('starts only with stored timing and keeps counting while the parent reviews completed work', async () => {
		const wrapper = mount(AgentChatPlan, { props: { plan: planView({ startedAt: null }) } });
		try {
			expect(wrapper.find('[data-testid="agent-chat-plan-timer"]').exists()).toBe(false);
			await wrapper.setProps({ plan: planView({ startedAt, revision: 2 }) });
			const timer = () => wrapper.get('[data-testid="agent-chat-plan-timer"]');
			expect(timer().text()).toBe('0:00');
			expect(timer().attributes('aria-live')).toBe('off');
			await vi.advanceTimersByTimeAsync(31_000);
			expect(timer().text()).toBe('0:31');
			await wrapper.setProps({
				plan: planView({
					startedAt,
					revision: 3,
					document: { title: 'Plan', items: [planTask(1, 'done')] },
				}),
			});
			await vi.advanceTimersByTimeAsync(5_000);
			expect(timer().text()).toBe('0:36');
			await wrapper.setProps({
				plan: planView({
					startedAt,
					closed: true,
					closedAt: '2026-10-01T10:00:35.000Z',
					revision: 4,
				}),
			});
			expect(timer().text()).toBe('0:35');
			await vi.advanceTimersByTimeAsync(60_000);
			expect(timer().text()).toBe('0:35');
		} finally {
			wrapper.unmount();
		}
	});

	it('restores elapsed time on remount and rolls over into hours', async () => {
		vi.setSystemTime(new Date('2026-10-01T10:59:59.000Z'));
		const plan = planView({ startedAt });
		const wrapper = mount(AgentChatPlan, { props: { plan } });
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('59:59');
		await vi.advanceTimersByTimeAsync(1_000);
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('1:00:00');
		wrapper.unmount();
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(5_000);
		const restored = mount(AgentChatPlan, { props: { plan } });
		try {
			expect(restored.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('1:00:05');
			const clearInterval = vi.spyOn(globalThis, 'clearInterval');
			await restored.setProps({ plan: planView({ startedAt: null, planId: planTask(99).id }) });
			expect(restored.find('[data-testid="agent-chat-plan-timer"]').exists()).toBe(false);
			expect(clearInterval).toHaveBeenCalled();
		} finally {
			restored.unmount();
		}
	});

	it('restores a closed plan with a fixed duration', async () => {
		vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'));
		const wrapper = mount(AgentChatPlan, {
			props: {
				plan: planView({
					startedAt,
					closed: true,
					closedAt: '2026-10-01T11:02:03.000Z',
				}),
			},
		});
		try {
			expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('1:02:03');
			await vi.advanceTimersByTimeAsync(10_000);
			expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('1:02:03');
			expect(vi.getTimerCount()).toBe(0);
		} finally {
			wrapper.unmount();
		}
	});

	it('pauses timer updates in a hidden tab and catches up when visible', async () => {
		const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		const wrapper = mount(AgentChatPlan, { props: { plan: planView({ startedAt }) } });
		try {
			await nextTick();
			visibility.mockReturnValue('hidden');
			document.dispatchEvent(new Event('visibilitychange'));
			await nextTick();
			await vi.advanceTimersByTimeAsync(10_000);
			expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:00');
			visibility.mockReturnValue('visible');
			document.dispatchEvent(new Event('visibilitychange'));
			await nextTick();
			expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:10');
		} finally {
			wrapper.unmount();
		}
	});

	it.each([planView(), planView({ startedAt, closed: true }), planView({ startedAt: 'invalid' })])(
		'does not invent elapsed time for incomplete timing metadata',
		(plan) => {
			const wrapper = mount(AgentChatPlan, { props: { plan } });
			expect(wrapper.find('[data-testid="agent-chat-plan-timer"]').exists()).toBe(false);
			wrapper.unmount();
		},
	);
});

describe('AgentChatPlan', () => {
	it('starts collapsed and supports keyboard expansion without changing focus', async () => {
		const user = userEvent.setup();
		const wrapper = mount(AgentChatPlan, { props: { plan: planView() }, attachTo: document.body });
		try {
			const trigger = wrapper.get('button');
			expect(trigger.attributes('aria-expanded')).toBe('false');
			expect(trigger.text()).toContain('Plan: Compare support platforms');
			expect(wrapper.getComponent(N8nAiActivityStepGroup).props('contentPosition')).toBe('below');
			expect(trigger.text()).not.toContain('1 of 3 tasks done');
			trigger.element.focus();
			await user.keyboard('{Enter}');
			expect(trigger.attributes('aria-expanded')).toBe('true');
			expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe(
				'1 of 3 tasks done',
			);
			expect(wrapper.get('[data-testid="agent-chat-plan-items"]').text()).toContain('Research');
			expect(wrapper.get('[data-testid="agent-chat-plan-details"]').attributes('tabindex')).toBe(
				'0',
			);
			expect(wrapper.get('[data-testid="agent-chat-plan-details"]').attributes('aria-label')).toBe(
				'Compare support platforms',
			);
			expect(wrapper.findAll('[data-status]').map((row) => row.attributes('aria-label'))).toEqual([
				'agents.chat.plan.status.pending',
				'agents.chat.plan.status.inProgress',
				'agents.chat.plan.status.done',
				'agents.chat.plan.status.pending',
			]);
			await wrapper.setProps({ plan: planView({ revision: 2, closed: true }) });
			expect(trigger.text()).toContain('Compare support platforms');
			expect(wrapper.text()).not.toContain('Closed');
			expect(trigger.attributes('aria-expanded')).toBe('true');
			await user.keyboard(' ');
			expect(trigger.attributes('aria-expanded')).toBe('false');
			expect(document.activeElement).toBe(trigger.element);
		} finally {
			wrapper.unmount();
		}
	});

	it('shows Agent-written activity and details, then closes without implying success', async () => {
		const plan = planView({
			document: {
				title: 'Research options',
				presentation: { label: 'Checking sources', detail: 'Reviewed two of three sources.' },
				items: [planTask(1, 'in_progress'), planTask(2, 'failed'), planTask(3)],
			},
		});
		const wrapper = mount(AgentChatPlan, { props: { plan } });
		const trigger = wrapper.get('button');
		const indicator = () => wrapper.findAllComponents(N8nIcon)[0];
		expect(trigger.text()).toContain('Checking sources');
		expect(indicator().props()).toMatchObject({ icon: 'loader-circle', spin: true });
		await trigger.trigger('click');
		expect(wrapper.get('[data-testid="agent-chat-plan-details"]').attributes('aria-label')).toBe(
			'Research options',
		);
		expect(wrapper.get('p').text()).toBe('Reviewed two of three sources.');
		await wrapper.setProps({
			plan: {
				...plan,
				revision: 2,
				document: {
					...plan.document,
					presentation: { label: 'Stopped checking', detail: 'One source remains unchecked.' },
				},
			},
		});
		expect(trigger.text()).toContain('Stopped checking');
		await wrapper.setProps({ plan: { ...wrapper.props('plan'), revision: 3, closed: true } });
		expect(trigger.text()).toContain('One source remains unchecked.');
		expect(wrapper.getComponent(N8nAiActivityStepGroup).attributes('title')).toBe(
			'One source remains unchecked.',
		);
		expect(wrapper.text()).not.toContain('Plan closed');
		expect(trigger.text()).not.toContain('Stopped checking');
		expect(indicator().props()).toMatchObject({ icon: 'list-checks', spin: false });
		expect(wrapper.text().match(/One source remains unchecked\./g)).toHaveLength(1);
		expect(wrapper.findAll('[data-status]').map((row) => row.attributes('data-status'))).toEqual([
			'in_progress',
			'failed',
			'pending',
		]);
		expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe('0 of 3 tasks done');
		expect(trigger.attributes('aria-expanded')).toBe('true');
		wrapper.unmount();
	});

	it('uses the plan title when a closed plan has no final summary', () => {
		const plan = planView({
			closed: true,
			document: { ...planView().document, presentation: { label: 'Checking sources' } },
		});
		const wrapper = mount(AgentChatPlan, { props: { plan } });
		expect(wrapper.get('button').text()).toContain(plan.document.title);
		expect(wrapper.text()).not.toContain('Checking sources');
		expect(wrapper.text()).not.toContain('Plan closed');
		wrapper.unmount();
	});

	it.each(['pending', 'in_progress', 'done', 'failed', 'cancelled'] as const)(
		'shows a header spinner only for In progress work, not %s text',
		async (status) => {
			const wrapper = mount(AgentChatPlan, {
				props: {
					plan: planView({
						document: {
							title: 'Plan',
							presentation: { label: 'Working' },
							items: [{ ...planTask(10), kind: 'group', tasks: [planTask(1, status)] }],
						},
					}),
				},
			});
			expect(wrapper.findAllComponents(N8nIcon)[0].props('spin')).toBe(status === 'in_progress');
			wrapper.unmount();
		},
	);

	it('shows compact titles and an Agent-written note without task descriptions or results', async () => {
		const detail = '<img src=x onerror=alert(1)>\nSecond line';
		const wrapper = mount(AgentChatPlan, {
			props: {
				plan: planView({
					document: {
						title: 'Plan',
						presentation: { label: '<b>Checking sources</b>', detail },
						items: [
							{ ...planTask(1), description: 'Check sources' },
							{
								...planTask(2, 'done'),
								description: 'Hidden description',
								resultSummary: 'Found two sources',
							},
							{ ...planTask(3), description: '   ', resultSummary: '\n' },
							{
								...planTask(10),
								kind: 'group',
								description: 'Hidden group description',
								resultSummary: 'Group summary',
								tasks: [{ ...planTask(4), description: 'Child description', resultSummary: '  ' }],
							},
						],
					},
				}),
			},
		});
		await wrapper.get('button').trigger('click');
		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.find('b').exists()).toBe(false);
		expect(wrapper.text()).toContain(detail);
		expect(wrapper.text()).not.toContain('Check sources');
		expect(wrapper.text()).not.toContain('Found two sources');
		expect(wrapper.text()).not.toContain('Group summary');
		expect(wrapper.text()).not.toContain('Child description');
		expect(wrapper.text()).not.toContain('Hidden');
		expect(wrapper.findAll('li')[2].find('p').exists()).toBe(false);
		expect(wrapper.findAll('[data-status] + span').map((row) => row.text())).toEqual([
			'Task 1',
			'Task 2',
			'Task 3',
			'Task 10',
			'Task 4',
		]);
		wrapper.unmount();
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
		await wrapper.get('button').trigger('click');
		expect(wrapper.text()).toContain('0 of 0 tasks done');
		expect(wrapper.findAll('li')).toHaveLength(0);
		wrapper.unmount();
	});
});

describe('Task cancellation', () => {
	it('keeps the expanded card and completed results while cancellation settles', async () => {
		const plan = planView({
			document: {
				title: 'Research leads',
				items: [planTask(1, 'done'), planTask(2, 'in_progress')],
			},
		});
		const wrapper = mount(AgentChatPlan, { props: { plan, canStop: true } });
		await wrapper.get('button').trigger('click');
		await wrapper.get('[data-testid="agent-chat-plan-stop"]').trigger('click');
		expect(wrapper.emitted('stop')).toHaveLength(1);
		await wrapper.setProps({ stopping: true });
		expect(
			wrapper.get('[data-testid="agent-chat-plan-stop"]').attributes('disabled'),
		).toBeDefined();
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe('1 of 2 tasks done');
		await wrapper.setProps({
			stopping: false,
			canStop: false,
			plan: {
				...plan,
				revision: plan.revision + 1,
				closed: true,
				closedAt: '2026-10-01T10:01:00.000Z',
				document: { ...plan.document, items: [planTask(1, 'done'), planTask(2, 'cancelled')] },
			},
			cancellation: {
				id: 'cancel',
				planId: plan.planId,
				status: 'stopped',
				requestedAt: '',
				settledAt: '',
				failures: [],
				reportStatus: 'reported',
				report: '',
				plan: null,
				heldQueueIds: [],
			},
		});
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.text()).toContain('agents.chat.tasks.stopped');
		expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe('1 of 2 tasks done');
		expect(wrapper.find('[data-testid="agent-chat-plan-stop"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('identifies failed stops and offers a retry without showing Stopped', async () => {
		const plan = planView();
		const wrapper = mount(AgentChatPlan, {
			props: {
				plan,
				cancellation: {
					id: 'cancel',
					planId: plan.planId,
					status: 'failed',
					requestedAt: '',
					settledAt: null,
					failures: [{ jobId: 'job', title: 'Waiting workflow' }],
					reportStatus: 'pending',
					report: '',
					plan: null,
					heldQueueIds: [],
				},
			},
		});
		await wrapper.get('button').trigger('click');
		expect(wrapper.text()).toContain('Waiting workflow');
		expect(wrapper.get('[data-testid="agent-chat-plan-stop"]').text()).toBe(
			'agents.chat.tasks.retry',
		);
		expect(wrapper.text()).not.toContain('agents.chat.tasks.stopped');
		await wrapper.get('[data-testid="agent-chat-plan-stop"]').trigger('click');
		expect(wrapper.emitted('stop')).toHaveLength(1);
		wrapper.unmount();
	});
});
