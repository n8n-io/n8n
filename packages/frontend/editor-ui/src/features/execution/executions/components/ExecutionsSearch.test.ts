import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import merge from 'lodash/merge';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import ExecutionsSearch from './ExecutionsSearch.vue';
import { DEBUG_PAYWALL_MODAL_KEY } from '../executions.constants';
import type { ExecutionSearchCriteria } from '../executions.types';

const goToUpgrade = vi.fn();
vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade }),
}));

const render = (
	props: { search?: ExecutionSearchCriteria; nodeNames?: string[] } = {},
	{ licensed = true }: { licensed?: boolean } = {},
) => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					enterprise: { advancedExecutionFilters: licensed },
				}),
			},
		},
	});
	return createComponentRenderer(ExecutionsSearch, { pinia })({
		props: { search: { text: '', nodeName: '' }, ...props },
	});
};

describe('ExecutionsSearch', () => {
	it('searches on Enter and not while the user types', async () => {
		const { getByTestId, emitted } = render();

		await userEvent.type(getByTestId('executions-search-input'), ' ENG-123 ');

		expect(emitted('update:search')).toBeUndefined();
		expect(getByTestId('executions-search-enter-hint')).toBeInTheDocument();

		await userEvent.keyboard('{Enter}');

		expect(emitted('update:search')).toEqual([[{ text: 'ENG-123', nodeName: '' }]]);
	});

	it('keeps the node of the search when the text changes', async () => {
		const { getByTestId, emitted } = render({
			search: { text: '', nodeName: 'Webhook' },
			nodeNames: ['Webhook'],
		});

		await userEvent.type(getByTestId('executions-search-input'), 'ENG-123{Enter}');

		expect(emitted('update:search')).toEqual([[{ text: 'ENG-123', nodeName: 'Webhook' }]]);
	});

	it('does not search for text that is too short, and says why', async () => {
		const { getByTestId, queryByTestId, emitted } = render();

		await userEvent.type(getByTestId('executions-search-input'), 'ab{Enter}');

		expect(emitted('update:search')).toBeUndefined();
		expect(getByTestId('executions-search-too-short')).toBeInTheDocument();
		expect(queryByTestId('executions-search-enter-hint')).not.toBeInTheDocument();

		await userEvent.type(getByTestId('executions-search-input'), 'c');

		expect(queryByTestId('executions-search-too-short')).not.toBeInTheDocument();
	});

	it('does not search again for the text that the list shows', async () => {
		const { getByTestId, queryByTestId, emitted } = render({
			search: { text: 'ENG-123', nodeName: '' },
		});

		expect(getByTestId('executions-search-input')).toHaveValue('ENG-123');
		expect(queryByTestId('executions-search-enter-hint')).not.toBeInTheDocument();

		await userEvent.type(getByTestId('executions-search-input'), '{Enter}');

		expect(emitted('update:search')).toBeUndefined();
	});

	it('ends the text search when the user empties the field', async () => {
		const { getByTestId, emitted } = render({ search: { text: 'ENG-123', nodeName: 'Webhook' } });

		await userEvent.clear(getByTestId('executions-search-input'));

		expect(emitted('update:search')).toEqual([[{ text: '', nodeName: 'Webhook' }]]);
	});

	it('searches at once when the user selects a node', async () => {
		const { getByTestId, emitted } = render({
			search: { text: 'ENG-123', nodeName: '' },
			nodeNames: ['Slack', 'Webhook'],
		});

		const items = await getDropdownItems(getByTestId('executions-search'));
		expect([...items].map((item) => item.textContent?.trim())).toEqual(['Slack', 'Webhook']);
		await userEvent.click(items[1]);

		expect(emitted('update:search')).toEqual([[{ text: 'ENG-123', nodeName: 'Webhook' }]]);
	});

	it('disables the node select when there are no nodes to select', () => {
		const { getByTestId } = render();

		expect(getByTestId('executions-search').querySelector('[role="combobox"]')).toBeDisabled();
		expect(getByTestId('executions-search-input')).toBeEnabled();
	});

	describe('without the license', () => {
		const expectPaywall = (times: number) => {
			const { openModalWithData } = useUIStore();
			expect(openModalWithData).toHaveBeenCalledTimes(times);
			expect(openModalWithData).toHaveBeenCalledWith({
				name: DEBUG_PAYWALL_MODAL_KEY,
				data: expect.objectContaining({
					title: 'Upgrade to access Execution Search',
					content: expect.stringContaining('Execution Search finds previous executions'),
				}),
			});
		};

		beforeEach(() => {
			goToUpgrade.mockClear();
		});

		it('shows the search as usable', () => {
			const { getByTestId } = render({ nodeNames: ['Webhook'] }, { licensed: false });

			expect(getByTestId('executions-search-input')).toBeEnabled();
			expect(getByTestId('executions-search').querySelector('[role="combobox"]')).toBeEnabled();
		});

		it('opens the paywall when the user clicks the search field', async () => {
			const { getByTestId, emitted } = render({}, { licensed: false });

			await userEvent.click(getByTestId('executions-search-input'));

			expectPaywall(1);
			expect(emitted('update:search')).toBeUndefined();
		});

		it('opens the paywall and keeps the field empty when the user types', async () => {
			const { getByTestId, emitted } = render({}, { licensed: false });
			const input = getByTestId('executions-search-input');

			input.focus();
			await userEvent.keyboard('a');

			expectPaywall(1);
			expect(input).toHaveValue('');
			expect(emitted('update:search')).toBeUndefined();
		});

		it('does not open the paywall when the user tabs through the search', async () => {
			const { getByTestId } = render({ nodeNames: ['Webhook'] }, { licensed: false });

			getByTestId('executions-search-input').focus();
			await userEvent.tab();

			expect(useUIStore().openModalWithData).not.toHaveBeenCalled();
		});

		it('opens the paywall and not the node list when the user clicks the node select', async () => {
			const { getByTestId, emitted } = render({ nodeNames: ['Webhook'] }, { licensed: false });
			const select = getByTestId('executions-search').querySelector('[role="combobox"]');

			await userEvent.click(select as Element);

			expectPaywall(1);
			expect(select).toHaveAttribute('aria-expanded', 'false');
			expect(emitted('update:search')).toBeUndefined();
		});

		it('goes to the plans from the paywall', async () => {
			const { getByTestId } = render({}, { licensed: false });
			const uiStore = useUIStore();

			await userEvent.click(getByTestId('executions-search-input'));
			const { data } = vi.mocked(uiStore.openModalWithData).mock.calls[0][0];
			(data as { footerButtonAction: () => void }).footerButtonAction();

			expect(uiStore.closeModal).toHaveBeenCalledWith(DEBUG_PAYWALL_MODAL_KEY);
			expect(goToUpgrade).toHaveBeenCalledWith('custom-data-filter', 'upgrade-custom-data-filter');
		});
	});
});
