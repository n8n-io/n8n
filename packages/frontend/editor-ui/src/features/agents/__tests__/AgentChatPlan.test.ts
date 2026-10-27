import { N8nIcon } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import AgentChatPlan from '../components/AgentChatPlan.vue';
import ChatCollapsibleContainer from '@/features/ai/shared/components/ChatCollapsibleContainer.vue';
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

describe('AgentChatPlan task continuation', () => {
	it('shows only Groove as active and restores only Crisp after selective continuation', async () => {
		const wrapper = mount(AgentChatPlan, {
			props: {
				expanded: true,
				plan: planView({
					document: {
						title: 'Research',
						presentation: { label: 'Researching Groove' },
						items: [1, 2, 3, 4].map((id) => planTask(id, id === 4 ? 'in_progress' : 'paused')),
					},
				}),
			},
		});
		expect(wrapper.findAll('[data-status="paused"]')).toHaveLength(3);
		expect(wrapper.findAll('[data-status="in_progress"]')).toHaveLength(1);
		expect(wrapper.get('button').text()).toContain('Researching Groove');
		await wrapper.setProps({
			plan: planView({
				document: {
					title: 'Research',
					items: [1, 2, 3, 4].map((id) =>
						planTask(id, id === 2 || id === 4 ? 'in_progress' : 'paused'),
					),
				},
			}),
		});
		expect(wrapper.findAll('[data-status="paused"]')).toHaveLength(2);
		expect(wrapper.findAll('[data-status="in_progress"]')).toHaveLength(2);
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		wrapper.unmount();
	});

	it('derives a group from its children and preserves terminal rows', () => {
		const wrapper = mount(AgentChatPlan, {
			props: {
				expanded: true,
				plan: planView({
					document: {
						title: 'Research',
						items: [
							{
								...planTask(10, 'paused'),
								kind: 'group',
								tasks: [planTask(1, 'paused'), planTask(2, 'done'), planTask(3, 'failed')],
							},
							planTask(4, 'cancelled'),
						],
					},
				}),
			},
		});
		expect(wrapper.findAll('[data-status="paused"]')).toHaveLength(2);
		expect(wrapper.findAll('[data-status="in_progress"]')).toHaveLength(0);
		for (const status of ['done', 'failed', 'cancelled'])
			expect(wrapper.findAll(`[data-status="${status}"]`)).toHaveLength(1);
		wrapper.unmount();
	});
});

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

	it('freezes the stopped timer across reloads', async () => {
		const wrapper = mount(AgentChatPlan, {
			props: {
				plan: planView({ startedAt }),
				stopped: true,
				stoppedAt: '2026-10-01T10:00:30.000Z',
			},
		});
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:30');
		await vi.advanceTimersByTimeAsync(20_000);
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:30');
		wrapper.unmount();
	});

	it('includes stopped intervals in elapsed time after selected work resumes', async () => {
		const paused = planView({
			startedAt,
			lastActivityAt: '2026-10-01T10:00:30.000Z',
			document: { title: 'Plan', items: [planTask(1, 'paused')] },
		});
		const wrapper = mount(AgentChatPlan, { props: { plan: paused } });
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:30');
		await vi.advanceTimersByTimeAsync(90_000);
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:30');
		await wrapper.setProps({
			plan: { ...paused, document: { title: 'Plan', items: [planTask(1, 'in_progress')] } },
		});
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('1:30');
		wrapper.unmount();
	});

	it('starts with stored timing and freezes when the last task finishes', async () => {
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
					finishedAt: '2026-10-01T10:00:30.000Z',
					revision: 3,
					document: { title: 'Plan', items: [planTask(1, 'done')] },
				}),
			});
			await vi.advanceTimersByTimeAsync(5_000);
			expect(timer().text()).toBe('0:30');
			expect(vi.getTimerCount()).toBe(0);
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

	it('restores a finished open plan and resumes the timer when new work is added', async () => {
		vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'));
		const plan = planView({
			startedAt,
			finishedAt: '2026-10-01T10:00:30.000Z',
			document: {
				title: 'Finished, with gaps',
				items: [
					{
						...planTask(10, 'in_progress'),
						kind: 'group',
						tasks: [planTask(1, 'done'), planTask(2, 'failed')],
					},
					{ ...planTask(11, 'cancelled'), kind: 'group', tasks: [] },
				],
			},
		});
		const wrapper = mount(AgentChatPlan, { props: { plan } });
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:30');
		expect(wrapper.findComponent(N8nIcon).props('spin')).toBe(false);
		await vi.advanceTimersByTimeAsync(5_000);
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:30');
		expect(vi.getTimerCount()).toBe(0);

		await wrapper.setProps({
			plan: {
				...plan,
				finishedAt: null,
				document: {
					...plan.document,
					items: [...plan.document.items, planTask(3, 'in_progress')],
				},
			},
		});
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('24:00:05');
		await vi.advanceTimersByTimeAsync(1_000);
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('24:00:06');
		wrapper.unmount();
	});

	it('freezes older completed snapshots without a saved finish time', async () => {
		const wrapper = mount(AgentChatPlan, { props: { plan: planView({ startedAt }) } });
		await vi.advanceTimersByTimeAsync(10_000);
		await wrapper.setProps({
			plan: planView({ startedAt, document: { title: 'Done', items: [planTask(1, 'done')] } }),
		});
		await vi.advanceTimersByTimeAsync(10_000);
		expect(wrapper.get('[data-testid="agent-chat-plan-timer"]').text()).toBe('0:10');
		wrapper.unmount();
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
	it('keeps plan details and items in one scroll viewport', () => {
		const wrapper = mount(AgentChatPlan, {
			props: {
				plan: planView({
					document: {
						title: 'Research options',
						presentation: { label: 'Checking sources', detail: 'Reviewed two sources.' },
						items: [planTask(1)],
					},
				}),
			},
		});
		try {
			const viewport = wrapper.get('[data-reka-scroll-area-viewport]');
			expect(viewport.element.tagName).toBe('DIV');
			expect(viewport.text()).toContain('Reviewed two sources.');
			expect(viewport.get('[data-testid="agent-chat-plan-items"]').text()).toContain('Task 1');
			expect(viewport.attributes('style')).toContain('max-height: 20vh');
		} finally {
			wrapper.unmount();
		}
	});

	it.each([
		{ status: 'pending', summary: '0 of 2 tasks done' },
		{ status: 'done', summary: '1 of 2 tasks done' },
	] as const)(
		'counts an empty $status group once until it has subtasks',
		async ({ status, summary }) => {
			const group = { ...planTask(10, status), kind: 'group' as const, tasks: [] };
			const plan = planView({
				document: { title: 'Research options', items: [planTask(1), group] },
			});
			const wrapper = mount(AgentChatPlan, { props: { plan, expanded: true } });
			try {
				expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe(summary);
				await wrapper.setProps({
					plan: {
						...plan,
						revision: 2,
						document: {
							...plan.document,
							items: [planTask(1), { ...group, tasks: [planTask(2, 'done'), planTask(3)] }],
						},
					},
				});
				expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe(
					'1 of 3 tasks done',
				);
			} finally {
				wrapper.unmount();
			}
		},
	);

	it('starts collapsed and supports keyboard expansion without changing focus', async () => {
		const user = userEvent.setup();
		const wrapper = mount(AgentChatPlan, { props: { plan: planView() }, attachTo: document.body });
		try {
			const trigger = wrapper.get('button');
			expect(trigger.attributes('aria-expanded')).toBe('false');
			expect(trigger.text()).toContain('Plan: Compare support platforms');
			expect(wrapper.getComponent(ChatCollapsibleContainer).props('expanded')).toBe(false);
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
				'agents.chat.plan.status.inProgress',
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
		expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
		expect(trigger.find('[role="status"]').exists()).toBe(false);
		expect(wrapper.get('[role="status"]').text()).toBe('Checking sources');
		expect(indicator().props()).toMatchObject({ icon: 'loader-circle', spin: true });
		await trigger.trigger('click');
		expect(wrapper.get('[data-testid="agent-chat-plan-details"]').attributes('aria-label')).toBe(
			'Research options',
		);
		expect(wrapper.get('[title="Reviewed two of three sources."]').text()).toBe(
			'Reviewed two of three sources.',
		);
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
		expect(wrapper.get('[role="status"]').text()).toBe('Stopped checking');
		await wrapper.setProps({ plan: { ...wrapper.props('plan'), revision: 3, closed: true } });
		expect(trigger.text()).toContain('One source remains unchecked.');
		expect(wrapper.get('[role="status"]').text()).toBe('One source remains unchecked.');
		expect(wrapper.getComponent(ChatCollapsibleContainer).attributes('title')).toBe(
			'One source remains unchecked.',
		);
		expect(wrapper.text()).not.toContain('Plan closed');
		expect(trigger.text()).not.toContain('Stopped checking');
		expect(indicator().props()).toMatchObject({ icon: 'list-checks', spin: false });
		expect(wrapper.text().match(/One source remains unchecked\./g)).toHaveLength(2);
		expect(wrapper.get('[data-testid="agent-chat-plan-details"]').text()).not.toContain(
			'One source remains unchecked.',
		);
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
		).toEqual(['check', 'circle', 'loader', 'check', 'x', 'x']);
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
		expect(wrapper.getComponent(ChatCollapsibleContainer).attributes('title')).toBe(title);
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
		expect(wrapper.get('button').text()).toContain('Plan: New plan');
		expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe('0 of 0 tasks done');
		expect(wrapper.findAll('li')).toHaveLength(0);
		wrapper.unmount();
	});
});

