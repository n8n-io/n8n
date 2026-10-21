import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { waitAllPromises } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';

import { billingPreview } from '../__tests__/preview.fixtures';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import * as api from '../promotions.api';
import * as settingsApi from '../promotionsSettings.api';
import PromotionPreviewView from './PromotionPreviewView.vue';

vi.mock('../promotions.api');
vi.mock('../promotionsSettings.api');
// The projects store loads the project of the route on its own.
vi.mock('@/features/collaboration/projects/projects.api');

const stub = { template: '<div />' };
const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/projects/:projectId/workflows', name: VIEWS.PROJECTS_WORKFLOWS, component: stub },
		{ path: '/projects/:projectId/promotions/:direction', component: stub },
	],
});
const renderComponent = createComponentRenderer(PromotionPreviewView, {
	global: { plugins: [router] },
});

const environment = (direction: 'promote' | 'apply') =>
	({
		id: `environment-${direction}`,
		scope: 'instance',
		direction,
		remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
	}) as unknown as settingsApi.PromotionEnvironmentSummary;

async function render(path = '/projects/p1/promotions/promote', direction = 'promote' as const) {
	await router.push(path);
	const result = renderComponent({
		pinia: createTestingPinia(),
		props: { projectId: 'p1', direction },
	});
	await waitAllPromises();
	return result;
}

const treeRow = (getAllByTestId: (id: string) => HTMLElement[], key: string) => {
	const row = getAllByTestId('promotion-preview-tree-row').find(
		(element) => element.dataset.resourceKey === key,
	);
	if (!row) throw new Error(`No tree row for ${key}`);
	return within(row);
};

describe('PromotionPreviewView', () => {
	beforeEach(() => {
		invalidateInstancePromotionConnection();
		Element.prototype.scrollIntoView = vi.fn();
		vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([environment('promote')]);
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview());
		vi.mocked(api.getPromotionResourceDetails).mockReset();
		vi.mocked(api.getPromotionResourceDetails).mockResolvedValue({ details: [], missingKeys: [] });
	});

	it('should keep the selection while the user inspects cards', async () => {
		const { getAllByTestId, getByTestId } = await render();
		expect(getByTestId('promotion-preview-counts')).toHaveTextContent('5 of 5');

		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		await userEvent.click(treeRow(getAllByTestId, 'dataTable:t1').getByText('Invoices'));

		expect(getByTestId('promotion-preview-counts')).toHaveTextContent('4 of 5');
		// The tab shows the total, whatever the selection.
		expect(getByTestId('promotion-preview-tabs')).toHaveTextContent(/Changes\s*5/);
		expect(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox')).not.toBeChecked();
		expect(router.currentRoute.value.query.resource).toBe('dataTable:t1');
	});

	it('should load the content of changed resources other than workflows with the preview', async () => {
		await render();

		expect(api.getPromotionResourceDetails).toHaveBeenCalledTimes(1);
		expect(vi.mocked(api.getPromotionResourceDetails).mock.calls[0][3].keys).toEqual([
			'folder:f1',
			'dataTable:t1',
			'variable:global:API_URL',
		]);
	});

	it('should open the card of a direct link', async () => {
		const { getAllByTestId } = await render('/projects/p1/promotions/promote?resource=tag:g1');

		const card = getAllByTestId('promotion-preview-card').find(
			(element) => element.dataset.resourceKey === 'tag:g1',
		);
		expect(card?.scrollIntoView).toHaveBeenCalled();
	});

	it('should scroll to the card again when the same item is inspected twice', async () => {
		const { getAllByTestId } = await render();
		const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);

		await userEvent.click(treeRow(getAllByTestId, 'tag:g1').getByText('finance'));
		await userEvent.click(treeRow(getAllByTestId, 'tag:g1').getByText('finance'));

		expect(scrollIntoView).toHaveBeenCalledTimes(2);
	});

	it('should explain that the direction is not set up when the instance has no environment for it', async () => {
		vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([environment('apply')]);

		const { getByTestId } = await render();

		expect(getByTestId('promotion-preview-disconnected')).toHaveTextContent("Promote isn't set up");
	});

	it('should offer a retry when the preview fails to load', async () => {
		vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline'));

		const { getByTestId, getByRole } = await render();
		expect(getByTestId('promotion-preview-error')).toHaveTextContent("Couldn't load the changes");

		await userEvent.click(getByRole('button', { name: 'Try again' }));
		await waitFor(() => expect(getByTestId('promotion-preview-tree')).toBeInTheDocument());
	});

	it('should keep the changes and warn when a refresh fails', async () => {
		const { getByTestId, getByText } = await render();
		vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline'));

		await userEvent.click(getByTestId('promotion-preview-refresh'));
		await waitAllPromises();

		expect(getByText(/Couldn't refresh the preview/)).toBeInTheDocument();
		expect(getByTestId('promotion-preview-tree')).toBeInTheDocument();
	});

	it('should show the error when the refresh of an empty preview fails', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValueOnce(billingPreview({ resources: [] }));
		const { getByTestId } = await render();
		expect(getByTestId('promotion-preview-empty')).toHaveTextContent('Nothing to promote');
		vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline'));

		await userEvent.click(getByTestId('promotion-preview-refresh'));
		await waitAllPromises();

		// "Nothing to promote" could be out of date, so the page asks for a retry.
		expect(getByTestId('promotion-preview-error')).toHaveTextContent("Couldn't load the changes");
	});
});
