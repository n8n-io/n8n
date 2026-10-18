import type { ApplyCheckResult } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { waitAllPromises } from '@/__tests__/utils';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';

import { applied, destructiveChange, variable } from '../__tests__/bindings.fixtures';
import { billingPreview, COMMIT_SHA } from '../__tests__/preview.fixtures';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import * as api from '../promotions.api';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';
import * as settingsApi from '../promotionsSettings.api';
import PromotionPreviewView from './PromotionPreviewView.vue';

const { confirm, showMessage, createBinding } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showMessage: vi.fn(),
	createBinding: vi.fn(),
}));

vi.mock('../promotions.api');
vi.mock('../promotionsSettings.api');
// The projects store loads the project of the route on its own.
vi.mock('@/features/collaboration/projects/projects.api');
// The editors are modals of the app. The test answers for them.
vi.mock('../composables/usePromotionBindingCreation', () => ({
	usePromotionBindingCreation: () => ({ createBinding, updatePreflight: vi.fn() }),
}));
vi.mock('@/app/composables/useMessage', () => ({ useMessage: () => ({ confirm }) }));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError: vi.fn() }),
}));

const stub = { template: '<div />' };
const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/projects/:projectId/workflows', name: VIEWS.PROJECTS_WORKFLOWS, component: stub },
		{
			path: '/projects/:projectId/promotions/promote',
			name: PROMOTION_PREVIEW_VIEWS.promote,
			component: stub,
		},
		{
			path: '/projects/:projectId/promotions/apply',
			name: PROMOTION_PREVIEW_VIEWS.apply,
			component: stub,
		},
	],
});
const renderComponent = createComponentRenderer(PromotionPreviewView, {
	global: { plugins: [router] },
});

const connection = (configs: Record<string, unknown>) =>
	({
		id: 'connection-1',
		scope: 'instance',
		target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
		configs,
	}) as unknown as settingsApi.PromotionConnection;

async function render(
	path = '/projects/p1/promotions/promote',
	direction: 'promote' | 'apply' = 'promote',
) {
	await router.push(path);
	const result = renderComponent({
		pinia: createTestingPinia(),
		props: { projectId: 'p1', direction },
	});
	await waitAllPromises();
	return result;
}

const consumers = (...ids: string[]) => [
	{ project: { id: 'p1', name: 'Billing' }, workflows: ids.map((id) => ({ id, name: id })) },
];

const check = (preflight: Partial<ApplyCheckResult['preflight']> = {}): ApplyCheckResult => ({
	connectionId: 'connection-1',
	configId: 'config-1',
	git: { branchName: 'main', commitSha: COMMIT_SHA },
	preflight: {
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		...preflight,
	},
	movedWorkflows: [],
});

const expectedSource = { configId: 'config-1', branchName: 'main', commitSha: COMMIT_SHA };

