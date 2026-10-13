import type { PromotionRepository, PromotionRepositoryListPublicDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import type * as PromotionsApi from '../promotionsSettings.api';
import PromotionGitHostSelect from './PromotionGitHostSelect.vue';

const api = vi.hoisted(() => ({
	fetchPromotionRepositories: vi.fn<typeof PromotionsApi.fetchPromotionRepositories>(),
	fetchPromotionBranches: vi.fn<typeof PromotionsApi.fetchPromotionBranches>(),
}));
vi.mock('../promotionsSettings.api', () => api);

const repository: PromotionRepository = {
	id: '42',
	name: 'Workflows',
	fullPath: 'team/workflows',
	remoteUrl: 'https://gitlab.example.com/team/workflows.git',
	defaultBranch: 'main',
};
const otherRepository: PromotionRepository = {
	...repository,
	id: '43',
	name: 'Other',
	fullPath: 'team/other',
	remoteUrl: 'https://gitlab.example.com/team/other.git',
};

const renderSelect = createComponentRenderer(PromotionGitHostSelect, {
	props: { modelValue: '', providerId: 'gitlab-1', kind: 'repository', inputId: 'repository' },
});

beforeEach(() => {
	vi.resetAllMocks();
	createTestingPinia();
	api.fetchPromotionRepositories.mockResolvedValue({ data: [repository], nextCursor: null });
	api.fetchPromotionBranches.mockResolvedValue({
		data: [{ name: 'main', isDefault: true }],
		nextCursor: null,
	});
});

it('ignores an old provider response while the current provider is still loading', async () => {
	let resolveOld!: (page: PromotionRepositoryListPublicDto) => void;
	let resolveCurrent!: (page: PromotionRepositoryListPublicDto) => void;
	api.fetchPromotionRepositories
		.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveOld = resolve;
			}),
		)
		.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveCurrent = resolve;
			}),
		);
	const { rerender } = renderSelect();
	await rerender({ providerId: 'gitlab-2' });
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
	resolveOld({ data: [repository], nextCursor: 'stale-page' });
	await flushPromises();
	await userEvent.click(screen.getByRole('combobox'));
	expect(await screen.findByText('Loading')).toBeVisible();
	expect(screen.queryByText('team/workflows')).not.toBeInTheDocument();
	resolveCurrent({ data: [otherRepository], nextCursor: null });
	expect(await screen.findByText('team/other')).toBeInTheDocument();
	expect(screen.queryByText('team/workflows')).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});

it('retries a saved repository lookup and restores its label after paginated discovery', async () => {
	api.fetchPromotionRepositories
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: 'all-next' })
		.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
		.mockResolvedValueOnce({ data: [], nextCursor: 'search-next' })
		.mockResolvedValueOnce({ data: [repository], nextCursor: null });
	const { emitted } = renderSelect({ props: { modelValue: repository.remoteUrl } });
	await userEvent.click(
		within(await screen.findByRole('alert')).getByRole('button', { name: 'Retry' }),
	);
	await waitFor(() => expect(emitted('resolved')).toEqual([[repository]]));
	expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(4);
	expect(api.fetchPromotionRepositories.mock.calls[2]).toEqual(
		api.fetchPromotionRepositories.mock.calls[1],
	);
	expect(api.fetchPromotionRepositories).toHaveBeenNthCalledWith(3, expect.anything(), 'gitlab-1', {
		search: 'workflows',
		cursor: undefined,
		limit: 100,
	});
	expect(api.fetchPromotionRepositories).toHaveBeenNthCalledWith(4, expect.anything(), 'gitlab-1', {
		search: 'workflows',
		cursor: 'search-next',
		limit: 100,
	});
	expect(emitted('update:modelValue')).toBeUndefined();
	await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('team/workflows'));
});

describe.each(['repository', 'branch'] as const)('filtered %s discovery', (kind) => {
	const requests = () =>
		(kind === 'repository'
			? api.fetchPromotionRepositories.mock.calls
			: api.fetchPromotionBranches.mock.calls
		).map((args) => args.at(-1));

	const renderPicker = (onClick: () => void) =>
		renderSelect({
			props: { kind, repositoryId: kind === 'branch' ? '42' : undefined },
			attrs: { onClick },
		});

	const activate = async (button: HTMLElement, method: 'mouse' | 'keyboard') => {
		await waitFor(() => expect(button).toBeEnabled());
		if (method === 'mouse') {
			await userEvent.click(button);
		} else {
			screen.getByRole('combobox').focus();
			await userEvent.tab();
			expect(button).toHaveFocus();
			await userEvent.keyboard('{Enter}');
		}
	};

	it.each(['mouse', 'keyboard'] as const)(
		'keeps search, pagination, and selection through retries by %s',
		async (method) => {
			api.fetchPromotionRepositories
				.mockResolvedValueOnce({ data: [repository], nextCursor: 'unfiltered-next' })
				.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
				.mockResolvedValueOnce({ data: [repository], nextCursor: 'filtered-next' })
				.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
				.mockResolvedValueOnce({ data: [repository, otherRepository], nextCursor: null });
			api.fetchPromotionBranches
				.mockResolvedValueOnce({
					data: [{ name: 'main', isDefault: true }],
					nextCursor: 'unfiltered-next',
				})
				.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
				.mockResolvedValueOnce({
					data: [{ name: 'team/main', isDefault: false }],
					nextCursor: 'filtered-next',
				})
				.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
				.mockResolvedValueOnce({
					data: [
						{ name: 'team/main', isDefault: false },
						{ name: 'team/other', isDefault: false },
					],
					nextCursor: null,
				});
			const onClick = vi.fn();
			const { emitted } = renderPicker(onClick);
			await waitFor(() => expect(requests()).toHaveLength(1));
			await userEvent.type(screen.getByRole('combobox'), 'team');
			await waitFor(() => expect(requests()).toHaveLength(2));
			onClick.mockClear();
			await activate(await screen.findByRole('button', { name: 'Retry' }), method);
			await waitFor(() => expect(requests()).toHaveLength(3));
			expect(requests()[1]).toEqual({ search: 'team', cursor: undefined, limit: 100 });
			expect(requests()[2]).toEqual(requests()[1]);
			await activate(await screen.findByRole('button', { name: 'Load more' }), method);
			await waitFor(() => expect(requests()).toHaveLength(4));
			expect(requests()[3]).toEqual({ search: 'team', cursor: 'filtered-next', limit: 100 });
			await activate(await screen.findByRole('button', { name: 'Retry' }), method);
			await waitFor(() => expect(requests()).toHaveLength(5));
			expect(requests()[4]).toEqual(requests()[3]);
			expect(onClick).not.toHaveBeenCalled();
			expect(
				screen.getAllByRole('option', {
					name: kind === 'repository' ? 'team/workflows' : 'team/main',
				}),
			).toHaveLength(1);
			await userEvent.click(await screen.findByRole('option', { name: 'team/other' }));
			expect(emitted('update:modelValue')).toEqual([
				[kind === 'repository' ? otherRepository.remoteUrl : 'team/other'],
			]);
			expect(emitted('selected')).toEqual(kind === 'repository' ? [[otherRepository]] : undefined);
		},
	);
});

