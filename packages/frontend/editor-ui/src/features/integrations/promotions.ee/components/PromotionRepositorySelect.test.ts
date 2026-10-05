import { createTestingPinia } from '@pinia/testing';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import type * as PromotionsApi from '../promotionsSettings.api';
import PromotionRepositorySelect from './PromotionRepositorySelect.vue';

const api = vi.hoisted(() => ({
	fetchPromotionRepositories: vi.fn<typeof PromotionsApi.fetchPromotionRepositories>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockShowError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: vi.fn() }),
}));

const repository = (fullPath: string) => ({
	id: fullPath,
	fullPath,
	remoteUrl: `https://gitlab.example.com/${fullPath}.git`,
});

const renderComponent = createComponentRenderer(PromotionRepositorySelect, {
	props: { providerId: 'provider-gitlab', modelValue: '' },
});

const optionLabels = (items: ArrayLike<Element>) =>
	Array.from(items).map((item) => item.textContent?.trim());

describe('PromotionRepositorySelect', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
		// Run debounced searches at once.
		sessionStorage.setItem('N8N_DEBOUNCE_MULTIPLIER', '0');
		api.fetchPromotionRepositories.mockResolvedValue({
			data: [repository('platform/api'), repository('platform/web')],
			nextCursor: null,
		});
	});

	afterEach(() => {
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
	});

	it('lists the repositories of the provider and selects a remote URL', async () => {
		const { getByTestId, emitted } = renderComponent();

		await waitFor(() =>
			expect(api.fetchPromotionRepositories).toHaveBeenCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ search: undefined },
			),
		);
		const items = await getDropdownItems(getByTestId('promotion-connection-repository-select'));
		expect(optionLabels(items)).toEqual(['platform/api', 'platform/web']);

		await userEvent.click(items[1]);

		expect(emitted('update:modelValue')).toEqual([['https://gitlab.example.com/platform/web.git']]);
	});

	it('searches the host as the user types', async () => {
		const { getByTestId } = renderComponent();
		const select = getByTestId('promotion-connection-repository-select');

		await userEvent.type(within(select).getByRole('combobox'), 'web');

		await waitFor(() =>
			expect(api.fetchPromotionRepositories).toHaveBeenLastCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ search: 'web' },
			),
		);
	});

	it('keeps a saved remote that the loaded results leave out', async () => {
		const saved = 'https://gitlab.example.com/legacy/tool.git';
		const { getByTestId } = renderComponent({ props: { modelValue: saved } });

		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalled());
		const items = await getDropdownItems(getByTestId('promotion-connection-repository-select'));

		expect(optionLabels(items)).toEqual([saved, 'platform/api', 'platform/web']);
	});

	it('shows an error when the repositories cannot load', async () => {
		api.fetchPromotionRepositories.mockRejectedValue(new Error('GitLab rejected the access token'));

		renderComponent();

		await waitFor(() =>
			expect(mockShowError).toHaveBeenCalledWith(expect.any(Error), "Couldn't load repositories"),
		);
	});

	it('loads another page without replacing the first page or adding duplicate options', async () => {
		api.fetchPromotionRepositories
			.mockResolvedValueOnce({ data: [repository('platform/api')], nextCursor: 'next-page' })
			.mockResolvedValueOnce({
				data: [repository('platform/api'), repository('platform/web')],
				nextCursor: null,
			});
		const { getByTestId, queryByTestId, queryAllByTestId } = renderComponent();

		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(1));
		await getDropdownItems(getByTestId('promotion-connection-repository-select'));
		await userEvent.click(getByTestId('promotion-connection-repository-load-more'));

		await waitFor(() =>
			expect(api.fetchPromotionRepositories).toHaveBeenLastCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ search: undefined, cursor: 'next-page' },
			),
		);
		await waitFor(() =>
			expect(queryByTestId('promotion-connection-repository-load-more')).not.toBeInTheDocument(),
		);
		expect(optionLabels(queryAllByTestId('promotion-connection-repository-option'))).toEqual([
			'platform/api',
			'platform/web',
		]);
	});

	it('ignores results from the previous provider', async () => {
		const previous =
			createDeferredPromise<Awaited<ReturnType<typeof PromotionsApi.fetchPromotionRepositories>>>();
		api.fetchPromotionRepositories
			.mockReturnValueOnce(previous.promise)
			.mockResolvedValueOnce({ data: [repository('other/repo')], nextCursor: null });
		const { getByTestId, rerender } = renderComponent();
		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(1));

		await rerender({ providerId: 'provider-other', modelValue: '' });
		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
		previous.resolve({ data: [repository('previous/repo')], nextCursor: 'stale-page' });

		const items = await getDropdownItems(getByTestId('promotion-connection-repository-select'));
		expect(optionLabels(items)).toEqual(['other/repo']);
	});

	it('ignores an older response when a newer search completes', async () => {
		const previous =
			createDeferredPromise<Awaited<ReturnType<typeof PromotionsApi.fetchPromotionRepositories>>>();
		api.fetchPromotionRepositories
			.mockReturnValueOnce(previous.promise)
			.mockResolvedValue({ data: [repository('platform/web')], nextCursor: null });
		const { getByTestId, queryAllByTestId } = renderComponent();
		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(1));
		const select = getByTestId('promotion-connection-repository-select');

		await userEvent.type(within(select).getByRole('combobox'), 'web');
		await waitFor(() =>
			expect(api.fetchPromotionRepositories).toHaveBeenLastCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ search: 'web' },
			),
		);
		previous.resolve({ data: [repository('previous/repo')], nextCursor: null });

		await waitFor(() =>
			expect(optionLabels(queryAllByTestId('promotion-connection-repository-option'))).toEqual([
				'platform/web',
			]),
		);
	});

	it('leaves loaded results available when another page fails', async () => {
		api.fetchPromotionRepositories
			.mockResolvedValueOnce({ data: [repository('platform/api')], nextCursor: 'next-page' })
			.mockRejectedValueOnce(new Error('Temporary failure'));
		const { getByTestId, queryAllByTestId } = renderComponent();
		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalled());
		await getDropdownItems(getByTestId('promotion-connection-repository-select'));

		await userEvent.click(getByTestId('promotion-connection-repository-load-more'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalled());
		expect(getByTestId('promotion-connection-repository-load-more')).toBeEnabled();
		expect(optionLabels(queryAllByTestId('promotion-connection-repository-option'))).toEqual([
			'platform/api',
		]);
	});

	it('does not refetch or show another error when the same empty search is repeated', async () => {
		api.fetchPromotionRepositories.mockRejectedValue(new Error('Temporary failure'));
		const { getByTestId } = renderComponent();
		await waitFor(() => expect(mockShowError).toHaveBeenCalledTimes(1));
		const input = within(getByTestId('promotion-connection-repository-select')).getByRole(
			'combobox',
		);

		await userEvent.click(input);
		await userEvent.click(input);

		expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(1);
		expect(mockShowError).toHaveBeenCalledTimes(1);
	});

	it('can retry the initial repository request without reloading the page', async () => {
		api.fetchPromotionRepositories.mockRejectedValueOnce(new Error('Temporary failure'));
		const { getByTestId, queryByTestId, queryAllByTestId } = renderComponent();
		await waitFor(() => expect(mockShowError).toHaveBeenCalledTimes(1));
		await userEvent.click(
			within(getByTestId('promotion-connection-repository-select')).getByRole('combobox'),
		);

		await userEvent.click(getByTestId('promotion-connection-repository-retry'));

		await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
		await waitFor(() =>
			expect(queryByTestId('promotion-connection-repository-retry')).not.toBeInTheDocument(),
		);
		expect(optionLabels(queryAllByTestId('promotion-connection-repository-option'))).toEqual([
			'platform/api',
			'platform/web',
		]);
	});
});