async function renderApply() {
	vi.mocked(settingsApi.fetchPromotionConnections).mockResolvedValue([
		connection({ apply: { id: 'config-1' } }),
	]);
	return await render('/projects/p1/promotions/apply', 'apply');
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
		vi.mocked(settingsApi.fetchPromotionConnections).mockResolvedValue([
			connection({ promote: { id: 'config-1' } }),
		]);
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview());
		vi.mocked(api.getPromotionResourceDetails).mockReset();
		vi.mocked(api.getPromotionResourceDetails).mockResolvedValue({ details: [], missingKeys: [] });
		vi.mocked(api.getApplyBlockers).mockResolvedValue(check());
		confirm.mockResolvedValue(MODAL_CONFIRM);
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

	it('should explain that the direction is not set up when the connection has no configuration for it', async () => {
		vi.mocked(settingsApi.fetchPromotionConnections).mockResolvedValue([
			connection({ apply: { id: 'config-2' } }),
		]);

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

	it('should promote the selection to a branch that has no commit yet, then go back to the project', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview({ commitSha: null }));
		vi.mocked(api.promoteProjectSelection).mockResolvedValue({
			git: { branchName: 'promotion/p1', commitSha: COMMIT_SHA },
		} as Awaited<ReturnType<typeof api.promoteProjectSelection>>);

		const { getByTestId } = await render();
		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w2', 'w3', 'w4'],
		});
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
	});

	it('should apply only the workflows without blockers, once, at the commit of the check', async () => {
		// "Weekly KPI report" needs a variable that this instance does not have.
		vi.mocked(api.getApplyBlockers).mockResolvedValue(
			check({ missingBindings: [{ ...variable, name: 'API_URL', consumers: consumers('w3') }] }),
		);
		let answer: (value: string) => void = () => {};
		confirm.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		vi.mocked(settingsApi.applyProjectSelection).mockResolvedValue(applied);

		const { getAllByTestId, getByTestId } = await renderApply();
		const blocked = treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
		expect(blocked).not.toBeChecked();
		expect(blocked).toBeDisabled();

		await userEvent.click(getByTestId('promotion-preview-submit'));
		await userEvent.click(getByTestId('promotion-preview-submit'));
		answer(MODAL_CONFIRM);
		await waitAllPromises();

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(settingsApi.applyProjectSelection).toHaveBeenCalledTimes(1);
		expect(settingsApi.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w2', 'w4'],
			expectedSource,
		});
		expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
	});

	it('should confirm a data table change only when the selection imports it, and keep the selection when the branch moves', async () => {
		// Both invoice workflows include the "Invoices" table. The apply removes a column.
		vi.mocked(api.getApplyBlockers).mockResolvedValue(
			check({ conflicts: [{ ...destructiveChange, id: 't1', consumers: consumers('w1', 'w2') }] }),
		);
		const { connectionId, configId, git } = check();
		vi.mocked(settingsApi.applyProjectSelection).mockResolvedValue({
			connectionId,
			configId,
			git,
			status: 'source-changed',
		});
		vi.mocked(settingsApi.continueApplyProjectSelection).mockResolvedValue(applied);

		const { getAllByTestId, getByTestId } = await renderApply();
		const submit = getByTestId('promotion-preview-submit');
		expect(submit).toHaveTextContent('Apply data table changes');

		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		await userEvent.click(treeRow(getAllByTestId, 'workflow:w2').getByRole('checkbox'));
		expect(submit).toHaveTextContent(/^Apply \d+ changes?$/);
		await userEvent.click(submit);

		expect(settingsApi.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w3', 'w4'],
			expectedSource,
		});
		expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
			'The branch changed',
		);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
		expect(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		await userEvent.click(submit);

		expect(settingsApi.continueApplyProjectSelection).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			{
				workflowIds: ['w1', 'w3', 'w4'],
				expectedSource,
				confirmDestructiveChanges: true,
			},
		);
	});

	it('should not apply any selection while a folder on the branch moved', async () => {
		// The branch holds "Payments" under "Reports". This instance holds it at the project root.
		const preview = billingPreview();
		vi.mocked(api.getPromotionPreview).mockResolvedValue({
			...preview,
			resources: preview.resources.map((resource) =>
				resource.key === 'folder:f1'
					? { ...resource, parentKey: 'folder:f2', previousParentKey: 'project:p1' }
					: resource,
			),
		});

		const { getByTestId } = await renderApply();

		expect(getByTestId('promotion-preview-submit')).toBeDisabled();
	});

	it('should let users retry a rejected apply, and reload the preview first when the result is unknown', async () => {
		vi.mocked(settingsApi.applyProjectSelection)
			.mockRejectedValueOnce(new ResponseError('Import blocked', { httpStatusCode: 409 }))
			.mockRejectedValueOnce(new ResponseError("Can't connect to n8n."));

		const { getByTestId } = await renderApply();
		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(getByTestId('promotion-preview-operation-error')).toHaveTextContent(
			'Import blocked Nothing was changed.',
		);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(1);

		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(getByTestId('promotion-preview-operation-error')).toHaveTextContent(
			'the page was refreshed',
		);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
	});

	it('should apply a blocked workflow after the user adds the missing variable', async () => {
		const missing = { ...variable, name: 'API_URL', consumers: consumers('w3') };
		vi.mocked(api.getApplyBlockers)
			.mockResolvedValueOnce(check({ missingBindings: [missing] }))
			.mockResolvedValue(check());
		createBinding.mockResolvedValue({
			kind: 'variable',
			id: 'v1',
			name: 'API_URL',
			scope: { kind: 'global' },
		});

		const { getAllByTestId, getByTestId, getByRole } = await renderApply();
		expect(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox')).toBeDisabled();

		await userEvent.click(getByRole('tab', { name: /Blockers/ }));
		const row = within(getByTestId('promotion-preview-blockers-table')).getByRole('row', {
			name: /API_URL/,
		});
		await userEvent.click(within(row).getByRole('button', { name: 'Add variable' }));
		await waitAllPromises();

		expect(createBinding).toHaveBeenCalledWith(missing);
		expect(row).toHaveTextContent('Resolved');
		expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent('No blockers');
		// The refreshed check has no blockers, so the workflow joins the selection again.
		await userEvent.click(getByRole('tab', { name: /Changes/ }));
		expect(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox')).toBeChecked();
		expect(getByTestId('promotion-preview-submit')).toBeEnabled();
	});
});
