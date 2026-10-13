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

it('shows a saved URL outside the browse page without searching for it', async () => {
	api.fetchPromotionRepositories.mockResolvedValue({ data: [otherRepository], nextCursor: 'next' });
	const { emitted } = renderSelect({ props: { modelValue: repository.remoteUrl } });
	await flushPromises();
	expect(screen.getByRole('combobox')).toHaveValue(repository.remoteUrl);
	expect(api.fetchPromotionRepositories).toHaveBeenCalledExactlyOnceWith(
		expect.anything(),
		'gitlab-1',
		{ search: undefined, cursor: undefined, limit: 100 },
	);
	expect(emitted('selected')).toBeUndefined();
	expect(emitted('update:modelValue')).toBeUndefined();
	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

	it('keeps search, pagination, and selection through retries', async () => {
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
		await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
		await waitFor(() => expect(requests()).toHaveLength(3));
		expect(requests()[1]).toEqual({ search: 'team', cursor: undefined, limit: 100 });
		expect(requests()[2]).toEqual(requests()[1]);
		await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
		await waitFor(() => expect(requests()).toHaveLength(4));
		expect(requests()[3]).toEqual({ search: 'team', cursor: 'filtered-next', limit: 100 });
		await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
		await waitFor(() => expect(requests()).toHaveLength(5));
		expect(requests()[4]).toEqual(requests()[3]);
		expect(onClick).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole('combobox'));
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
	});
});

it('uses native Tab order for pagination and leaving the picker', async () => {
	api.fetchPromotionRepositories
		.mockResolvedValueOnce({ data: [repository], nextCursor: 'next' })
		.mockResolvedValueOnce({ data: [otherRepository], nextCursor: null });
	const { container } = renderSelect();
	container.insertAdjacentHTML('beforeend', '<button type="button">After picker</button>');
	await userEvent.click(screen.getByRole('combobox'));
	const loadMore = await screen.findByRole('button', { name: 'Load more' });
	await userEvent.tab();
	expect(loadMore).toHaveFocus();
	await userEvent.keyboard('{Enter}');
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
	await waitFor(() =>
		expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument(),
	);
	screen.getByRole('combobox').focus();
	await userEvent.tab();
	expect(screen.getByRole('button', { name: 'After picker' })).toHaveFocus();
});

it('shows one retry action for an initial failure and then an empty result', async () => {
	api.fetchPromotionRepositories
		.mockRejectedValueOnce(new Error('GitLab is unavailable.'))
		.mockResolvedValueOnce({ data: [], nextCursor: null });
	renderSelect();
	await screen.findByRole('alert');
	await userEvent.click(screen.getByRole('combobox'));
	expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1);
	await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
	await waitFor(() => expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2));
	await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
	expect(await screen.findByRole('status')).toHaveTextContent('No repositories found');
});
