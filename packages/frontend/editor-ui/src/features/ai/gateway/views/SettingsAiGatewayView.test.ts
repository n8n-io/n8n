import { createPinia, setActivePinia } from 'pinia';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';
import type * as VueRouter from 'vue-router';
import SettingsAiGatewayView from './SettingsAiGatewayView.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, VIEWS } from '@/app/constants';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof VueRouter>();
	return { ...actual, useRouter: vi.fn() };
});

const mockGetGatewayUsage = vi.fn();
const mockGetGatewayWallet = vi.fn();

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayConfig: vi.fn(),
	getGatewayWallet: (...args: unknown[]) => mockGetGatewayWallet(...args),
	getGatewayUsage: (...args: unknown[]) => mockGetGatewayUsage(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({ set: vi.fn() })),
}));

const MOCK_ENTRIES = [
	{
		provider: 'google',
		model: 'gemini-pro',
		timestamp: new Date('2024-01-15T10:30:00Z').getTime(),
		inputTokens: 100,
		outputTokens: 50,
		cost: 2,
	},
	{
		provider: 'anthropic',
		model: 'claude-3',
		timestamp: new Date('2024-01-16T14:00:00Z').getTime(),
		inputTokens: undefined,
		outputTokens: undefined,
		cost: 5,
	},
];

const renderComponent = createComponentRenderer(SettingsAiGatewayView);

const mockRouterPush = vi.fn();

