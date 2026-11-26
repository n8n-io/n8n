import type {
	PromotionProjectEnvironmentsAllowList,
	PromotionProjectEnvironmentsAllowListProject,
} from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { onTestFinished } from 'vitest';

import type * as PromotionsApi from '../promotionsSettings.api';
import PromotionProjectEnvironmentsAllowListView from './PromotionProjectEnvironmentsAllowListView.vue';

const api = vi.hoisted(() => ({
	getPromotionProjectEnvironmentsAllowList:
		vi.fn<typeof PromotionsApi.getPromotionProjectEnvironmentsAllowList>(),
	updatePromotionProjectEnvironmentsAllowList:
		vi.fn<typeof PromotionsApi.updatePromotionProjectEnvironmentsAllowList>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const showMessage = vi.fn();
const showError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('vue-router', async () => ({
	...(await vi.importActual<object>('vue-router')),
	useRouter: () => ({ push: vi.fn() }),
}));

const renderView = createComponentRenderer(PromotionProjectEnvironmentsAllowListView);

const project = (
	id: string,
	name: string,
	allowEnvironments = false,
): PromotionProjectEnvironmentsAllowListProject => ({ id, name, allowEnvironments });

const projectList = (
	data: PromotionProjectEnvironmentsAllowListProject[],
	count = data.length,
): PromotionProjectEnvironmentsAllowList => ({ count, data });

/** Serves the list and the saves from `stored`, so a reload reads what a save wrote. */
function serveStoredProjects(stored: PromotionProjectEnvironmentsAllowListProject[]) {
	api.getPromotionProjectEnvironmentsAllowList.mockImplementation(async (_context, query) => {
		const matches = stored.filter(
			(row) =>
				query.allowEnvironments === undefined || row.allowEnvironments === query.allowEnvironments,
		);
		return projectList(matches.slice(query.skip, query.skip + query.take), matches.length);
	});
	api.updatePromotionProjectEnvironmentsAllowList.mockImplementation(
		async (_context, projectId, { allowEnvironments }) => {
			const row = stored.find(({ id }) => id === projectId);
			if (row) row.allowEnvironments = allowEnvironments;
			return { allowEnvironments };
		},
	);
}

const allowSwitch = async (name: string) =>
	await screen.findByRole('switch', { name: `Allow own environments for ${name}` });

async function chooseFilter(option: 'Allowed' | 'Not allowed') {
	await userEvent.click(screen.getByTestId('promotion-project-environments-allow-list-filter'));
	await userEvent.click(await screen.findByRole('option', { name: option }));
}

describe('PromotionProjectEnvironmentsAllowListView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia({ stubActions: false });
	});

	it('shows each team project with a switch for its value', async () => {
		serveStoredProjects([project('p1', 'Alpha', true), project('p2', 'Beta')]);
		renderView();

		expect(await allowSwitch('Alpha')).toBeChecked();
		expect(await allowSwitch('Beta')).not.toBeChecked();
		expect(screen.getByRole('heading', { name: 'Project environments' })).toBeInTheDocument();
	});

	it('saves the new value when the switch changes', async () => {
		serveStoredProjects([project('p1', 'Alpha', true), project('p2', 'Beta')]);
		renderView();

		await userEvent.click(await allowSwitch('Beta'));

		expect(api.updatePromotionProjectEnvironmentsAllowList).toHaveBeenCalledWith(
			expect.anything(),
			'p2',
			{ allowEnvironments: true },
		);
		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'success', title: 'Settings saved' }),
			),
		);
		expect(await allowSwitch('Beta')).toBeChecked();
	});

	it.each([
		{ label: 'the reload returns the stored value', reloadFails: false, shown: 'true' },
		{ label: 'the reload fails too', reloadFails: true, shown: 'false' },
	])(
		'shows the stored value and one error when the save fails and $label',
		async ({ reloadFails, shown }) => {
			const stored = [project('p1', 'Alpha'), project('p2', 'Beta')];
			serveStoredProjects(stored);
			renderView();
			await allowSwitch('Alpha');
			if (reloadFails) {
				api.updatePromotionProjectEnvironmentsAllowList.mockRejectedValue(new Error('failed'));
				api.getPromotionProjectEnvironmentsAllowList.mockRejectedValue(new Error('failed'));
			} else {
				// The server stores the value and the response still fails.
				api.updatePromotionProjectEnvironmentsAllowList.mockImplementation(async () => {
					stored[0].allowEnvironments = true;
					throw new Error('failed');
				});
			}

			await userEvent.click(await allowSwitch('Alpha'));
			await waitFor(() =>
				expect(api.getPromotionProjectEnvironmentsAllowList).toHaveBeenCalledTimes(2),
			);
			await flushPromises();

			await waitFor(async () =>
				expect(await allowSwitch('Alpha')).toHaveAttribute('aria-checked', shown),
			);
			expect(await allowSwitch('Beta')).toBeInTheDocument();
			expect(showError).toHaveBeenCalledTimes(1);
			expect(showMessage).not.toHaveBeenCalled();
			expect(
				screen.queryByTestId('promotion-project-environments-allow-list-load-error'),
			).not.toBeInTheDocument();
		},
	);

	it('reloads the first page with the search text and the filter', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		onTestFinished(() => {
			vi.useRealTimers();
		});
		api.getPromotionProjectEnvironmentsAllowList.mockResolvedValue(
			projectList([project('p1', 'Alpha')], 25),
		);
		renderView();
		await userEvent.click(await screen.findByTestId('pagination-next'));
		await waitFor(() =>
			expect(api.getPromotionProjectEnvironmentsAllowList).toHaveBeenLastCalledWith(
				expect.anything(),
				{ skip: 10, take: 10 },
			),
		);

		await userEvent.type(
			screen.getByTestId('promotion-project-environments-allow-list-search'),
			'alp',
		);
		await vi.runAllTimersAsync();
		expect(api.getPromotionProjectEnvironmentsAllowList).toHaveBeenLastCalledWith(
			expect.anything(),
			{ skip: 0, take: 10, search: 'alp' },
		);

		await chooseFilter('Not allowed');
		await waitFor(() =>
			expect(api.getPromotionProjectEnvironmentsAllowList).toHaveBeenLastCalledWith(
				expect.anything(),
				{ skip: 0, take: 10, search: 'alp', allowEnvironments: false },
			),
		);
	});

	it('moves to the last page when a save under a filter leaves the page empty', async () => {
		serveStoredProjects(
			Array.from({ length: 11 }, (_, index) =>
				project(`p${index + 1}`, `Project ${String(index + 1).padStart(2, '0')}`, true),
			),
		);
		renderView();

		await chooseFilter('Allowed');
		await allowSwitch('Project 01');
		await userEvent.click(screen.getByTestId('pagination-next'));
		await userEvent.click(await allowSwitch('Project 11'));

		expect(await allowSwitch('Project 01')).toBeChecked();
		await waitFor(() =>
			expect(
				screen.queryByRole('switch', { name: 'Allow own environments for Project 11' }),
			).not.toBeInTheDocument(),
		);
		expect(api.getPromotionProjectEnvironmentsAllowList).toHaveBeenLastCalledWith(
			expect.anything(),
			{ skip: 0, take: 10, allowEnvironments: true },
		);
	});

	it('keeps the rows when the reload after a save fails while it moves to the last page', async () => {
		serveStoredProjects(
			Array.from({ length: 11 }, (_, index) =>
				project(`p${index + 1}`, `Project ${String(index + 1).padStart(2, '0')}`, true),
			),
		);
		renderView();
		await chooseFilter('Allowed');
		await allowSwitch('Project 01');
		await userEvent.click(screen.getByTestId('pagination-next'));
		await allowSwitch('Project 11');
		const serve = api.getPromotionProjectEnvironmentsAllowList.getMockImplementation();
		api.getPromotionProjectEnvironmentsAllowList.mockImplementation(async (context, query) => {
			if (query.skip === 0 || !serve) throw new Error('failed');
			return await serve(context, query);
		});

		await userEvent.click(await allowSwitch('Project 11'));
		await waitFor(() => expect(showMessage).toHaveBeenCalled());
		await flushPromises();

		expect(await allowSwitch('Project 11')).not.toBeChecked();
		expect(showError).not.toHaveBeenCalled();
		expect(
			screen.queryByTestId('promotion-project-environments-allow-list-load-error'),
		).not.toBeInTheDocument();
	});

	it.each([
		['that there are no team projects', false, 'There are no team projects yet.'],
		['that no project matches', true, 'No projects match your search or filter.'],
	])('says %s', async (_, filtered, message) => {
		serveStoredProjects(filtered ? [project('p1', 'Alpha')] : []);
		renderView();
		if (filtered) {
			await allowSwitch('Alpha');
			await chooseFilter('Allowed');
		}

		expect(
			await screen.findByTestId('promotion-project-environments-allow-list-empty'),
		).toHaveTextContent(message);
	});

	it('shows the load error and no rows when the projects cannot load', async () => {
		api.getPromotionProjectEnvironmentsAllowList.mockRejectedValue(new Error('failed'));
		renderView();

		expect(
			await screen.findByTestId('promotion-project-environments-allow-list-load-error'),
		).toBeVisible();
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
	});
});
