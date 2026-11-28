import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, type PropType } from 'vue';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type { AssistantUsageDay, AssistantUsageResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { fetchAssistantUsage, fetchAssistantUsageUsers } from '../assistantUsage.api';
import { INSTANCE_AI_SETTINGS_VIEW } from '../constants';
import SettingsAssistantUsageView from '../views/SettingsAssistantUsageView.vue';

type ChartData = { datasets: Array<{ data: number[] }> };

const { push, charts } = vi.hoisted(() => ({
	push: vi.fn(),
	charts: [] as Array<{ data: ChartData }>,
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('../assistantUsage.api', () => ({
	fetchAssistantUsage: vi.fn(),
	fetchAssistantUsageUsers: vi.fn(),
}));

// Chart.js needs a canvas. The stub keeps the data that each chart gets.
vi.mock('@n8n/design-system/charts', () => ({
	Bar: defineComponent({
		props: {
			data: { type: Object as PropType<ChartData>, required: true },
			options: { type: Object, required: true },
		},
		setup(props) {
			charts.push(props);
			return () => null;
		},
	}),
}));

function day(date: string, counts: Partial<AssistantUsageDay> = {}): AssistantUsageDay {
	return {
		date,
		conversations: 0,
		messages: 0,
		workflowsCreated: 0,
		agentsCreated: 0,
		dataTablesCreated: 0,
		inputTokens: 0,
		outputTokens: 0,
		...counts,
	};
}

const usage: AssistantUsageResponse = {
	summary: {
		conversations: 3,
		messages: 7,
		activeUsers: 2,
		workflowsCreated: 1,
		agentsCreated: 0,
		dataTablesCreated: 0,
	},
	byDay: [
		day('2026-11-27', { conversations: 1, messages: 2, inputTokens: 1000, outputTokens: 50 }),
		day('2026-11-28', {
			conversations: 2,
			messages: 5,
			workflowsCreated: 1,
			inputTokens: 60_709,
			outputTokens: 920,
		}),
	],
};

const renderComponent = createComponentRenderer(SettingsAssistantUsageView, {
	global: { stubs: { ProjectFilter: true } },
});

describe('SettingsAssistantUsageView', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 10, 28, 15, 30));
		charts.length = 0;
		vi.mocked(fetchAssistantUsage).mockResolvedValue(usage);
		vi.mocked(fetchAssistantUsageUsers).mockResolvedValue({
			count: 1,
			data: [
				{
					userId: 'user-1',
					firstName: 'Alice',
					lastName: 'Archer',
					email: 'alice@example.com',
					conversations: 3,
					messages: 7,
					workflowsCreated: 1,
					agentsCreated: 0,
					dataTablesCreated: 0,
					inputTokens: 61_709,
					outputTokens: 970,
					lastUsedAt: '2026-11-28T14:00:00.000Z',
				},
			],
		});
		createTestingPinia();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('shows the totals of the last 30 days, today included', async () => {
		const { findByTestId } = renderComponent();

		expect(await findByTestId('assistant-usage-kpi-messages')).toHaveTextContent('7');
		expect(fetchAssistantUsage).toHaveBeenCalledWith(expect.anything(), {
			startDate: new Date(2026, 9, 30),
			endDate: new Date(2026, 10, 28, 15, 30),
			projectId: undefined,
		});
	});

	it('shows the tokens of each day under the conversations', async () => {
		const { findByTestId } = renderComponent();

		await findByTestId('assistant-usage-tokens');
		const [conversations, tokens] = charts;
		expect(conversations.data.datasets[0].data).toEqual([1, 2]);
		expect(tokens.data.datasets[0].data).toEqual([1050, 61_629]);
	});

	it('shows the tokens of each user as a short total', async () => {
		const { findByTestId } = renderComponent();

		expect(await findByTestId('assistant-usage-tokens-user-1')).toHaveTextContent('62.7K');
		expect(fetchAssistantUsageUsers).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ skip: 0, take: 10, sortBy: 'messages:desc' }),
		);
	});

	it('shows the empty state when nobody used the Assistant', async () => {
		vi.mocked(fetchAssistantUsage).mockResolvedValue({
			summary: {
				...usage.summary,
				conversations: 0,
				messages: 0,
				activeUsers: 0,
				workflowsCreated: 0,
			},
			byDay: [day('2026-11-28')],
		});

		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('assistant-usage-empty')).toBeVisible();
		expect(queryByTestId('assistant-usage-users')).toBeNull();
	});

	it('shows the charts for a period with tokens but no messages', async () => {
		vi.mocked(fetchAssistantUsage).mockResolvedValue({
			summary: {
				...usage.summary,
				conversations: 0,
				messages: 0,
				activeUsers: 0,
				workflowsCreated: 0,
			},
			byDay: [day('2026-11-28', { inputTokens: 900, outputTokens: 40 })],
		});

		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('assistant-usage-tokens')).toBeVisible();
		expect(queryByTestId('assistant-usage-empty')).toBeNull();
	});

	it('loads the usage of another period', async () => {
		const { findByTestId, getByTestId } = renderComponent();
		await findByTestId('assistant-usage-kpis');

		const select = getByTestId('assistant-usage-period');
		await fireEvent.click(select.querySelector('input')!);
		const listboxId = select.querySelector('input')?.getAttribute('aria-controls');
		const option = Array.from(
			document.getElementById(listboxId!)?.querySelectorAll('[role="option"]') ?? [],
		).find((element) => element.textContent === 'settings.n8nAgent.usage.period.last7Days');
		await fireEvent.click(option!);

		await waitFor(() =>
			expect(fetchAssistantUsage).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ startDate: new Date(2026, 10, 22) }),
			),
		);
		await waitFor(() =>
			expect(fetchAssistantUsageUsers).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ startDate: new Date(2026, 10, 22), skip: 0 }),
			),
		);
	});

	it('goes back to the Assistant settings', async () => {
		const { findByTestId } = renderComponent();

		await fireEvent.click(await findByTestId('settings-back-button'));

		expect(push).toHaveBeenCalledWith({ name: INSTANCE_AI_SETTINGS_VIEW });
	});
});