describe('SettingsAiGatewayView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		mockGetGatewayUsage.mockResolvedValue({ entries: [], total: 0 });
		mockGetGatewayWallet.mockResolvedValue({ balance: 42, budget: 100 });
		(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockRouterPush });
	});

	describe('balance card', () => {
		it('should display balance after fetching', async () => {
			renderComponent();

			await waitFor(() => expect(screen.getByTestId('settings-ai-gateway')).toBeInTheDocument());
			const store = useAiGatewayStore();
			await waitFor(() => expect(store.balance).toBe(42));
			expect(screen.getByText('$42.00 remaining')).toBeInTheDocument();
		});

		it('should not render the balance before data loads', () => {
			mockGetGatewayWallet.mockReturnValue(new Promise(() => {})); // never resolves
			renderComponent();

			expect(screen.queryByTestId('ai-gateway-topup-button')).not.toBeNull(); // button present
			// number not yet visible (balance undefined)
			expect(screen.queryByText('$42.00 remaining')).not.toBeInTheDocument();
		});

		it('should open top-up modal when "Top up credits" button is clicked', async () => {
			renderComponent();

			await waitFor(() =>
				expect(screen.getByTestId('ai-gateway-topup-button')).toBeInTheDocument(),
			);

			const uiStore = useUIStore();
			vi.spyOn(uiStore, 'openModalWithData');

			await userEvent.click(screen.getByTestId('ai-gateway-topup-button'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: AI_GATEWAY_TOP_UP_MODAL_KEY,
				data: {},
			});
		});
	});

	describe('on mount', () => {
		it('should fetch usage with offset=0 on mount', async () => {
			renderComponent();

			await waitFor(() => expect(mockGetGatewayUsage).toHaveBeenCalledOnce());
			expect(mockGetGatewayUsage).toHaveBeenCalledWith(expect.anything(), 0, 50);
		});

		it('should show empty state when there are no entries', async () => {
			renderComponent();

			await waitFor(() => expect(screen.getByText('No usage records found.')).toBeInTheDocument());
		});

		it('should render table rows for each entry', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 2 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());
			expect(screen.getByText('claude-3')).toBeInTheDocument();
		});
	});

	describe('provider', () => {
		it('should render the raw provider string', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 2 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('google')).toBeInTheDocument());
			expect(screen.getByText('anthropic')).toBeInTheDocument();
		});
	});

	describe('formatTokens()', () => {
		it('should show — for undefined token counts', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: [MOCK_ENTRIES[1]], total: 1 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('claude-3')).toBeInTheDocument());
			expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('refresh()', () => {
		it('should re-fetch from offset=0 when refresh is clicked', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 100 });
			renderComponent();
			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());

			mockGetGatewayUsage.mockClear();
			await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

			await waitFor(() => expect(mockGetGatewayUsage).toHaveBeenCalledOnce());
			expect(mockGetGatewayUsage).toHaveBeenCalledWith(expect.anything(), 0, 50);
		});

		it('should re-fetch wallet balance when refresh is clicked', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 100 });
			renderComponent();
			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());
			await waitFor(() => expect(screen.getByText('$42.00 remaining')).toBeInTheDocument());

			mockGetGatewayWallet.mockClear();
			mockGetGatewayWallet.mockResolvedValue({ balance: 35, budget: 100 });
			await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

			await waitFor(() => expect(mockGetGatewayWallet).toHaveBeenCalledOnce());
			await waitFor(() => expect(screen.getByText('$35.00 remaining')).toBeInTheDocument());
		});
	});

	describe('loadMore()', () => {
		it('should not show Load More button when all entries are loaded', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 2 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());
			expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
		});

		it('should show Load More button when more entries exist', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 100 });
			renderComponent();

			await waitFor(() =>
				expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument(),
			);
		});

		it('should ignore rapid clicks while loading', async () => {
			let resolveFirst!: () => void;
			const firstCall = new Promise<{ entries: typeof MOCK_ENTRIES; total: number }>(
				(resolve) => (resolveFirst = () => resolve({ entries: MOCK_ENTRIES, total: 100 })),
			);
			mockGetGatewayUsage.mockResolvedValueOnce({ entries: MOCK_ENTRIES, total: 100 });
			renderComponent();

			await waitFor(() =>
				expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument(),
			);

			mockGetGatewayUsage.mockReturnValueOnce(firstCall);
			const loadMoreBtn = screen.getByRole('button', { name: /load more/i });

			// Click twice rapidly
			await userEvent.click(loadMoreBtn);
			await userEvent.click(loadMoreBtn);

			resolveFirst();

			// fetchMoreUsage should only have been called once for the rapid double-click
			await waitFor(() => expect(mockGetGatewayUsage).toHaveBeenCalledTimes(2));
			expect(mockGetGatewayUsage).toHaveBeenCalledTimes(2); // 1 initial + 1 loadMore
		});

		it('should fetch the next page and append entries when Load More is clicked', async () => {
			const page2 = [{ ...MOCK_ENTRIES[0], model: 'gemini-ultra' }];
			mockGetGatewayUsage
				.mockResolvedValueOnce({ entries: MOCK_ENTRIES, total: 100 })
				.mockResolvedValueOnce({ entries: page2, total: 100 });
			renderComponent();

			await waitFor(() =>
				expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument(),
			);

			await userEvent.click(screen.getByRole('button', { name: /load more/i }));

			await waitFor(() => expect(screen.getByText('gemini-ultra')).toBeInTheDocument());
			// Original entries still present (appended, not replaced)
			expect(screen.getByText('gemini-pro')).toBeInTheDocument();
			expect(mockGetGatewayUsage).toHaveBeenLastCalledWith(expect.anything(), 50, 50);
		});
	});

	describe('row click navigation', () => {
		const entryWithExecution = {
			provider: 'google',
			model: 'gemini-pro',
			timestamp: new Date('2024-01-15T10:30:00Z').getTime(),
			cost: 2,
			metadata: { executionId: '29021', workflowId: 'R9JFXwkUCL1jZBuw' },
		};

		const entryWithoutMetadata = {
			provider: 'anthropic',
			model: 'claude-3',
			timestamp: new Date('2024-01-16T14:00:00Z').getTime(),
			cost: 5,
		};

		it('navigates to execution preview when row has metadata.executionId and metadata.workflowId', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: [entryWithExecution], total: 1 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());

			await userEvent.click(screen.getByText('gemini-pro'));

			expect(mockRouterPush).toHaveBeenCalledWith({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { workflowId: 'R9JFXwkUCL1jZBuw', executionId: '29021' },
			});
		});

		it('does not navigate when row has no execution metadata', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: [entryWithoutMetadata], total: 1 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('claude-3')).toBeInTheDocument());

			await userEvent.click(screen.getByText('claude-3'));

			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it('does not navigate when row has executionId but no workflowId', async () => {
			const entryWithExecutionOnly = {
				...entryWithExecution,
				metadata: { executionId: '29021' },
			};
			mockGetGatewayUsage.mockResolvedValue({ entries: [entryWithExecutionOnly], total: 1 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());

			await userEvent.click(screen.getByText('gemini-pro'));

			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it('does not navigate when row has workflowId but no executionId', async () => {
			const entryWithWorkflowOnly = {
				...entryWithExecution,
				metadata: { workflowId: 'R9JFXwkUCL1jZBuw' },
			};
			mockGetGatewayUsage.mockResolvedValue({ entries: [entryWithWorkflowOnly], total: 1 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('gemini-pro')).toBeInTheDocument());

			await userEvent.click(screen.getByText('gemini-pro'));

			expect(mockRouterPush).not.toHaveBeenCalled();
		});
	});
});
