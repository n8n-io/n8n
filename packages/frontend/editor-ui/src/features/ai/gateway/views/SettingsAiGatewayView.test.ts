import { createPinia, setActivePinia } from 'pinia';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import SettingsAiGatewayView from './SettingsAiGatewayView.vue';
import { createComponentRenderer } from '@/__tests__/render';

const mockGetGatewayUsage = vi.fn();

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	getGatewayConfig: vi.fn(),
	getGatewayCredits: vi.fn(),
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
		creditsDeducted: 2,
	},
	{
		provider: 'anthropic',
		model: 'claude-3',
		timestamp: new Date('2024-01-16T14:00:00Z').getTime(),
		inputTokens: undefined,
		outputTokens: undefined,
		creditsDeducted: 5,
	},
];

const renderComponent = createComponentRenderer(SettingsAiGatewayView);

describe('SettingsAiGatewayView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		mockGetGatewayUsage.mockResolvedValue({ entries: [], total: 0 });
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

	describe('providerLabel()', () => {
		it('should map known provider keys to display names', async () => {
			mockGetGatewayUsage.mockResolvedValue({ entries: MOCK_ENTRIES, total: 2 });
			renderComponent();

			await waitFor(() => expect(screen.getByText('Google')).toBeInTheDocument());
			expect(screen.getByText('Anthropic')).toBeInTheDocument();
		});

		it('should fall back to the raw provider string for unknown providers', async () => {
			mockGetGatewayUsage.mockResolvedValue({
				entries: [{ ...MOCK_ENTRIES[0], provider: 'mystery-ai' }],
				total: 1,
			});
			renderComponent();

			await waitFor(() => expect(screen.getByText('mystery-ai')).toBeInTheDocument());
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
			await waitFor(() => expect(mockGetGatewayUsage).toHaveBeenCalledOnce());

			mockGetGatewayUsage.mockClear();
			await userEvent.click(screen.getByRole('button', { name: /refresh/i }));

			await waitFor(() => expect(mockGetGatewayUsage).toHaveBeenCalledOnce());
			expect(mockGetGatewayUsage).toHaveBeenCalledWith(expect.anything(), 0, 50);
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
});
