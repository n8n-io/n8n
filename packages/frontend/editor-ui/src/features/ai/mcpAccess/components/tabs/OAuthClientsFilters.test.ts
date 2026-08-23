import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import OAuthClientsFilters from '@/features/ai/mcpAccess/components/tabs/OAuthClientsFilters.vue';
import { EMPTY_OAUTH_CLIENT_FILTERS } from '@/features/ai/mcpAccess/clients.utils';

const createComponent = createComponentRenderer(OAuthClientsFilters, {
	pinia: createTestingPinia(),
});

describe('OAuthClientsFilters', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render the type and connected selects but no owner select on the mine view', async () => {
		const { getByTestId, queryByTestId } = createComponent({
			props: {
				modelValue: { ...EMPTY_OAUTH_CLIENT_FILTERS },
				showOwnerFilter: false,
			},
		});

		await userEvent.click(getByTestId('mcp-clients-filters-trigger'));

		expect(getByTestId('mcp-clients-filters-dropdown')).toBeVisible();
		expect(getByTestId('mcp-clients-filter-type')).toBeInTheDocument();
		expect(getByTestId('mcp-clients-filter-connected')).toBeInTheDocument();
		expect(queryByTestId('mcp-clients-filter-owner')).not.toBeInTheDocument();
	});

	it('should render the owner select on the all view', async () => {
		const { getByTestId } = createComponent({
			props: {
				modelValue: { ...EMPTY_OAUTH_CLIENT_FILTERS },
				showOwnerFilter: true,
				owners: [{ id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' }],
			},
		});

		await userEvent.click(getByTestId('mcp-clients-filters-trigger'));

		expect(getByTestId('mcp-clients-filter-owner')).toBeInTheDocument();
	});

	it('should show the active filter count on the trigger', () => {
		const { getByTestId } = createComponent({
			props: {
				modelValue: { ...EMPTY_OAUTH_CLIENT_FILTERS, type: 'cli', connected: 'last7' },
			},
		});

		expect(getByTestId('mcp-clients-filters-count')).toHaveTextContent('2');
	});

	it('should not count the text search as an active filter', () => {
		const { queryByTestId } = createComponent({
			props: {
				modelValue: { ...EMPTY_OAUTH_CLIENT_FILTERS, search: 'claude' },
			},
		});

		expect(queryByTestId('mcp-clients-filters-count')).not.toBeInTheDocument();
	});

	it('should reset the popover filters but keep the search term', async () => {
		const { getByTestId, emitted } = createComponent({
			props: {
				modelValue: {
					search: 'claude',
					type: 'cli' as const,
					ownerId: 'user-1',
					connected: 'last7' as const,
				},
				showOwnerFilter: true,
			},
		});

		await userEvent.click(getByTestId('mcp-clients-filters-trigger'));
		await userEvent.click(getByTestId('mcp-clients-filters-reset'));

		expect(emitted('update:modelValue')).toEqual([
			[{ search: 'claude', type: null, ownerId: null, connected: null }],
		]);
	});
});
