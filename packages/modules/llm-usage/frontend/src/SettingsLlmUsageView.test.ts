import type {
	LlmUsageCallItem,
	LlmUsageCallsResponse,
	LlmUsageSummaryResponse,
} from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';

import SettingsLlmUsageView from './SettingsLlmUsageView.vue';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

vi.mock('vue-chartjs', () => ({ Bar: { template: '<div>Bar</div>' } }));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const fetchSummaryMock = vi.fn<ApiMock>();
const fetchCallsMock = vi.fn<ApiMock>();
vi.mock('./llm-usage.api', () => ({
	fetchLlmUsageSummary: async (...args: unknown[]) => await fetchSummaryMock(...args),
	fetchLlmUsageCalls: async (...args: unknown[]) => await fetchCallsMock(...args),
}));

const totals = {
	calls: 3,
	unpricedCalls: 1,
	inputTokens: 1200,
	outputTokens: 300,
	cacheReadTokens: 0,
	costUsd: 1.25,
};
const group = (key: string, label: string) => ({ key, label, ...totals });

const summary: LlmUsageSummaryResponse = {
	totals,
	daily: [{ date: '2026-10-21', calls: 3, costUsd: 1.25 }],
	top: {
		workflow: [group('wf-1', 'Support triage')],
		agent: [group('agent-1', 'Triage agent')],
		model: [group('openai/gpt-x', 'openai/gpt-x')],
		caller: [{ ...group('agent', 'agent'), caller: 'agent' }],
		user: [group('user-1', 'ada@example.com')],
	},
};

const call = (overrides: Partial<LlmUsageCallItem>): LlmUsageCallItem => ({
	callId: 'c-1',
	startedAt: null,
	finishedAt: '2026-10-21T10:00:00.000Z',
	durationMs: 900,
	callerType: 'node',
	subType: 'http',
	workflowId: 'wf-1',
	workflowName: 'Support triage',
	executionId: '7',
	executionMode: 'manual',
	nodeName: 'Classify ticket',
	agentId: null,
	agentName: null,
	threadId: null,
	threadTitle: null,
	projectId: 'project-1',
	projectName: 'Ops',
	userId: 'user-1',
	userEmail: 'ada@example.com',
	credentialName: 'Support key',
	managedBy: null,
	provider: 'moonshot',
	model: 'kimi-k3',
	inputTokens: 1200,
	outputTokens: 300,
	estimatedCostUsd: 1.25,
	priced: true,
	...overrides,
});

const calls: LlmUsageCallsResponse = {
	count: 4,
	items: [
		call({}),
		call({
			callId: 'c-2',
			callerType: 'agent',
			workflowId: null,
			workflowName: null,
			nodeName: null,
			agentId: 'agent-1',
			agentName: 'Triage agent',
			threadId: 'session-1',
			threadTitle: 'Refund question',
			credentialName: null,
			managedBy: 'aiGateway',
			durationMs: null,
			provider: 'anthropic',
			model: 'claude-x',
			estimatedCostUsd: null,
			priced: false,
		}),
		call({
			callId: 'c-4',
			callerType: 'instance-ai',
			workflowId: null,
			workflowName: null,
			nodeName: null,
			threadId: 'thread-2',
			threadTitle: 'Another user session',
			credentialName: null,
			managedBy: 'assistant',
			userId: 'user-2',
			provider: 'openai',
			model: 'gpt-y',
			durationMs: 2500,
			estimatedCostUsd: 0.00003,
		}),
		call({
			callId: 'c-3',
			callerType: 'instance-ai',
			workflowId: null,
			workflowName: null,
			nodeName: null,
			threadId: 'thread-1',
			threadTitle: 'Fix the invoice workflow',
			credentialName: null,
			provider: 'openai',
			model: 'gpt-x',
			durationMs: 1500,
		}),
	],
};

const render = () =>
	createComponentRenderer(SettingsLlmUsageView, {
		pinia: createTestingPinia({
			stubActions: false,
			initialState: { users: { currentUserId: 'user-1' } },
		}),
	})();