it('keeps browse pagination and search available when the saved repository is unavailable', async () => {
	api.fetchPromotionRepositories
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: 'browse-next' })
		.mockResolvedValueOnce({ data: [], nextCursor: null })
		.mockResolvedValue({ data: [otherRepository], nextCursor: null });
	const { emitted } = renderSelect({ props: { modelValue: repository.remoteUrl } });
	expect(await screen.findByRole('alert')).toHaveTextContent(
		"The saved repository isn't available",
	);
	await userEvent.click(screen.getByRole('combobox'));
	await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(3));
	expect(api.fetchPromotionRepositories).toHaveBeenLastCalledWith(expect.anything(), 'gitlab-1', {
		search: undefined,
		cursor: 'browse-next',
		limit: 100,
	});
	screen.getByRole('combobox').focus();
	await userEvent.type(screen.getByRole('combobox'), 'other', { skipClick: true });
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(4));
	expect(api.fetchPromotionRepositories).toHaveBeenLastCalledWith(expect.anything(), 'gitlab-1', {
		search: 'other',
		cursor: undefined,
		limit: 100,
	});
	expect(
		api.fetchPromotionRepositories.mock.calls.filter(
			([, , query]) => query?.search === 'workflows',
		),
	).toHaveLength(1);
	await userEvent.click(screen.getByRole('option', { name: 'team/other' }));
	expect(emitted('selected')).toEqual([[otherRepository]]);
	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps a pending saved-repository lookup independent from a new browse search', async () => {
	let resolveSaved!: (page: PromotionRepositoryListPublicDto) => void;
	api.fetchPromotionRepositories
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: null })
		.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveSaved = resolve;
			}),
		)
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: null });
	const { emitted } = renderSelect({ props: { modelValue: repository.remoteUrl } });
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
	await userEvent.type(screen.getByRole('combobox'), 'other');
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(3));
	resolveSaved({ data: [repository], nextCursor: null });
	await waitFor(() => expect(emitted('resolved')).toEqual([[repository]]));
	expect(screen.getByRole('option', { name: 'team/other' })).toBeVisible();
	expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(3);
});

it('ignores a saved-repository lookup after its provider changes', async () => {
	let resolveOld!: (page: PromotionRepositoryListPublicDto) => void;
	api.fetchPromotionRepositories
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: null })
		.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveOld = resolve;
			}),
		)
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: null });
	const { rerender, emitted } = renderSelect({ props: { modelValue: repository.remoteUrl } });
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
	await rerender({ providerId: 'gitlab-2', modelValue: otherRepository.remoteUrl });
	await waitFor(() => expect(emitted('resolved')).toEqual([[otherRepository]]));
	resolveOld({ data: [repository], nextCursor: null });
	await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('team/other'));
	expect(emitted('resolved')).toEqual([[otherRepository]]);
	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('allows Tab to leave the picker after the menu closes', async () => {
	api.fetchPromotionRepositories.mockResolvedValue({ data: [repository], nextCursor: 'next' });
	const { container } = renderSelect();
	container.insertAdjacentHTML('beforeend', '<button type="button">After picker</button>');
	await userEvent.click(screen.getByRole('combobox'));
	await screen.findByRole('button', { name: 'Load more' });
	await userEvent.keyboard('{Escape}');
	await userEvent.tab();
	expect(screen.getByRole('button', { name: 'After picker' })).toHaveFocus();
});

it('recovers an initial failure through the closed-menu retry and shows an empty result', async () => {
	api.fetchPromotionRepositories
		.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
		.mockResolvedValueOnce({ data: [], nextCursor: null });
	renderSelect();
	await screen.findByRole('alert');
	await userEvent.click(screen.getByRole('combobox'));
	await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
	await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
	expect(await screen.findByRole('status')).toHaveTextContent('No repositories found');
});