describe('Background task stop display', () => {
	it('keeps saved task states and results through Stop and Continue', async () => {
		const plan = planView({
			document: {
				title: 'Research leads',
				presentation: { label: 'Researching leads', detail: 'Checking sources' },
				items: [
					{ ...planTask(1, 'done'), resultSummary: 'Found three leads' },
					planTask(2, 'failed'),
					planTask(3, 'cancelled'),
					planTask(4, 'in_progress'),
					{
						...planTask(5, 'in_progress'),
						kind: 'group',
						tasks: [planTask(6), planTask(7, 'done')],
					},
				],
			},
		});
		const saved = structuredClone(plan);
		const wrapper = mount(AgentChatPlan, { props: { plan, canStop: true } });
		await wrapper.get('button').trigger('click');
		await wrapper.get('[data-testid="agent-chat-plan-stop"]').trigger('click');
		expect(wrapper.emitted('stop')).toHaveLength(1);
		await wrapper.setProps({ stopping: true });
		expect(
			wrapper.get('[data-testid="agent-chat-plan-stop"]').attributes('disabled'),
		).toBeDefined();
		expect(wrapper.get('button').text()).toContain('agents.chat.tasks.stopping');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.get('button').text()).not.toContain('Researching leads');
		const paused = {
			...plan,
			document: {
				...plan.document,
				items: plan.document.items.map((item) => ({
					...item,
					status: ['pending', 'in_progress'].includes(item.status)
						? ('paused' as const)
						: item.status,
					...(item.kind === 'group'
						? {
								tasks: item.tasks.map((child) => ({
									...child,
									status: child.status === 'pending' ? ('paused' as const) : child.status,
								})),
							}
						: {}),
				})),
			},
		};
		await wrapper.setProps({ plan: paused, stopping: false, stopped: true, canStop: false });
		expect(wrapper.get('button').text()).toContain('agents.chat.tasks.stopped');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(wrapper.findAll('[data-status]').map((row) => row.attributes('data-status'))).toEqual([
			'done',
			'failed',
			'cancelled',
			'paused',
			'paused',
			'paused',
			'done',
		]);
		for (const row of wrapper.findAll('[data-status="paused"]')) {
			expect(row.attributes('aria-label')).toBe('agents.chat.tasks.stopped');
			expect(row.getComponent(N8nIcon).props('icon')).toBe('circle-pause');
			expect(row.getComponent(N8nIcon).props('spin')).toBe(false);
		}
		expect(wrapper.findAllComponents(N8nIcon)[0].props('spin')).toBe(false);
		expect(wrapper.get('[data-testid="agent-chat-plan-summary"]').text()).toBe('2 of 6 tasks done');
		expect(wrapper.find('[data-testid="agent-chat-plan-stop"]').exists()).toBe(false);
		expect(plan).toEqual(saved);

		await wrapper.setProps({ plan, stopped: false, canStop: true });
		expect(wrapper.findAll('[data-status]').map((row) => row.attributes('data-status'))).toEqual([
			'done',
			'failed',
			'cancelled',
			'in_progress',
			'in_progress',
			'pending',
			'done',
		]);
		expect(wrapper.get('button').text()).toContain('Researching leads');
		expect(wrapper.text()).toContain('Checking sources');
		expect(wrapper.get('button').attributes('aria-expanded')).toBe('true');
		expect(plan).toEqual(saved);
		wrapper.unmount();
	});

	it('offers a retry after a failed stop', async () => {
		const wrapper = mount(AgentChatPlan, {
			props: { plan: planView(), canStop: true, stopFailed: true },
		});
		await wrapper.get('button').trigger('click');
		expect(wrapper.get('button').text()).toContain('agents.chat.tasks.stopFailedTitle');
		expect(wrapper.get('[data-testid="agent-chat-plan-stop"]').text()).toBe(
			'agents.chat.tasks.retry',
		);
		expect(wrapper.find('[data-status="paused"]').exists()).toBe(false);
		await wrapper.get('[data-testid="agent-chat-plan-stop"]').trigger('click');
		expect(wrapper.emitted('stop')).toHaveLength(1);
		wrapper.unmount();
	});
});