describe('SettingsLlmUsageView', () => {
	beforeEach(() => {
		fetchSummaryMock.mockResolvedValue(summary);
		fetchCallsMock.mockResolvedValue(calls);
	});

	it('shows the totals, the daily spend, the top spenders and one page of calls', async () => {
		render();

		expect(await screen.findByText('Classify ticket')).toBeInTheDocument();
		expect(screen.getByText(/based on public list prices/)).toBeInTheDocument();
		expect(screen.getByTestId('llm-usage-total-cost')).toHaveTextContent('$1.25');
		expect(screen.getByTestId('llm-usage-total-cost')).toHaveTextContent('1 unpriced');
		expect(screen.getByTestId('llm-usage-spend-chart')).toBeInTheDocument();
		expect(
			within(screen.getByTestId('llm-usage-top-workflow')).getByText('Support triage'),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('llm-usage-top-agent')).getByText('Triage agent'),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('llm-usage-top-caller')).getByText('Agent'),
		).toBeInTheDocument();

		const table = screen.getByTestId('llm-usage-calls');
		expect(within(table).getByText('moonshot')).toBeInTheDocument();
		expect(within(table).getByText('kimi-k3')).toBeInTheDocument();
		expect(within(table).getByText('0.9 sec')).toBeInTheDocument();
		// Each call names its agent, session or workflow, and shows its caller.
		expect(within(table).getByText('Triage agent')).toBeInTheDocument();
		expect(within(table).getByText('Refund question')).toBeInTheDocument();
		expect(within(table).getByText('Fix the invoice workflow')).toBeInTheDocument();
		expect(within(table).getByText('Agent')).toBeInTheDocument();
		expect(within(table).getAllByText('n8n Assistant')).toHaveLength(2);
		// Another user's n8n Assistant session gets no link: only its owner can open it.
		expect(within(table).getAllByTestId('llm-usage-call-link')).toHaveLength(3);
		expect(within(table).getByText('Another user session')).toBeInTheDocument();
		// A cost below a cent keeps its significant digits.
		expect(within(table).getByText('$0.00003')).toBeInTheDocument();
		expect(within(table).getByText('Unpriced')).toBeInTheDocument();
		// The credential name, or the credits that pay when n8n manages the key.
		expect(within(table).getByText('Support key')).toBeInTheDocument();
		expect(within(table).getByText('Gateway credits')).toBeInTheDocument();
		expect(within(table).getByText('Assistant credits')).toBeInTheDocument();
		expect(fetchCallsMock).toHaveBeenCalledWith(expect.anything(), {
			days: 30,
			skip: 0,
			take: 25,
			sortBy: 'finishedAt',
			sortOrder: 'desc',
		});
	});

	it('sorts the calls on the server when a column header is clicked', async () => {
		render();
		const table = await screen.findByTestId('llm-usage-calls');
		await within(table).findByText('Classify ticket');

		await fireEvent.mouseDown(within(table).getByText('Estimated cost'));
		await waitFor(() =>
			expect(fetchCallsMock).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ sortBy: 'estimatedCostUsd', skip: 0 }),
			),
		);

		await fireEvent.mouseDown(within(table).getByText('Model'));
		await waitFor(() =>
			expect(fetchCallsMock).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({ sortBy: 'model' }),
			),
		);
	});

	it('loads the selected range', async () => {
		render();
		await screen.findByText('Classify ticket');

		await userEvent.click(screen.getByTestId('llm-usage-range').querySelector('input')!);
		await userEvent.click(await screen.findByText('Last 7 days'));

		await waitFor(() => expect(fetchSummaryMock).toHaveBeenLastCalledWith(expect.anything(), 7));
		expect(fetchCallsMock).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.objectContaining({ days: 7, skip: 0 }),
		);
	});

	it('shows the empty state when there are no calls', async () => {
		fetchSummaryMock.mockResolvedValue({ ...summary, totals: { ...totals, calls: 0 } });
		render();

		expect(await screen.findByText('No LLM calls in the last 30 days')).toBeInTheDocument();
		expect(screen.getByText(/based on public list prices/)).toBeInTheDocument();
	});
});
