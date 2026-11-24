import { INBOX_VIEW } from '@n8n/frontend-constants/inbox';
import { VIEWS } from '@n8n/frontend-constants/views';
import {
	capabilities,
	capabilityRegistry,
	componentRegistry,
	type ProjectContext,
} from '@n8n/frontend-module-sdk';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import userEvent from '@testing-library/user-event';
import { render as renderToast, screen, waitFor, within } from '@testing-library/vue';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import {
	applied,
	blocked,
	credential,
	destructiveChange,
	projectDeletion,
	promoted,
	variable,
} from '../__tests__/bindings.fixtures';
import {
	archivedWorkflow,
	deletedWorkflowWarning,
	notOnBranchCredential,
	notOnBranchWorkflow,
	otherProjectCredential,
	outsideAccessWorkflow,
	outsideArchivedWorkflow,
	outsideCallerPolicyWorkflow,
	personalCredential,
	personalWorkflow,
	repeatedBinding,
	targetNotSelectedWorkflow,
	targetSelectedWorkflow,
	unreachableCredential,
	unreachableWorkflow,
	unsharedCredential,
} from '../__tests__/missingDependencies.fixtures';
import {
	billingPreview,
	billingResources,
	COMMIT_SHA,
	PREVIEW_REVISION as REVISION,
	resource,
} from '../__tests__/preview.fixtures';
import { registerDiffSlotStubs } from '../__tests__/slots';
import * as api from '../promotions.api';
import * as settingsApi from '../promotionsSettings.api';
import {
	PROMOTION_INSTANCE_APPLY_VIEW,
	PROMOTION_PREVIEW_VIEWS,
	PROMOTIONS_SETTINGS_VIEW,
} from '../promotions.constants';
import type { ApplyCheckResult } from '../promotions.types';
import PromotionPreviewView from './PromotionPreviewView.vue';

const { confirm, showMessage, createBinding } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showMessage: vi.fn(),
	createBinding: vi.fn(),
}));

vi.mock('../promotions.api');
vi.mock('../promotionsSettings.api');
vi.mock('../components/preview/PromotionWorkflowDiff.vue', () => ({
	__esModule: true,
	default: {
		props: ['resourceKey'],
		template: '<div data-test-id="active-workflow-diff" :data-resource-key="resourceKey" />',
	},
}));
// The outcome reads the project after an apply.
vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getProject: vi.fn(),
}));
// The editors are modals of the app. The test answers for them.
vi.mock('../composables/usePromotionBindingCreation', () => ({
	usePromotionBindingCreation: () => ({ createBinding, updateCheck: vi.fn() }),
}));
vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm }),
}));
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
		{ path: '/inbox', name: INBOX_VIEW, component: stub },
		{ path: '/promotions/apply', name: PROMOTION_INSTANCE_APPLY_VIEW, component: stub },
		{ path: '/settings/promotions', name: PROMOTIONS_SETTINGS_VIEW, component: stub },
	],
});
const renderComponent = createComponentRenderer(PromotionPreviewView, {
	global: {
		plugins: [router],
		// These tests use real controls. Icons and skeletons only add render work.
		stubs: { N8nIcon: true, N8nLoading: true },
	},
});

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

/** Promote opens a dialog for the optional commit message. */
async function promote(getByTestId: (id: string) => HTMLElement, commitMessage?: string) {
	await userEvent.click(getByTestId('promotion-preview-submit'));
	if (commitMessage !== undefined) {
		await userEvent.type(getByTestId('promote-commit-message'), commitMessage);
	}
	await userEvent.click(getByTestId('promote-confirm-button'));
}

const consumers = (...ids: string[]) => [
	{ project: { id: 'p1', name: 'Billing' }, workflows: ids.map((id) => ({ id, name: id })) },
];

const check = (fields: Partial<ApplyCheckResult> = {}): ApplyCheckResult => ({
	environmentId: 'environment-apply',
	git: { branchName: 'main', commitSha: COMMIT_SHA },
	missingProjects: [],
	missingBindings: [],
	accessRequirements: [],
	conflicts: [],
	warnings: [],
	missingDependencies: [],
	movedWorkflows: [],
	movedFolders: [],
	...fields,
});

/** The Apply preview carries its blockers. */
const previewWithCheck = ({ environmentId, git, ...previewCheck } = check()) => ({
	...billingPreview(),
	check: previewCheck,
});

// Apply names the source of the preview it shows.
const expectedSource = { ...billingPreview().source, commitSha: COMMIT_SHA };
const sourceEnvironmentId = expectedSource.environmentId;

async function renderApply() {
	return await render('/projects/p1/promotions/apply', 'apply');
}

const treeRow = (getAllByTestId: (id: string) => HTMLElement[], key: string) => {
	const row = getAllByTestId('promotion-preview-tree-row').find(
		(element) => element.dataset.resourceKey === key,
	);
	if (!row) throw new Error(`No tree row for ${key}`);
	return within(row);
};

const card = (getAllByTestId: (id: string) => HTMLElement[], key: string) => {
	const element = getAllByTestId('promotion-preview-card').find(
		(element) => element.dataset.resourceKey === key,
	);
	if (!element) throw new Error(`No card for ${key}`);
	return within(element);
};

/** A section of the Issues tab, by its heading. */
const section = (getAllByTestId: (id: string) => HTMLElement[], title: string) => {
	const element = getAllByTestId('promotion-preview-blockers-section').find(
		(candidate) => within(candidate).queryByRole('heading', { name: title }) !== null,
	);
	if (!element) throw new Error(`No section ${title}`);
	return within(element);
};
const cells = (row: HTMLElement) =>
	within(row)
		.getAllByRole('cell')
		.map((cell) => cell.textContent?.trim());

const cardToggle = (getAllByTestId: (id: string) => HTMLElement[], key: string) =>
	card(getAllByTestId, key).getByTestId('promotion-preview-card-toggle');

// The details endpoint answers each workflow with a small workflow that this instance adds.
const answerWorkflowDetails = () =>
	vi
		.mocked(api.getPromotionResourceDetails)
		.mockImplementation(async (_context, _project, _direction, { keys }) => ({
			details: keys
				.filter((key) => key.startsWith('workflow:'))
				.map((key) => ({
					key,
					type: 'workflow' as const,
					before: null,
					after: {
						id: key,
						name: key,
						nodes: [],
						connections: {},
						parentFolderId: null,
						isArchived: false,
					},
					revision: { before: null, after: 'blob' },
				})),
			missingKeys: [],
		}));

beforeEach(() => {
	registerDiffSlotStubs();
	capabilityRegistry.provide(
		capabilities.projectContext,
		mock<ProjectContext>({ currentProject: () => null }),
	);
});

afterEach(() => {
	componentRegistry.clear();
	capabilityRegistry.clear();
});

describe('PromotionPreviewView', () => {
	it.each(['promote', 'apply'] as const)(
		'shows the selected change count and omits zero for %s',
		async (direction) => {
			const preview = previewWithCheck();
			vi.mocked(api.getPromotionPreview).mockResolvedValue({
				...preview,
				resources: preview.resources.filter(({ key }) =>
					['workflow:w1', 'workflow:w3'].includes(key),
				),
				dependencies: [],
			});
			const { getByTestId, getAllByTestId } = await render(
				`/projects/p1/promotions/${direction}`,
				direction,
			);
			const action = direction === 'promote' ? 'Promote' : 'Apply';
			const submit = getByTestId('promotion-preview-submit');
			expect(submit).toHaveTextContent(`${action} 2 changes`);
			expect(submit).toBeEnabled();

			await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
			expect(submit).toHaveTextContent(`${action} 1 change`);
			expect(submit).toBeEnabled();

			await userEvent.click(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox'));
			expect(submit).toHaveTextContent(`${action} changes`);
			expect(submit).toBeDisabled();
		},
	);

	it('omits the count and disables Apply when a refresh blocks every selected workflow', async () => {
		// Two changed workflows cover this refresh without mounting unrelated cards.
		const preview = {
			...previewWithCheck(),
			resources: [
				{ ...billingResources.reconciliation, parentKey: null },
				{ ...billingResources.kpiReport, parentKey: null },
			],
			dependencies: [],
		};
		vi.mocked(api.getPromotionPreview)
			.mockResolvedValueOnce(preview)
			.mockResolvedValue({
				...preview,
				check: {
					...preview.check,
					missingBindings: [{ ...variable, consumers: consumers('w1', 'w3') }],
				},
			});
		const { getByTestId, getAllByTestId } = await renderApply();
		expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Apply 2 changes$/);
		expect(getByTestId('promotion-preview-submit')).toBeEnabled();

		await userEvent.click(getByTestId('promotion-preview-refresh'));
		await waitAllPromises();

		expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Apply changes$/);
		expect(getByTestId('promotion-preview-submit')).toBeDisabled();
		for (const key of ['workflow:w1', 'workflow:w3']) {
			const row = treeRow(getAllByTestId, key);
			expect(row.getByRole('checkbox')).toBeChecked();
			expect(row.getByTestId('promotion-preview-tree-blocker')).toBeInTheDocument();
		}
	});

	it.each([
		{
			direction: 'promote',
			project: 'Engineering',
			environmentName: 'Staging',
			title: 'Promote Engineering changes to Staging',
		},
		{
			direction: 'apply',
			project: 'Engineering',
			environmentName: 'QA',
			title: 'Apply Engineering changes from QA',
		},
	] as const)(
		'shows the project and environment in the $direction heading',
		async ({ direction, project, environmentName, title }) => {
			const preview = billingPreview();
			vi.mocked(api.getPromotionPreview).mockResolvedValue({
				...preview,
				environment: { ...preview.environment, name: environmentName },
				resources: preview.resources.map((resource) =>
					resource.key === 'project:p1' ? { ...resource, name: project } : resource,
				),
			});
			const { getByRole } = await render(`/projects/p1/promotions/${direction}`, direction);
			expect(getByRole('heading', { level: 1, name: title })).toBeVisible();
		},
	);

	beforeEach(() => {
		Element.prototype.scrollIntoView = vi.fn();
		vi.mocked(api.getPromotionPreview).mockResolvedValue(previewWithCheck());
		vi.mocked(api.getPromotionResourceDetails).mockReset();
		vi.mocked(api.getPromotionResourceDetails).mockResolvedValue({ details: [], missingKeys: [] });
		confirm.mockResolvedValue('confirm');
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

	it('should share one selection between the card headers and the tree', async () => {
		vi.mocked(api.promoteProjectSelection).mockResolvedValue(
			promoted({
				git: { branchName: 'main', commitSha: COMMIT_SHA },
			}),
		);
		// Extra cards add render and style work under CI load. This case only needs a folder,
		// two workflows inside it, and one outside it to check partial selection.
		const { project, payments, reconciliation, reminders, kpiReport } = billingResources;
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			billingPreview({
				resources: [
					project,
					payments,
					reconciliation,
					reminders,
					{ ...kpiReport, parentKey: project.key },
				],
				dependencies: [],
			}),
		);
		const { getAllByTestId, getByTestId } = await render();
		const cardCheckbox = (key: string) =>
			card(getAllByTestId, key).getByTestId('promotion-preview-card-checkbox');
		expect(getByTestId('promotion-preview-counts')).toHaveTextContent('3 of 3');

		// The folder card clears the workflows inside the folder, and the card stays open.
		await userEvent.click(cardCheckbox('folder:f1'));
		expect(cardToggle(getAllByTestId, 'folder:f1')).toHaveAttribute('aria-expanded', 'true');
		expect(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox')).not.toBeChecked();
		expect(cardCheckbox('workflow:w2')).not.toBeChecked();
		expect(getByTestId('promotion-preview-counts')).toHaveTextContent('1 of 3');

		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		expect(cardCheckbox('workflow:w1')).toBeChecked();
		expect(cardCheckbox('folder:f1')).toHaveAttribute('data-state', 'indeterminate');
		expect(cardCheckbox('workflow:w2')).not.toBeChecked();
		expect(getByTestId('promotion-preview-counts')).toHaveTextContent('3 of 3');

		await promote(getByTestId);
		expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w3'],
			folderIds: [],
			credentialIds: [],
			expectedPreviewRevision: REVISION,
		});
	});

	it('should load the changed resources and only the active workflow at the commit of the preview', async () => {
		await render();

		expect(api.getPromotionResourceDetails).toHaveBeenCalledTimes(1);
		expect(vi.mocked(api.getPromotionResourceDetails).mock.calls[0][3]).toEqual({
			commitSha: COMMIT_SHA,
			keys: ['folder:f1', 'workflow:w1', 'dataTable:t1', 'variable:global:API_URL'],
		});
	});

	it('should switch the active diff without collapsing or scrolling cards', async () => {
		answerWorkflowDetails();
		const { getAllByTestId, queryAllByTestId } = await render();
		const workflowCard = (key: string) => card(getAllByTestId, key);
		const order = () =>
			getAllByTestId('promotion-preview-card').map((element) => element.dataset.resourceKey);
		const initialOrder = order();
		const requestedKeys = () =>
			vi.mocked(api.getPromotionResourceDetails).mock.calls.flatMap(([, , , { keys }]) => keys);
		await waitFor(() =>
			expect(workflowCard('workflow:w1').getByTestId('active-workflow-diff')).toBeInTheDocument(),
		);

		await userEvent.click(
			workflowCard('workflow:w3').getByRole('button', { name: 'Show diff of Weekly KPI report' }),
		);
		await waitFor(() =>
			expect(workflowCard('workflow:w3').getByTestId('active-workflow-diff')).toBeInTheDocument(),
		);
		expect(queryAllByTestId('active-workflow-diff')).toHaveLength(1);
		expect(cardToggle(getAllByTestId, 'workflow:w1')).toHaveAttribute('data-state', 'open');
		expect(order()).toEqual(initialOrder);
		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

		// Returning to a diff uses the content that already loaded.
		await userEvent.click(
			workflowCard('workflow:w1').getByRole('button', {
				name: 'Show diff of Invoice reconciliation',
			}),
		);
		await waitFor(() =>
			expect(workflowCard('workflow:w1').getByTestId('active-workflow-diff')).toBeInTheDocument(),
		);
		expect(requestedKeys().filter((key) => key === 'workflow:w1')).toHaveLength(1);

		// A collapsed card gives up its diff.
		await userEvent.click(cardToggle(getAllByTestId, 'workflow:w1'));
		await userEvent.click(cardToggle(getAllByTestId, 'workflow:w1'));
		expect(
			workflowCard('workflow:w1').getByRole('button', {
				name: 'Show diff of Invoice reconciliation',
			}),
		).toBeInTheDocument();
	});

	it('should activate the diff of a linked workflow instead of the first one', async () => {
		answerWorkflowDetails();
		const { getAllByTestId } = await render('/projects/p1/promotions/promote?resource=workflow:w3');
		const workflowCard = (key: string) => card(getAllByTestId, key);

		await waitFor(() =>
			expect(workflowCard('workflow:w3').getByTestId('active-workflow-diff')).toBeInTheDocument(),
		);
		expect(
			workflowCard('workflow:w1').getByRole('button', {
				name: 'Show diff of Invoice reconciliation',
			}),
		).toBeInTheDocument();
		await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
	});

	it('should activate a different workflow when the route changes', async () => {
		answerWorkflowDetails();
		const { getAllByTestId } = await render('/projects/p1/promotions/promote?resource=workflow:w1');
		await waitFor(() =>
			expect(
				card(getAllByTestId, 'workflow:w1').getByTestId('active-workflow-diff'),
			).toBeInTheDocument(),
		);

		await router.push('/projects/p1/promotions/promote?resource=workflow:w3');

		await waitFor(() =>
			expect(
				card(getAllByTestId, 'workflow:w3').getByTestId('active-workflow-diff'),
			).toBeInTheDocument(),
		);
	});

	it('should open the card of a direct link', async () => {
		const { getAllByTestId } = await render('/projects/p1/promotions/promote?resource=tag:g1');

		const card = getAllByTestId('promotion-preview-card').find(
			(element) => element.dataset.resourceKey === 'tag:g1',
		);
		await waitFor(() =>
			expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts).toEqual([card]),
		);
	});

	it('should scroll to the card again when the same item is inspected twice', async () => {
		const { getAllByTestId } = await render();
		const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);

		await userEvent.click(treeRow(getAllByTestId, 'tag:g1').getByText('finance'));
		await userEvent.click(treeRow(getAllByTestId, 'tag:g1').getByText('finance'));

		expect(scrollIntoView).toHaveBeenCalledTimes(2);
	});

	it.each([
		{
			name: 'the project has no environment for it',
			heading: "Promote isn't set up",
			open: async () => {
				vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(
					new ResponseError('No promote promotion environment is configured', {
						httpStatusCode: 404,
					}),
				);
				return await render();
			},
		},
		{
			name: 'the instance has no Apply environment for a whole-instance Apply',
			heading: "Apply isn't set up",
			open: async () => {
				vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([]);
				await router.push('/promotions/apply');
				const result = renderComponent({
					pinia: createTestingPinia(),
					props: { direction: 'apply' },
				});
				await waitAllPromises();
				return result;
			},
		},
	])('should explain that the direction is not set up when $name', async ({ heading, open }) => {
		const { getByTestId } = await open();

		expect(getByTestId('promotion-preview-disconnected')).toHaveTextContent(heading);
	});

	it.each([
		{
			name: 'the preview',
			direction: 'promote',
			fail: () => vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline')),
			heading: "Couldn't load the changes",
		},
		{
			name: 'the preview',
			direction: 'apply',
			fail: () => vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline')),
			heading: "Couldn't load the changes",
		},
	] as const)(
		'should hide unknown counts and retry when $name fails to load for $direction',
		async ({ direction, fail, heading }) => {
			fail();
			const { getByTestId, getByRole } = await render(
				`/projects/p1/promotions/${direction}`,
				direction,
			);
			const action = direction === 'promote' ? 'Promote' : 'Apply';
			const tabs = getByTestId('promotion-preview-tabs');
			const submit = getByTestId('promotion-preview-submit');
			expect(getByTestId('promotion-preview-error')).toHaveTextContent(heading);
			expect(tabs).toHaveTextContent(/^Changes$/);
			expect(submit).toHaveTextContent(new RegExp(`^${action} changes$`));
			expect(submit).toBeDisabled();

			await userEvent.click(getByRole('button', { name: 'Try again' }));
			await waitFor(() => expect(submit).toBeEnabled());
			expect(getByTestId('promotion-preview-tree')).toBeInTheDocument();
			expect(tabs).toHaveTextContent(/Changes\s*5/);
			expect(submit).toHaveTextContent(`${action} 5 changes`);
		},
	);

	it.each(['promote', 'apply'] as const)(
		'puts Refresh and the submit button in the title row for %s',
		async (direction) => {
			const { getByTestId } = await render(`/projects/p1/promotions/${direction}`, direction);

			const titleRow = within(getByTestId('promotion-preview-title-row'));
			expect(titleRow.getByRole('heading', { level: 1 })).toBeInTheDocument();
			expect(titleRow.getByTestId('promotion-preview-refresh')).toBeInTheDocument();
			expect(titleRow.getByTestId('promotion-preview-submit')).toBeInTheDocument();
			expect(within(getByTestId('promotion-preview-tabs')).queryByRole('button')).toBeNull();
		},
	);

	it('should keep the changes and warn when a refresh fails', async () => {
		const { getByTestId, getByText } = await render();
		vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline'));

		await userEvent.click(getByTestId('promotion-preview-refresh'));
		await waitAllPromises();

		expect(getByText(/Couldn't refresh the preview/)).toBeInTheDocument();
		expect(getByTestId('promotion-preview-tree')).toBeInTheDocument();
	});

	describe('with an open review', () => {
		const blocked = () =>
			billingPreview({
				resources: [],
				blocker: { code: 'reviewOpen', reviewId: 'review-1' },
			});

		async function renderBlocked(canReadReviews: boolean, inboxEnabled = true) {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(blocked());
			await router.push('/projects/p1/promotions/promote');
			const pinia = createTestingPinia();
			mockedStore(useRBACStore).hasScope.mockReturnValue(canReadReviews);
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings = {
				...settingsStore.settings,
				inbox: { enabled: inboxEnabled, availableTypes: [], failedTypes: [] },
			};
			const result = renderComponent({ pinia, props: { projectId: 'p1', direction: 'promote' } });
			await waitAllPromises();
			return result;
		}

		it('should show the blocker with a link to the Inbox and no changes to promote', async () => {
			const { getByTestId, queryByTestId, getByText } = await renderBlocked(true);

			expect(getByTestId('promotion-review-blocker')).toHaveTextContent('A review is open');
			expect(queryByTestId('promotion-preview-tree')).not.toBeInTheDocument();
			expect(queryByTestId('promotion-preview-empty')).not.toBeInTheDocument();
			expect(getByTestId('promotion-preview-submit')).toBeDisabled();

			await userEvent.click(getByText('Open the Inbox'));
			await waitFor(() => expect(router.currentRoute.value.name).toBe(INBOX_VIEW));
		});

		it('should ask for an admin when the user cannot read reviews', async () => {
			const { getByTestId, queryByText } = await renderBlocked(false);

			expect(getByTestId('promotion-review-blocker')).toHaveTextContent(
				'Ask an admin to merge or close the review.',
			);
			expect(queryByText('Open the Inbox')).not.toBeInTheDocument();
		});

		it('should not link to the Inbox when the Inbox is off', async () => {
			const { getByTestId, queryByText } = await renderBlocked(true, false);

			expect(getByTestId('promotion-review-blocker')).toHaveTextContent(
				'Ask an admin to merge or close the review.',
			);
			expect(queryByText('Open the Inbox')).not.toBeInTheDocument();
		});
	});

	it('should show the error when the refresh of an empty preview fails', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValueOnce(billingPreview({ resources: [] }));
		const { getByTestId } = await render();
		expect(getByTestId('promotion-preview-empty')).toHaveTextContent('Nothing to promote');
		expect(getByTestId('promotion-preview-tabs')).toHaveTextContent(/Changes\s*0/);
		vi.mocked(api.getPromotionPreview).mockRejectedValueOnce(new Error('offline'));

		await userEvent.click(getByTestId('promotion-preview-refresh'));
		await waitAllPromises();

		// "Nothing to promote" could be out of date, so the page asks for a retry.
		expect(getByTestId('promotion-preview-error')).toHaveTextContent("Couldn't load the changes");
		expect(getByTestId('promotion-preview-tabs')).toHaveTextContent(/^Changes$/);
	});

	it('should promote the selection to a branch that has no commit yet, then go back to the project', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview({ commitSha: null }));
		vi.mocked(api.promoteProjectSelection).mockResolvedValue(
			promoted({
				git: { branchName: 'promotion/p1', commitSha: COMMIT_SHA },
			}),
		);

		const { getByTestId } = await render();
		await promote(getByTestId);

		expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w2', 'w3', 'w4'],
			folderIds: [],
			credentialIds: [],
			expectedPreviewRevision: REVISION,
		});
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Changes promoted',
			message: 'Pushed to promotion/p1.',
			type: 'success',
		});
		expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
	});

	it('should leave out a workflow that moved to another project and say where it went', async () => {
		const preview = billingPreview();
		vi.mocked(api.getPromotionPreview).mockResolvedValue({
			...preview,
			resources: preview.resources.map((resource) =>
				resource.key === 'workflow:w2'
					? { ...resource, change: 'deleted', movedToProject: { id: 'p2', name: 'Ops' } }
					: resource,
			),
		});
		vi.mocked(api.promoteProjectSelection).mockResolvedValue(
			promoted({
				git: { branchName: 'promotion/p1', commitSha: COMMIT_SHA },
			}),
		);

		const { getAllByTestId, getByTestId, getAllByLabelText } = await render();
		const moved = treeRow(getAllByTestId, 'workflow:w2').getByRole('checkbox');
		expect(moved).not.toBeChecked();
		expect(moved).toBeDisabled();
		expect(getAllByLabelText(/This workflow moved to Ops on this instance/).length).toBeGreaterThan(
			0,
		);

		await promote(getByTestId);

		expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w3', 'w4'],
			folderIds: [],
			credentialIds: [],
			expectedPreviewRevision: REVISION,
		});
	});

	it('should send the trimmed commit message from the promote dialog', async () => {
		vi.mocked(api.promoteProjectSelection).mockResolvedValue(
			promoted({
				git: { branchName: 'main', commitSha: COMMIT_SHA },
			}),
		);

		const { getByTestId } = await render();
		await promote(getByTestId, '  Route leads by region  ');

		expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w2', 'w3', 'w4'],
			folderIds: [],
			credentialIds: [],
			commitMessage: 'Route leads by region',
			expectedPreviewRevision: REVISION,
		});
	});

	it('should keep the typed commit message after a failed promote', async () => {
		vi.mocked(api.promoteProjectSelection).mockRejectedValueOnce(new Error('offline'));

		const { getByTestId, queryByTestId } = await render();
		await promote(getByTestId, 'Route leads by region');
		await waitFor(() => expect(queryByTestId('promote-selection-dialog')).not.toBeInTheDocument());

		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(getByTestId('promote-commit-message')).toHaveValue('Route leads by region');
	});

	it('should close the promote dialog and clear the typed commit message when the project changes', async () => {
		// The project change mounts the cards again. One workflow keeps this case focused.
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			billingPreview({
				resources: [{ ...billingResources.reconciliation, parentKey: null }],
				dependencies: [],
			}),
		);
		vi.mocked(api.promoteProjectSelection).mockRejectedValueOnce(new Error('offline'));

		const { getByTestId, queryByTestId, rerender } = await render();
		await promote(getByTestId, 'Route leads by region');
		await waitFor(() => expect(queryByTestId('promote-selection-dialog')).not.toBeInTheDocument());
		expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1'],
			folderIds: [],
			credentialIds: [],
			commitMessage: 'Route leads by region',
			expectedPreviewRevision: REVISION,
		});

		// The dialog is still open when the user lands on the preview of another project.
		await userEvent.click(getByTestId('promotion-preview-submit'));
		expect(getByTestId('promote-commit-message')).toHaveValue('Route leads by region');

		await rerender({ projectId: 'p2', direction: 'promote' });
		await waitAllPromises();
		expect(api.getPromotionPreview).toHaveBeenLastCalledWith(expect.anything(), 'p2', 'promote');
		// It stays closed, so its Confirm cannot promote the other project.
		expect(queryByTestId('promote-selection-dialog')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(getByTestId('promote-commit-message')).toHaveValue('');
	});

	it('should name the branch of the previewed environment and not promote when the dialog is canceled', async () => {
		const preview = billingPreview();
		vi.mocked(api.getPromotionPreview).mockResolvedValue({
			...preview,
			source: { ...preview.source, branchName: 'release' },
			environment: { ...preview.environment, createBranchOnPromotion: false },
		});
		const { getByTestId, queryByTestId } = await render();
		await userEvent.click(getByTestId('promotion-preview-submit'));
		expect(getByTestId('promote-selection-dialog')).toHaveTextContent(
			'This promotes the selected changes to branch release.',
		);
		await userEvent.click(getByTestId('promote-cancel-button'));

		await waitFor(() => expect(queryByTestId('promote-selection-dialog')).not.toBeInTheDocument());
		expect(api.promoteProjectSelection).not.toHaveBeenCalled();
	});

	it('should keep the promotion toast open and link the merge request', async () => {
		vi.mocked(api.promoteProjectSelection).mockResolvedValue(
			promoted({
				git: { branchName: 'promotion/p1', commitSha: COMMIT_SHA },
				// eslint-disable-next-line id-denylist -- the merge request number of the API
				review: { reviewId: 'review-1', number: 3, webUrl: 'https://gitlab.example/mr/3' },
			}),
		);

		const { getByTestId } = await render();
		await promote(getByTestId);

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Changes promoted', type: 'success', duration: 0 }),
		);
		const message = showMessage.mock.calls[0]?.[0].message;
		const toast = renderToast(defineComponent({ render: () => message }));
		const link = toast.getByRole('link', { name: 'View merge request' });
		expect(link).toHaveAttribute('href', 'https://gitlab.example/mr/3');
		expect(link).toHaveAttribute('target', '_blank');
		expect(toast.queryByText(/Pushed to/)).not.toBeInTheDocument();
	});

	it('should keep promotion warnings visible in the toast', async () => {
		vi.mocked(api.promoteProjectSelection).mockResolvedValue(
			promoted({
				git: { branchName: 'promotion/p1', commitSha: COMMIT_SHA },
				warnings: [{ message: 'No merge request was opened.' }],
			}),
		);

		const { getByTestId } = await render();
		await promote(getByTestId);

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Changes promoted', type: 'warning', duration: 0 }),
		);
		const message = showMessage.mock.calls[0]?.[0].message;
		const toast = renderToast(defineComponent({ render: () => message }));
		expect(toast.getByText('Pushed to promotion/p1.')).toBeInTheDocument();
		expect(toast.getByText('No merge request was opened.')).toBeInTheDocument();
	});

	it('should apply only the workflows without blockers, once, at the commit of the check', async () => {
		// "Weekly KPI report" needs a variable that this instance does not have.
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			previewWithCheck(
				check({ missingBindings: [{ ...variable, name: 'API_URL', consumers: consumers('w3') }] }),
			),
		);
		let answer: (value: string) => void = () => {};
		confirm.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		vi.mocked(api.applyProjectSelection).mockResolvedValue(applied);

		const { getAllByTestId, getByTestId } = await renderApply();
		const blocked = treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
		expect(blocked).not.toBeChecked();
		expect(blocked).toBeDisabled();
		// The blocked workflow also excludes its required variable from the selection.
		expect(getByTestId('promotion-preview-submit')).toHaveTextContent('Apply 3 changes');

		await userEvent.click(getByTestId('promotion-preview-submit'));
		await userEvent.click(getByTestId('promotion-preview-submit'));
		answer('confirm');
		await waitAllPromises();

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(api.applyProjectSelection).toHaveBeenCalledTimes(1);
		expect(api.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w2', 'w4'],
			folderIds: [],
			expectedSource,
			expectedPreviewRevision: REVISION,
		});
		expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
	});

	it('should report only the folder and project changes after an Apply that changes no workflow', async () => {
		confirm.mockResolvedValue('confirm');
		const { counts } = applied;
		vi.mocked(api.applyProjectSelection).mockResolvedValue({
			...applied,
			counts: {
				...counts,
				projects: { ...counts.projects, updated: 1 },
				folders: { ...counts.folders, created: 1 },
				workflows: {
					...counts.workflows,
					created: 0,
					updated: 0,
					publishing: { ...counts.workflows.publishing, blocked: 0, failed: 0 },
				},
			},
		});

		const { getByTestId } = await renderApply();
		await userEvent.click(getByTestId('promotion-preview-submit'));
		await waitAllPromises();

		expect(showMessage).toHaveBeenCalledWith({
			title: 'Changes applied',
			message: 'Created: 1 folder. Updated the project name and details.',
			type: 'success',
		});
	});

	it('should confirm a data table change only when the selection imports it, and keep the selection when the branch moves', async () => {
		// Both invoice workflows include the "Invoices" table. The apply removes a column.
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			previewWithCheck(
				check({
					conflicts: [{ ...destructiveChange, id: 't1', consumers: consumers('w1', 'w2') }],
				}),
			),
		);
		const { environmentId, git } = check();
		vi.mocked(api.applyProjectSelection).mockResolvedValue({
			environmentId,
			git,
			status: 'source-changed',
		});
		vi.mocked(api.continueApplyProjectSelection).mockResolvedValue(applied);

		const { getAllByTestId, getByTestId } = await renderApply();
		const submit = getByTestId('promotion-preview-submit');

		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		await userEvent.click(treeRow(getAllByTestId, 'workflow:w2').getByRole('checkbox'));
		await userEvent.click(submit);

		expect(api.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w3', 'w4'],
			folderIds: [],
			expectedSource,
			expectedPreviewRevision: REVISION,
		});
		expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
			'The branch changed',
		);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
		expect(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox')).not.toBeChecked();

		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		await userEvent.click(submit);

		expect(api.continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w3', 'w4'],
			folderIds: [],
			expectedSource,
			expectedPreviewRevision: REVISION,
			confirmDestructiveChanges: true,
		});
		// The confirmation says what the apply removes.
		expect(confirm).toHaveBeenLastCalledWith(
			expect.stringContaining("can't be restored"),
			'Apply data table changes?',
			expect.objectContaining({ confirmButtonText: 'Apply data table changes' }),
		);
	});

	it('should say why when this instance changed after the page loaded', async () => {
		const { environmentId, git } = check();
		vi.mocked(api.applyProjectSelection).mockResolvedValue({
			environmentId,
			git,
			status: 'preview-changed',
		});

		const { getAllByTestId, getByTestId } = await renderApply();
		await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
			'This instance changed',
		);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
	});

	it('should say why when the project changed after the page loaded, and promote the new preview with the same message', async () => {
		const newRevision = 'b'.repeat(64);
		vi.mocked(api.getPromotionPreview)
			.mockResolvedValueOnce(billingPreview())
			.mockResolvedValue(billingPreview({ revision: newRevision }));
		vi.mocked(api.promoteProjectSelection)
			.mockResolvedValueOnce({ status: 'preview-changed', environmentId: 'environment-1' })
			.mockResolvedValue(promoted());

		const { getByTestId, queryByTestId } = await render();
		await promote(getByTestId, 'Route leads by region');

		expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
			"This project or its branch changed after the page loaded, so Promote didn't push anything.",
		);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
		expect(router.currentRoute.value.name).not.toBe(VIEWS.PROJECTS_WORKFLOWS);

		await waitFor(() => expect(queryByTestId('promote-selection-dialog')).not.toBeInTheDocument());
		await promote(getByTestId);

		expect(api.promoteProjectSelection).toHaveBeenLastCalledWith(expect.anything(), 'p1', {
			workflowIds: ['w1', 'w2', 'w3', 'w4'],
			folderIds: [],
			credentialIds: [],
			commitMessage: 'Route leads by region',
			expectedPreviewRevision: newRevision,
		});
		expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
	});

	it('should not apply any selection while a folder moved into the project from another one, and say why', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			previewWithCheck({
				...check(),
				// The branch holds "Payments" in this project, while this instance holds it in Ops.
				movedFolders: [
					{
						id: 'f1',
						name: 'Payments',
						project: { id: 'p1', name: 'Billing' },
						projectExists: true,
						instanceProject: { id: 'p2', name: 'Ops' },
					},
				],
			}),
		);

		const { getByTestId } = await renderApply();

		expect(getByTestId('promotion-preview-submit')).toBeDisabled();
		expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Apply changes$/);
		expect(getByTestId('promotion-preview-submit-blocked')).toHaveTextContent(
			'Apply is disabled. The branch and this instance hold the folder "Payments" in different projects',
		);
	});

	it('should offer only the source fix when the branch project of a moved workflow does not exist here', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			previewWithCheck({
				...check(),
				movedWorkflows: [
					{
						id: 'w2',
						name: 'Payment reminders',
						project: { id: 'p3', name: 'Archive' },
						projectExists: false,
						instanceProject: { id: 'p1', name: 'Billing' },
					},
				],
			}),
		);

		const { getByTestId, getByRole } = await renderApply();
		await userEvent.click(getByRole('tab', { name: /Issues/ }));
		const row = within(getByTestId('promotion-preview-blockers-table')).getByRole('row', {
			name: /Payment reminders/,
		});

		expect(row).toHaveTextContent('Archive, which does not exist on this instance yet');
		expect(row).toHaveTextContent('Move it back on the source instance, then promote again.');
		expect(row).not.toHaveTextContent('Move it on this instance');
	});

	it('should explain why Apply cannot write a data table or a tag', async () => {
		vi.mocked(api.getPromotionPreview).mockResolvedValue(
			previewWithCheck(
				check({
					conflicts: [
						{
							kind: 'data-table',
							code: 'data-table-conflict',
							id: 't1',
							name: 'Orders',
							reason: 'id-conflict',
							consumers: consumers('w1'),
						},
						{
							kind: 'tag',
							code: 'tag-conflict',
							id: 'tag1',
							name: 'Finance',
							reason: 'rename-drift',
							consumers: consumers('w1'),
						},
					],
				}),
			),
		);

		const { getByTestId, getByRole } = await renderApply();
		await userEvent.click(getByRole('tab', { name: /Issues/ }));
		const table = within(getByTestId('promotion-preview-blockers-table'));

		expect(table.getByRole('row', { name: /Orders/ })).toHaveTextContent(
			'A data table in another project on this instance already uses this ID.',
		);
		expect(table.getByRole('row', { name: /Finance/ })).toHaveTextContent(
			'another tag already uses this name. Rename or delete one of the two tags on this instance.',
		);
	});

	it('should apply a workflow that the branch holds in another folder of the project', async () => {
		// The branch holds "Payment reminders" at the project root. This instance holds it in "Payments".
		const preview = previewWithCheck();
		vi.mocked(api.getPromotionPreview).mockResolvedValue({
			...preview,
			resources: preview.resources.map((resource) =>
				resource.key === 'workflow:w2'
					? {
							...resource,
							change: 'modified' as const,
							parentKey: 'project:p1',
							previousParentKey: 'folder:f1',
						}
					: resource,
			),
		});
		vi.mocked(api.applyProjectSelection).mockResolvedValue(applied);

		const { getAllByTestId, getByTestId } = await renderApply();
		const moved = treeRow(getAllByTestId, 'workflow:w2').getByRole('checkbox');
		expect(moved).not.toBeDisabled();
		expect(getByTestId('promotion-preview-submit')).toBeEnabled();
		expect(getByTestId('promotion-preview-submit')).toHaveTextContent('Apply 6 changes');

		await userEvent.click(getByTestId('promotion-preview-submit'));

		expect(api.applyProjectSelection).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			expect.objectContaining({ workflowIds: expect.arrayContaining(['w2']) }),
		);
	});

	it('should tell users whether to retry, resolve a conflict or check the changes after a failed apply', async () => {
		vi.mocked(api.applyProjectSelection)
			.mockRejectedValueOnce(new ResponseError('Too many requests', { httpStatusCode: 429 }))
			.mockRejectedValueOnce(
				new ResponseError('Import blocked: 1 issue(s) must be resolved', { httpStatusCode: 409 }),
			)
			.mockRejectedValueOnce(new ResponseError("Can't connect to n8n."));
		const { getByTestId } = await renderApply();
		const error = () => getByTestId('promotion-preview-operation-error');

		await userEvent.click(getByTestId('promotion-preview-submit'));
		expect(error()).toHaveTextContent('Too many requests Nothing changed. Try again.');
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(1);

		// The import stops for the same reason every time, so a retry alone does not help.
		await userEvent.click(getByTestId('promotion-preview-submit'));
		expect(error()).toHaveTextContent('Change this instance or the branch to match, then refresh.');
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);

		await userEvent.click(getByTestId('promotion-preview-submit'));
		expect(error()).toHaveTextContent('The request may have run.');
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(3);
	});

	it('should apply a blocked workflow after the user adds the missing variable', async () => {
		const missing = { ...variable, name: 'API_URL', consumers: consumers('w3') };
		vi.mocked(api.getPromotionPreview)
			.mockResolvedValueOnce(previewWithCheck(check({ missingBindings: [missing] })))
			.mockResolvedValue(previewWithCheck());
		createBinding.mockResolvedValue({
			kind: 'variable',
			id: 'v1',
			name: 'API_URL',
			scope: { kind: 'global' },
		});

		const { getAllByTestId, getByTestId, getByRole } = await renderApply();
		expect(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox')).toBeDisabled();

		await userEvent.click(
			treeRow(getAllByTestId, 'workflow:w3').getByTestId('promotion-preview-tree-blocker'),
		);
		expect(getByRole('tab', { name: /Issues/ })).toHaveAttribute('aria-selected', 'true');
		const row = within(getByTestId('promotion-preview-blockers-table')).getByRole('row', {
			name: /API_URL/,
		});
		await userEvent.click(within(row).getByRole('button', { name: 'Add variable' }));
		await waitAllPromises();

		expect(createBinding).toHaveBeenCalledWith(missing);
		expect(row).toHaveTextContent('Resolved');
		expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent('No issues');
		// The refreshed check has no issues, so the workflow joins the selection again.
		await userEvent.click(getByRole('tab', { name: /Changes/ }));
		expect(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox')).toBeChecked();
		expect(getByTestId('promotion-preview-submit')).toBeEnabled();
	});

	describe('missing dependencies on Promote', () => {
		it.each([
			['the preview has empty lists', { missingDependencies: [], warnings: [] }],
			['the preview has no lists', {}],
		])('should show the page as before when %s', async (_case, lists) => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview(lists));

			const { getAllByRole, getByTestId, queryByTestId, queryAllByTestId } = await render();

			expect(getAllByRole('tab')).toHaveLength(1);
			expect(getAllByRole('tab')[0]).toHaveTextContent('Changes');
			expect(queryByTestId('promotion-preview-blockers')).not.toBeInTheDocument();
			expect(queryAllByTestId('promotion-preview-tree-dependencies')).toHaveLength(0);
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Promote \d+ changes$/);
		});

		it('should list the missing dependencies of the selection in one section for each group', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [personalCredential, outsideAccessWorkflow, otherProjectCredential],
				}),
			);

			const { findByTestId, getAllByRole, getAllByTestId, getByRole, getByTestId, queryByTestId } =
				await render();
			const tab = getByRole('tab', { name: /Issues/ });
			expect(tab).toHaveTextContent(/^Issues\s*3$/);
			await userEvent.click(tab);

			expect(getByTestId('promotion-preview-blockers')).toHaveTextContent(
				'Issues may stop you from promoting some changes.',
			);
			expect(
				getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.trim()),
			).toEqual(['In another project (1)', 'Outside your access (1)', 'Cannot be promoted (1)']);
			// Apply says "No issues" or counts the issues to resolve. Promote has nothing to resolve here.
			expect(queryByTestId('promotion-preview-blockers-status')).not.toBeInTheDocument();

			const otherProject = section(getAllByTestId, 'In another project (1)');
			expect(
				otherProject.getByText(
					'These dependencies are in other projects that you can access. This Promote does not include them. Promote them from their own project. You can promote without them.',
				),
			).toBeVisible();
			expect(cells(otherProject.getByRole('row', { name: /CRM key/ }))).toEqual([
				'CRM key',
				'Invoice reconciliation',
				'Credential',
				'Not included',
				'Include',
			]);
			expect(
				otherProject.getByTestId('promotion-preview-blocker-disabled-action'),
			).toHaveAccessibleName(
				'Include. This dependency is in another project. Promote it from that project.',
			);

			const outside = section(getAllByTestId, 'Outside your access (1)');
			expect(
				outside.getByText(
					'You do not have access to these dependencies. You can promote without them.',
				),
			).toBeVisible();
			expect(cells(outside.getByRole('row', { name: /Send audit log/ }))).toEqual([
				'Send audit log',
				'Invoice reconciliationWeekly KPI report',
				'Workflow',
				'No access',
				'Include',
			]);
			expect(outside.getByTestId('promotion-preview-blocker-disabled-action')).toHaveAccessibleName(
				'Include. This workflow is in a project that you do not have access to, so you cannot include it.',
			);

			const personal = section(getAllByTestId, 'Cannot be promoted (1)');
			expect(
				personal.getByText(
					'These credentials are in a personal project. Move them to a team project to promote them.',
				),
			).toBeVisible();
			expect(cells(personal.getByRole('row', { name: /Personal Gmail/ }))).toEqual([
				'Personal Gmail',
				'Weekly KPI report',
				'Credential',
				'Personal project',
				'Include',
			]);
			const action = personal.getByTestId('promotion-preview-blocker-disabled-action');
			expect(action).toHaveAccessibleName(
				'Include. This credential is in a personal project. Move it to a team project to promote it.',
			);
			expect(within(action).getByRole('button', { name: 'Include' })).toBeDisabled();
			// The disabled button takes no focus, so its wrapper opens the reason for keyboard users.
			expect(action).toHaveAttribute('tabindex', '0');
			action.focus();
			expect(await findByTestId('tooltip-content')).toHaveTextContent(
				'This credential is in a personal project. Move it to a team project to promote it.',
			);
		});

		it('should name the project of a dependency of another project in its row, and in the reason of its action', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [
						{ ...otherProjectCredential, project: { id: 'p2', name: 'Finance' } },
						// A row without a project keeps the text that names no project.
						{ ...otherProjectCredential, id: 'c9', name: 'ERP key' },
					],
				}),
			);

			const { findByTestId, getAllByTestId, getByRole } = await render();
			await userEvent.click(getByRole('tab', { name: /Issues/ }));

			const otherProject = section(getAllByTestId, 'In another project (2)');
			// The text shows below the name, in the first cell of the row.
			const named = otherProject.getByRole('row', { name: /CRM key/ });
			expect(cells(named)[0]).toBe(
				'CRM keyThis dependency is in the project Finance. Promote it from that project.',
			);
			expect(
				within(named).getByText(
					'This dependency is in the project Finance. Promote it from that project.',
				),
			).toBeVisible();
			expect(cells(otherProject.getByRole('row', { name: /ERP key/ }))[0]).toBe('ERP key');
			const action = (name: RegExp) =>
				within(otherProject.getByRole('row', { name })).getByTestId(
					'promotion-preview-blocker-disabled-action',
				);
			expect(action(/CRM key/)).toHaveAccessibleName(
				'Include. This dependency is in the project Finance. Promote it from that project.',
			);
			expect(action(/ERP key/)).toHaveAccessibleName(
				'Include. This dependency is in another project. Promote it from that project.',
			);
			action(/CRM key/).focus();
			expect(await findByTestId('tooltip-content')).toHaveTextContent(
				'This dependency is in the project Finance. Promote it from that project.',
			);
		});

		it('should not name credentials when a personal sub-workflow cannot be promoted', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [personalCredential, personalWorkflow],
				}),
			);

			const { getAllByTestId, getByRole } = await render();
			await userEvent.click(getByRole('tab', { name: /Issues/ }));

			const personal = section(getAllByTestId, 'Cannot be promoted (2)');
			expect(
				personal.getByText(
					'These dependencies are in a personal project. Move them to a team project to promote them.',
				),
			).toBeVisible();
			expect(
				within(personal.getByRole('row', { name: /Draft helper/ })).getByTestId(
					'promotion-preview-blocker-disabled-action',
				),
			).toHaveAccessibleName(
				'Include. This workflow is in a personal project. Move it to a team project to promote it.',
			);
		});

		it('should say that someone with access must move a personal dependency that the user cannot access', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [personalCredential, { ...personalWorkflow, accessible: false }],
				}),
			);

			const { getAllByTestId, getByRole } = await render();
			await userEvent.click(getByRole('tab', { name: /Issues/ }));

			const personal = section(getAllByTestId, 'Cannot be promoted (2)');
			expect(
				personal.getByText(
					'These dependencies are in a personal project. Someone with access must move them to a team project to promote them.',
				),
			).toBeVisible();
			const action = (name: RegExp) =>
				within(personal.getByRole('row', { name })).getByTestId(
					'promotion-preview-blocker-disabled-action',
				);
			expect(action(/Draft helper/)).toHaveAccessibleName(
				'Include. This workflow is in a personal project that you do not have access to. Someone with access must move it to a team project to promote it.',
			);
			// The user can access the personal project of this credential, and so can move it.
			expect(action(/Personal Gmail/)).toHaveAccessibleName(
				'Include. This credential is in a personal project. Move it to a team project to promote it.',
			);
		});

		it('should show no project and no owner in a row when the API sends no project of the dependency', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [otherProjectCredential, outsideAccessWorkflow],
					warnings: [deletedWorkflowWarning],
				}),
			);

			const { getAllByTestId, getByRole, getByTestId } = await render();
			await userEvent.click(getByRole('tab', { name: /Issues/ }));

			// "Billing" is the project of the workflows. A row names only the project of its
			// dependency, and only when the API sends it.
			expect(getByTestId('promotion-preview-blockers')).not.toHaveTextContent('Billing');
			for (const row of getAllByTestId('promotion-preview-blocker-row')) {
				expect(row).not.toHaveTextContent(/project|owner/i);
			}
			expect(getByTestId('promotion-preview-dependency-warning')).not.toHaveTextContent(
				/project|owner/i,
			);
		});

		it('should keep only the issues of the selected workflows, and remove the tab when none is left', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [otherProjectCredential, outsideAccessWorkflow, personalCredential],
				}),
			);
			const { getAllByTestId, getByRole, queryByRole, queryByText } = await render();

			// Only "Weekly KPI report" (w3) uses "Personal Gmail".
			await userEvent.click(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox'));
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*2$/);
			await userEvent.click(getByRole('tab', { name: /Issues/ }));
			expect(queryByText('Personal Gmail')).not.toBeInTheDocument();
			expect(
				cells(
					section(getAllByTestId, 'Outside your access (1)').getByRole('row', {
						name: /Send audit log/,
					}),
				)[1],
			).toBe('Invoice reconciliation');

			await userEvent.click(getByRole('tab', { name: /Changes/ }));
			await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
			expect(queryByRole('tab', { name: /Issues/ })).not.toBeInTheDocument();
		});

		it('should mark the selected workflows that use a missing dependency, and open the Issues tab from the marker', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({ missingDependencies: [otherProjectCredential, outsideAccessWorkflow] }),
			);
			const { getAllByTestId, getByRole, queryAllByTestId } = await render();

			expect(queryAllByTestId('promotion-preview-tree-dependencies')).toHaveLength(2);
			expect(
				treeRow(getAllByTestId, 'workflow:w1').getByTestId('promotion-preview-tree-dependencies'),
			).toHaveAccessibleName('2 dependencies are not included in this Promote.');
			const row = treeRow(getAllByTestId, 'workflow:w3');
			const marker = row.getByTestId('promotion-preview-tree-dependencies');
			expect(marker).toHaveAccessibleName(
				'This workflow uses 1 dependency that is outside your access. You can promote it without it.',
			);
			// The dependency does not stop the workflow, so users can still clear and select it.
			expect(row.getByRole('checkbox')).toBeChecked();
			expect(row.getByRole('checkbox')).toBeEnabled();

			await userEvent.click(marker);
			expect(getByRole('tab', { name: /Issues/ })).toHaveAttribute('aria-selected', 'true');

			// A workflow name in the tab opens the card of the workflow.
			await userEvent.click(getByRole('button', { name: 'Weekly KPI report' }));
			expect(getByRole('tab', { name: /Changes/ })).toHaveAttribute('aria-selected', 'true');
			expect(router.currentRoute.value.query.resource).toBe('workflow:w3');

			await userEvent.click(row.getByRole('checkbox'));
			expect(row.queryByTestId('promotion-preview-tree-dependencies')).not.toBeInTheDocument();
		});

		it('should list a reference to a deleted workflow as a warning, and not count it', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({ missingDependencies: [], warnings: [deletedWorkflowWarning] }),
			);
			const { getByRole, getByTestId, queryAllByTestId } = await render();

			const tab = getByRole('tab', { name: /Issues/ });
			expect(tab).toHaveTextContent(/^Issues$/);
			await userEvent.click(tab);

			expect(getByRole('heading', { level: 2, name: '1 warning' })).toBeVisible();
			expect(queryAllByTestId('promotion-preview-blocker-row')).toHaveLength(0);
			expect(cells(getByTestId('promotion-preview-dependency-warning'))).toEqual([
				'Archive invoicesThis workflow does not exist on this instance. Workflows that use it will fail where this is applied.',
				'Invoice reconciliation',
				'Workflow',
			]);
		});

		it('should name the unresolved dependencies of the selection on the Promote button', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({
					missingDependencies: [otherProjectCredential, outsideAccessWorkflow, personalCredential],
					// A warning needs no confirmation, so the button does not count it.
					warnings: [deletedWorkflowWarning],
				}),
			);
			const { getAllByTestId, getByTestId } = await render();
			const submit = getByTestId('promotion-preview-submit');
			expect(submit).toHaveTextContent(/^Promote with 3 unresolved dependencies$/);
			expect(submit).toBeEnabled();

			// Only "Weekly KPI report" (w3) uses "Personal Gmail".
			await userEvent.click(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox'));
			expect(submit).toHaveTextContent(/^Promote with 2 unresolved dependencies$/);

			await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
			expect(submit).toHaveTextContent(/^Promote \d+ changes?$/);
		});

		it('should use the singular for one unresolved dependency', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({ missingDependencies: [personalCredential] }),
			);
			const { getByRole, getByTestId } = await render();

			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Promote with 1 unresolved dependency$/,
			);
			await userEvent.click(getByTestId('promotion-preview-submit'));
			expect(getByRole('heading', { name: 'Promote with 1 unresolved dependency?' })).toBeVisible();
			expect(getByTestId('promote-confirm-button')).toHaveTextContent(
				/^Promote with 1 unresolved dependency$/,
			);
		});

		it('should list the unresolved dependencies in the Promote dialog, and send the confirmation with the reviewed revision', async () => {
			const missingDependencies = [
				otherProjectCredential,
				outsideAccessWorkflow,
				personalCredential,
			];
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({ missingDependencies, warnings: [deletedWorkflowWarning] }),
			);
			vi.mocked(api.promoteProjectSelection).mockResolvedValue(promoted({ missingDependencies }));

			const { getAllByTestId, getByRole, getByTestId } = await render();
			await userEvent.click(getByTestId('promotion-preview-submit'));

			const dialog = getByTestId('promote-selection-dialog');
			expect(
				getByRole('heading', { name: 'Promote with 3 unresolved dependencies?' }),
			).toBeVisible();
			expect(dialog).toHaveTextContent('This promotes the selected changes to branch main.');
			expect(dialog).toHaveTextContent(
				'These dependencies are not on the branch after this Promote. Workflows that use them cannot be published where this is applied until the dependencies exist there.',
			);
			// The warning is not in the list. The Issues tab shows it.
			expect(
				getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
			).toEqual([
				'CRM keyCredential · Used by Invoice reconciliation',
				'Send audit logWorkflow · Used by Invoice reconciliation, Weekly KPI report',
				'Personal GmailCredential · Used by Weekly KPI report',
			]);
			const list = getByTestId('promotion-missing-dependency-list');
			expect(
				list.compareDocumentPosition(getByTestId('promote-commit-message')) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
			// "Billing" is the project of the workflows. The API sends no project for a dependency.
			expect(dialog).not.toHaveTextContent('Billing');
			expect(dialog).not.toHaveTextContent(/project|owner/i);
			expect(getByTestId('promote-confirm-button')).toHaveTextContent(
				/^Promote with 3 unresolved dependencies$/,
			);

			await userEvent.click(getByTestId('promote-confirm-button'));

			expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				credentialIds: [],
				expectedPreviewRevision: REVISION,
				confirmMissingDependencies: true,
			});
			expect(showMessage).toHaveBeenCalledWith({
				title: 'Changes promoted',
				message: 'Pushed to main. 3 dependencies are not included.',
				type: 'success',
			});
			expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
		});

		it('should say how many dependencies are not included under the link to the merge request', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({ missingDependencies: [personalCredential] }),
			);
			vi.mocked(api.promoteProjectSelection).mockResolvedValue(
				promoted({
					missingDependencies: [personalCredential],
					// eslint-disable-next-line id-denylist -- the merge request number of the API
					review: { reviewId: 'review-1', number: 3, webUrl: 'https://gitlab.example/mr/3' },
				}),
			);

			const { getByTestId } = await render();
			await promote(getByTestId);

			const message = showMessage.mock.calls[0]?.[0].message;
			const toast = renderToast(defineComponent({ render: () => message }));
			expect(toast.getByRole('link', { name: 'View merge request' })).toBeVisible();
			expect(toast.getByText('1 dependency is not included.')).toBeVisible();
		});

		it('should show the dialog and send the request as before when only a warning exists', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				billingPreview({ warnings: [deletedWorkflowWarning] }),
			);
			vi.mocked(api.promoteProjectSelection).mockResolvedValue(promoted());

			const { getByRole, getByTestId, queryByTestId } = await render();
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Promote \d+ changes$/);
			await userEvent.click(getByTestId('promotion-preview-submit'));

			expect(getByRole('heading', { name: /^Promote \d+ changes\?$/ })).toBeVisible();
			expect(queryByTestId('promotion-missing-dependency-list')).not.toBeInTheDocument();
			expect(getByTestId('promote-confirm-button')).toHaveTextContent(/^Promote$/);
			await userEvent.click(getByTestId('promote-confirm-button'));

			expect(api.promoteProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				credentialIds: [],
				expectedPreviewRevision: REVISION,
			});
			expect(showMessage).toHaveBeenCalledWith({
				title: 'Changes promoted',
				message: 'Pushed to main.',
				type: 'success',
			});
		});

		it('should push nothing and show the list when the Promote finds dependencies that the user did not confirm', async () => {
			const newRevision = 'b'.repeat(64);
			vi.mocked(api.getPromotionPreview)
				.mockResolvedValueOnce(billingPreview())
				.mockResolvedValue(
					billingPreview({ revision: newRevision, missingDependencies: [outsideAccessWorkflow] }),
				);
			vi.mocked(api.promoteProjectSelection)
				.mockResolvedValueOnce({
					status: 'missing-dependencies',
					environmentId: 'environment-1',
					missingDependencies: [outsideAccessWorkflow],
					warnings: [],
				})
				.mockResolvedValue(promoted({ missingDependencies: [outsideAccessWorkflow] }));

			const { getByRole, getByTestId, queryByTestId } = await render();
			await promote(getByTestId);

			expect(api.promoteProjectSelection).toHaveBeenLastCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				credentialIds: [],
				expectedPreviewRevision: REVISION,
			});
			expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
				"This project or its branch changed after the page loaded, so Promote didn't push anything. The page now shows the latest changes. Review them and promote again.",
			);
			expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
			expect(showMessage).not.toHaveBeenCalled();
			expect(router.currentRoute.value.name).not.toBe(VIEWS.PROJECTS_WORKFLOWS);
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*1$/);
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Promote with 1 unresolved dependency$/,
			);

			await waitFor(() =>
				expect(queryByTestId('promote-selection-dialog')).not.toBeInTheDocument(),
			);
			await promote(getByTestId);

			expect(api.promoteProjectSelection).toHaveBeenLastCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				credentialIds: [],
				expectedPreviewRevision: newRevision,
				confirmMissingDependencies: true,
			});
			expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
		});

		it('should push nothing and show the new list when the list changed after the user confirmed it', async () => {
			vi.mocked(api.getPromotionPreview)
				.mockResolvedValueOnce(billingPreview({ missingDependencies: [personalCredential] }))
				.mockResolvedValue(
					billingPreview({
						revision: 'b'.repeat(64),
						missingDependencies: [personalCredential, outsideAccessWorkflow],
					}),
				);
			vi.mocked(api.promoteProjectSelection).mockResolvedValue({
				status: 'preview-changed',
				environmentId: 'environment-1',
			});

			const { getByTestId } = await render();
			await promote(getByTestId);

			expect(api.promoteProjectSelection).toHaveBeenCalledWith(
				expect.anything(),
				'p1',
				expect.objectContaining({
					expectedPreviewRevision: REVISION,
					confirmMissingDependencies: true,
				}),
			);
			expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
				"so Promote didn't push anything.",
			);
			expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
			expect(showMessage).not.toHaveBeenCalled();
			expect(router.currentRoute.value.name).not.toBe(VIEWS.PROJECTS_WORKFLOWS);
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Promote with 2 unresolved dependencies$/,
			);
		});
	});

	describe('missing dependencies on Apply', () => {
		// "Invoice reconciliation" (w1) needs a credential, and "Weekly KPI report" (w3) a variable.
		const missingCredential = { ...credential, sourceId: 'c1', consumers: consumers('w1') };
		const missingVariable = { ...variable, name: 'API_URL', consumers: consumers('w3') };
		const headings = (getAllByRole: (role: string, options: object) => HTMLElement[]) =>
			getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.trim());

		const renderIssues = async (fields: Partial<ApplyCheckResult>) => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(previewWithCheck(check(fields)));
			const result = await renderApply();
			await userEvent.click(result.getByRole('tab', { name: /Issues/ }));
			return result;
		};

		it('should show the page as before when nothing is missing', async () => {
			const { getAllByRole, getByRole, getByTestId, queryAllByTestId } = await renderApply();

			expect(getAllByRole('tab').map((tab) => tab.textContent?.trim())).toEqual([
				expect.stringMatching(/^Changes\s*\d+$/),
				'Issues',
			]);
			expect(queryAllByTestId('promotion-preview-tree-dependencies')).toHaveLength(0);
			expect(queryAllByTestId('promotion-preview-tree-blocker')).toHaveLength(0);
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Apply \d+ changes$/);

			await userEvent.click(getByRole('tab', { name: /Issues/ }));
			expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
				'No issues. You can apply the selected changes.',
			);
			expect(queryAllByTestId('promotion-preview-blockers-section')).toHaveLength(0);
		});

		it('should list a dependency that the check details in one row, under "Needs your action"', async () => {
			const access = {
				...credential,
				code: 'access-required' as const,
				sourceId: 'c2',
				name: 'Currency API',
				consumers: consumers('w1'),
			};
			const { getAllByRole, getAllByTestId, getByRole, getByTestId } = await renderIssues({
				missingBindings: [missingCredential, missingVariable],
				accessRequirements: [access],
				// The list repeats the entries of the other lists.
				missingDependencies: [
					repeatedBinding(missingCredential),
					repeatedBinding(missingVariable),
					{ ...repeatedBinding(access), reason: 'not-shared' },
				],
			});

			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*3$/);
			expect(headings(getAllByRole)).toEqual(['Needs your action (3)']);
			const needsAction = section(getAllByTestId, 'Needs your action (3)');
			expect(
				needsAction.getByText('Create these dependencies or use a placeholder before you apply.'),
			).toBeVisible();
			expect(getAllByTestId('promotion-preview-blocker-row')).toHaveLength(3);
			expect(cells(needsAction.getByRole('row', { name: /API_URL/ }))).toEqual([
				'API_URL',
				'w3',
				'Variable',
				'Missing',
				'Add variable',
			]);
			expect(cells(needsAction.getByRole('row', { name: /Currency API/ }))[3]).toBe('No access');
			expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
				'3 issues to resolve',
			);
		});

		it('should list the dependencies that the user cannot access under "Outside your access", with a disabled action', async () => {
			const { findByTestId, getAllByRole, getAllByTestId, getByRole, queryByTestId } =
				await renderIssues({ missingDependencies: [unreachableCredential, unreachableWorkflow] });

			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*2$/);
			expect(headings(getAllByRole)).toEqual(['Outside your access (2)']);
			const outside = section(getAllByTestId, 'Outside your access (2)');
			expect(
				outside.getByText(
					'You do not have access to these dependencies. You can apply without them.',
				),
			).toBeVisible();
			expect(cells(outside.getByRole('row', { name: /Stripe/ }))).toEqual([
				'Stripe',
				'Invoice reconciliation',
				'Credential',
				'No access',
				'Add credential',
			]);
			expect(cells(outside.getByRole('row', { name: /Send audit log/ }))).toEqual([
				'Send audit logThis workflow is not on this instance. Workflows that use it fail until it exists here.',
				'Weekly KPI report',
				'Workflow',
				'No access',
				'Add workflow',
			]);
			// Nothing stops the Apply, but the tab still has rows.
			expect(queryByTestId('promotion-preview-blockers-status')).not.toBeInTheDocument();

			const action = within(outside.getByRole('row', { name: /Stripe/ })).getByTestId(
				'promotion-preview-blocker-disabled-action',
			);
			expect(action).toHaveAccessibleName(
				'Add credential. This credential is in a project that you do not have access to, so you cannot add it.',
			);
			expect(within(action).getByRole('button', { name: 'Add credential' })).toBeDisabled();
			// The disabled button takes no focus, so its wrapper opens the reason for keyboard users.
			expect(action).toHaveAttribute('tabindex', '0');
			action.focus();
			expect(await findByTestId('tooltip-content')).toHaveTextContent(
				'This credential is in a project that you do not have access to, so you cannot add it.',
			);
		});

		it('should list both groups, with the sub-workflows that the user can access under "Warnings"', async () => {
			const { getAllByRole, getAllByTestId, getByRole, getByTestId, getByText } =
				await renderIssues({
					missingBindings: [missingVariable],
					missingDependencies: [
						repeatedBinding(missingVariable),
						archivedWorkflow,
						{ ...archivedWorkflow, id: 'w10', name: 'Notify finance', reason: 'caller-policy' },
						{ ...archivedWorkflow, id: 'w11', name: 'Close month', reason: 'not-on-instance' },
						unreachableCredential,
						// The variable stops "Weekly KPI report" (w3). A dependency that does not stop the
						// Apply shows only for a selected workflow.
						{ ...unreachableWorkflow, consumers: archivedWorkflow.consumers },
					],
				});

			// The tab counts the two sections of issues. It does not count the warnings.
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*3$/);
			expect(headings(getAllByRole)).toEqual([
				'Needs your action (1)',
				'Outside your access (2)',
				'3 warnings',
			]);
			// Each row of "Needs your action" stops the Apply.
			const needsAction = section(getAllByTestId, 'Needs your action (1)');
			expect(needsAction.getByRole('row', { name: /API_URL/ })).toBeVisible();
			expect(needsAction.queryByRole('row', { name: /Archive invoices/ })).not.toBeInTheDocument();
			expect(getAllByTestId('promotion-preview-dependency-warning')).toHaveLength(3);
			expect(getByText('Some workflows are not usable on this instance')).toBeVisible();
			expect(getByTestId('promotion-preview-blockers')).toHaveTextContent(
				'Other workflows use them as a sub-workflow or as an error workflow. You can still apply the workflows that use them.',
			);
			expect(cells(getByRole('row', { name: /Archive invoices/ }))).toEqual([
				'Archive invoicesThis workflow is archived on this instance. Workflows that use it fail until it is unarchived.',
				'Invoice reconciliation',
				'Workflow',
			]);
			expect(cells(getByRole('row', { name: /Notify finance/ }))).toEqual([
				'Notify financeThis workflow does not accept calls from the workflows that use it. Change its caller policy to let them run.',
				'Invoice reconciliation',
				'Workflow',
			]);
			expect(cells(getByRole('row', { name: /Close month/ }))).toEqual([
				'Close monthThis workflow is not on this instance. Workflows that use it fail until it exists here.',
				'Invoice reconciliation',
				'Workflow',
			]);
			// Only the variable stops the Apply.
			expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
				/^1 issue to resolve$/,
			);
		});

		it('should say that a dependency is not on the branch, and that the user cannot add it here', async () => {
			const { findByTestId, getAllByRole, getAllByTestId, getByRole, getByTestId } =
				await renderIssues({
					missingDependencies: [notOnBranchCredential, notOnBranchWorkflow],
				});

			expect(headings(getAllByRole)).toEqual(['Outside your access (2)']);
			const outside = section(getAllByTestId, 'Outside your access (2)');
			const credentialRow = outside.getByRole('row', { name: /Legacy SMTP/ });
			expect(cells(credentialRow)).toEqual([
				'Legacy SMTP',
				'Invoice reconciliation',
				'Credential',
				'Not on the branch',
				'Add credential',
			]);
			const workflowRow = outside.getByRole('row', { name: /Sync ledger/ });
			expect(cells(workflowRow)).toEqual([
				'Sync ledgerThis workflow is not on this instance and not on the branch. Workflows that use it fail until it exists here.',
				'Weekly KPI report',
				'Workflow',
				'Not on the branch',
				'Add workflow',
			]);
			// The status is neutral, with the icon of a dependency that the operation leaves out.
			for (const row of [credentialRow, workflowRow]) {
				const status = within(row).getByText('Not on the branch');
				expect(status.className).toContain('neutral');
				expect(status.querySelector('n8n-icon-stub')).toHaveAttribute('icon', 'circle-minus');
				expect(row).not.toHaveTextContent('No access');
			}

			const addWorkflow = within(workflowRow).getByTestId(
				'promotion-preview-blocker-disabled-action',
			);
			expect(addWorkflow).toHaveAccessibleName(
				'Add workflow. The branch does not hold this workflow, so you cannot add it here.',
			);
			const addCredential = within(credentialRow).getByTestId(
				'promotion-preview-blocker-disabled-action',
			);
			expect(within(addCredential).getByRole('button', { name: 'Add credential' })).toBeDisabled();
			addCredential.focus();
			expect(await findByTestId('tooltip-content')).toHaveTextContent(
				'The branch does not hold this credential, so you cannot add it here.',
			);

			// "Weekly KPI report" (w3) uses the sub-workflow, which does not stop it.
			await userEvent.click(getByRole('tab', { name: /Changes/ }));
			expect(
				treeRow(getAllByTestId, 'workflow:w3').getByTestId('promotion-preview-tree-dependencies'),
			).toHaveAccessibleName('1 dependency is not on the branch.');
			// The credential does not stop "Invoice reconciliation" (w1). The user accepts both.
			const usesCredential = treeRow(getAllByTestId, 'workflow:w1');
			expect(usesCredential.getByRole('checkbox')).toBeChecked();
			expect(
				usesCredential.queryByTestId('promotion-preview-tree-blocker'),
			).not.toBeInTheDocument();
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Apply with 2 unresolved dependencies$/,
			);
		});

		it('should show no action for a workflow of this instance that the user cannot access', async () => {
			const { getAllByTestId } = await renderIssues({
				missingDependencies: [outsideArchivedWorkflow, outsideCallerPolicyWorkflow],
			});

			const outside = section(getAllByTestId, 'Outside your access (2)');
			expect(cells(outside.getByRole('row', { name: /Archive invoices/ }))).toEqual([
				'Archive invoicesThis workflow is archived on this instance. Someone with access must unarchive it.',
				'Invoice reconciliation',
				'Workflow',
				'No access',
				'',
			]);
			expect(cells(outside.getByRole('row', { name: /Notify finance/ }))).toEqual([
				'Notify financeThis workflow does not accept calls from the workflows that use it. Someone with access must change its caller policy.',
				'Invoice reconciliation',
				'Workflow',
				'No access',
				'',
			]);
			expect(
				outside.queryByTestId('promotion-preview-blocker-disabled-action'),
			).not.toBeInTheDocument();
			expect(outside.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument();
		});

		it('should tell users to create dependencies only when "Needs your action" has one to create', async () => {
			const description = 'Create these dependencies or use a placeholder before you apply.';
			const access = {
				...credential,
				code: 'access-required' as const,
				sourceId: 'c2',
				name: 'Currency API',
				consumers: consumers('w1'),
			};
			// No row of these two has an "Add" button. The credential stops "w1", so a selected
			// workflow uses the sub-workflow.
			const { getAllByTestId, unmount } = await renderIssues({
				accessRequirements: [access],
				missingDependencies: [
					{ ...repeatedBinding(access), reason: 'not-shared' },
					{ ...archivedWorkflow, consumers: unreachableWorkflow.consumers },
				],
			});
			const withoutCreate = section(getAllByTestId, 'Needs your action (1)');
			expect(withoutCreate.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument();
			expect(withoutCreate.queryByText(description)).not.toBeInTheDocument();
			unmount();

			const withCreate = await renderIssues({
				missingBindings: [missingVariable],
				missingDependencies: [repeatedBinding(missingVariable), archivedWorkflow],
			});
			const needsAction = section(withCreate.getAllByTestId, 'Needs your action (1)');
			expect(needsAction.getByRole('button', { name: 'Add variable' })).toBeVisible();
			expect(needsAction.getByText(description)).toBeVisible();
		});

		describe('with a condition on the selection', () => {
			const openTab = async (
				getByRole: (role: string, options: object) => HTMLElement,
				name: RegExp,
			) => await userEvent.click(getByRole('tab', { name }));

			it('should warn about a dependency only while the selection matches its condition, and mark its workflow', async () => {
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(check({ missingDependencies: [targetNotSelectedWorkflow] })),
				);
				const {
					getAllByRole,
					getAllByTestId,
					getByRole,
					getByTestId,
					queryAllByTestId,
					queryByTestId,
				} = await renderApply();
				const issuesTab = getByRole('tab', { name: /Issues/ });
				// "Invoice reconciliation" (w1) calls "Weekly KPI report" (w3), which the branch adds.
				const target = () => treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
				const caller = () => treeRow(getAllByTestId, 'workflow:w1');
				const marker = () => caller().queryByTestId('promotion-preview-tree-dependencies');

				// The selection includes the target, so the Apply adds it.
				expect(target()).toBeChecked();
				expect(issuesTab).toHaveTextContent(/^Issues$/);
				expect(marker()).not.toBeInTheDocument();
				expect(queryAllByTestId('promotion-preview-blocker-row')).toHaveLength(0);
				expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
					'No issues. You can apply the selected changes.',
				);

				await userEvent.click(target());

				// A warning does not count on the tab, and nothing is to resolve.
				expect(issuesTab).toHaveTextContent(/^Issues$/);
				expect(marker()).toHaveAccessibleName('1 dependency is not usable on this instance.');
				expect(caller().getByRole('checkbox')).toBeChecked();
				expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
					'No issues. You can apply the selected changes.',
				);
				await openTab(getByRole, /Issues/);
				expect(headings(getAllByRole)).toEqual(['1 warning']);
				expect(queryAllByTestId('promotion-preview-blocker-row')).toHaveLength(0);
				expect(cells(getByTestId('promotion-preview-dependency-warning'))).toEqual([
					'Weekly KPI reportThis workflow is not on this instance. Workflows that use it fail until it exists here.',
					'Invoice reconciliation',
					'Workflow',
				]);

				await openTab(getByRole, /Changes/);
				await userEvent.click(target());

				expect(issuesTab).toHaveTextContent(/^Issues$/);
				expect(marker()).not.toBeInTheDocument();
				expect(queryByTestId('promotion-preview-dependency-warning')).not.toBeInTheDocument();
				expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
					'No issues. You can apply the selected changes.',
				);
			});

			it('should count an unresolved dependency only while the selection matches its condition, and list the same entries in the confirmation', async () => {
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(
						check({ missingDependencies: [unreachableCredential, targetNotSelectedWorkflow] }),
					),
				);
				vi.mocked(api.continueApplyProjectSelection).mockResolvedValue({
					...applied,
					missingDependencies: [unreachableCredential],
				});
				const { getAllByTestId, getByRole, getByTestId, queryByTestId } = await renderApply();
				const issuesTab = getByRole('tab', { name: /Issues/ });
				const submit = getByTestId('promotion-preview-submit');
				const target = () => treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
				const caller = () => treeRow(getAllByTestId, 'workflow:w1');
				const listed = () =>
					getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim());

				// The selection includes "Weekly KPI report" (w3), so only the credential stays unresolved.
				expect(target()).toBeChecked();
				expect(issuesTab).toHaveTextContent(/^Issues\s*1$/);
				expect(caller().getByTestId('promotion-preview-tree-dependencies')).toHaveAccessibleName(
					'This workflow uses 1 dependency that is outside your access. You can apply it without it.',
				);
				expect(submit).toHaveTextContent(/^Apply with 1 unresolved dependency$/);

				await userEvent.click(target());

				// No entry stops "Invoice reconciliation" (w1), with or without the target.
				expect(caller().getByRole('checkbox')).toBeChecked();
				expect(caller().queryByTestId('promotion-preview-tree-blocker')).not.toBeInTheDocument();
				// The workflow is a warning, so the tab does not count it. The user accepts it too.
				expect(issuesTab).toHaveTextContent(/^Issues\s*1$/);
				expect(caller().getByTestId('promotion-preview-tree-dependencies')).toHaveAccessibleName(
					'2 dependencies are not usable on this instance.',
				);
				expect(submit).toHaveTextContent(/^Apply with 2 unresolved dependencies$/);
				await userEvent.click(submit);
				expect(
					getByRole('heading', { name: 'Apply with 2 unresolved dependencies?' }),
				).toBeVisible();
				expect(listed()).toEqual([
					'StripeCredential · Used by Invoice reconciliation',
					'Weekly KPI reportWorkflow · Used by Invoice reconciliation',
				]);
				await userEvent.click(getByTestId('apply-unresolved-cancel'));
				expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
				expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();

				await userEvent.click(target());

				expect(issuesTab).toHaveTextContent(/^Issues\s*1$/);
				expect(submit).toHaveTextContent(/^Apply with 1 unresolved dependency$/);
				await userEvent.click(submit);
				expect(getByRole('heading', { name: 'Apply with 1 unresolved dependency?' })).toBeVisible();
				expect(listed()).toEqual(['StripeCredential · Used by Invoice reconciliation']);
				expect(getByTestId('apply-unresolved-confirm')).toHaveTextContent(
					/^Apply with 1 unresolved dependency$/,
				);

				await userEvent.click(getByTestId('apply-unresolved-confirm'));
				await waitAllPromises();

				expect(api.continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
					workflowIds: ['w1', 'w2', 'w3', 'w4'],
					folderIds: [],
					expectedSource,
					expectedPreviewRevision: REVISION,
					confirmMissingDependencies: true,
				});
			});

			it('should stop a workflow for an entry that stops the Apply only while the selection matches its condition', async () => {
				// The entry holds while the selection includes "Weekly KPI report" (w3).
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(
						check({ missingDependencies: [{ ...targetSelectedWorkflow, blocking: true }] }),
					),
				);
				const { getAllByTestId, getByTestId, queryByTestId } = await renderApply();
				const target = () => treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
				const caller = () => treeRow(getAllByTestId, 'workflow:w1');

				expect(target()).toBeChecked();
				expect(caller().getByTestId('promotion-preview-tree-blocker')).toBeVisible();
				expect(getByTestId('promotion-preview-submit')).toBeDisabled();

				await userEvent.click(target());

				expect(caller().queryByTestId('promotion-preview-tree-blocker')).not.toBeInTheDocument();
				expect(queryByTestId('promotion-preview-submit-blocked')).not.toBeInTheDocument();
				expect(getByTestId('promotion-preview-submit')).toBeEnabled();
			});

			it('should ask for no confirmation while the selection matches no condition of the entries', async () => {
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(check({ missingDependencies: [targetNotSelectedWorkflow] })),
				);
				vi.mocked(api.applyProjectSelection).mockResolvedValue(applied);
				const { getAllByTestId, getByTestId, queryByTestId } = await renderApply();
				const submit = getByTestId('promotion-preview-submit');

				// The selection includes "Weekly KPI report" (w3), so the Apply adds it.
				expect(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox')).toBeChecked();
				expect(submit).toHaveTextContent(/^Apply \d+ changes?$/);

				await userEvent.click(submit);
				await waitAllPromises();

				// The generic question of an Apply, and the request of an Apply without a list.
				expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
				expect(confirm).toHaveBeenCalledTimes(1);
				expect(api.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
					workflowIds: ['w1', 'w2', 'w3', 'w4'],
					folderIds: [],
					expectedSource,
					expectedPreviewRevision: REVISION,
				});
				expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();
			});

			it.each([
				{
					reason: 'archived',
					detail:
						'This Apply archives this workflow. Workflows that use it fail until it is unarchived.',
				},
				{
					reason: 'not-on-instance',
					detail:
						'This Apply deletes this workflow. Workflows that use it fail until it exists here again.',
				},
			] as const)(
				'should say what the Apply does to a selected workflow with the reason $reason',
				async ({ reason, detail }) => {
					vi.mocked(api.getPromotionPreview).mockResolvedValue(
						previewWithCheck(
							check({ missingDependencies: [{ ...targetSelectedWorkflow, reason }] }),
						),
					);
					const { getAllByTestId, getByRole } = await renderApply();

					// The selection includes the target, so the entry holds.
					await openTab(getByRole, /Issues/);

					expect(getAllByTestId('promotion-preview-dependency-warning').map(cells)).toEqual([
						[`Weekly KPI report${detail}`, 'Invoice reconciliation', 'Workflow'],
					]);
				},
			);

			it('should show one row at a time for two entries of one workflow with opposite conditions', async () => {
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(
						check({ missingDependencies: [targetNotSelectedWorkflow, targetSelectedWorkflow] }),
					),
				);
				const { getAllByTestId, getByRole } = await renderApply();
				const issuesTab = getByRole('tab', { name: /Issues/ });
				const target = () => treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
				const marker = () =>
					treeRow(getAllByTestId, 'workflow:w1').getByTestId('promotion-preview-tree-dependencies');
				const rows = async () => {
					await openTab(getByRole, /Issues/);
					const shown = getAllByTestId('promotion-preview-dependency-warning').map(cells);
					await openTab(getByRole, /Changes/);
					return shown;
				};

				// The selection includes the target: the caller policy of the branch applies.
				expect(issuesTab).toHaveTextContent(/^Issues$/);
				expect(marker()).toHaveAccessibleName('1 dependency is not usable on this instance.');
				expect(await rows()).toEqual([
					[
						'Weekly KPI reportThis workflow does not accept calls from the workflows that use it. Change its caller policy to let them run.',
						'Invoice reconciliation',
						'Workflow',
					],
				]);

				await userEvent.click(target());

				// The selection leaves out the target: this instance does not have the workflow.
				expect(issuesTab).toHaveTextContent(/^Issues$/);
				expect(marker()).toHaveAccessibleName('1 dependency is not usable on this instance.');
				expect(await rows()).toEqual([
					[
						'Weekly KPI reportThis workflow is not on this instance. Workflows that use it fail until it exists here.',
						'Invoice reconciliation',
						'Workflow',
					],
				]);
			});
		});

		it('should show no project and no owner of a dependency', async () => {
			const { getAllByTestId, getByTestId } = await renderIssues({
				missingDependencies: [unreachableCredential, unreachableWorkflow, archivedWorkflow],
			});

			// "Billing" is the project of the workflows. An Apply check sends no project for a
			// dependency.
			expect(getByTestId('promotion-preview-blockers')).not.toHaveTextContent('Billing');
			const rows = [
				...getAllByTestId('promotion-preview-blocker-row'),
				...getAllByTestId('promotion-preview-dependency-warning'),
			];
			expect(rows).toHaveLength(3);
			for (const row of rows) {
				expect(row).not.toHaveTextContent(/project|owner/i);
			}
		});

		it('should keep only the dependencies of the workflows that the preview lists', async () => {
			const { getAllByTestId, getByRole, queryByText } = await renderIssues({
				missingDependencies: [
					// The preview does not list "w99".
					{ ...unreachableWorkflow, consumers: consumers('w3', 'w99') },
					{ ...archivedWorkflow, consumers: consumers('w99') },
				],
			});

			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*1$/);
			expect(queryByText('Archive invoices')).not.toBeInTheDocument();
			expect(
				cells(
					section(getAllByTestId, 'Outside your access (1)').getByRole('row', {
						name: /Send audit log/,
					}),
				)[1],
			).toBe('w3');
		});

		it('should list a dependency that does not stop the Apply only for the selected workflows that use it', async () => {
			// "Weekly KPI report" (w3) uses the two sub-workflows, and "Format currency" (w4) uses one
			// of them. "Invoice reconciliation" (w1) uses the credential, which stops it.
			const { getAllByTestId, getByRole, getByTestId, queryByRole } = await renderIssues({
				missingDependencies: [
					unsharedCredential,
					unreachableWorkflow,
					{ ...archivedWorkflow, consumers: consumers('w3', 'w4') },
				],
			});
			const issuesTab = getByRole('tab', { name: /Issues/ });
			const submit = getByTestId('promotion-preview-submit');
			const usedBy = (name: RegExp) => cells(getByRole('row', { name }))[1];
			const toggle = async (key: string) => {
				await userEvent.click(getByRole('tab', { name: /Changes/ }));
				await userEvent.click(treeRow(getAllByTestId, key).getByRole('checkbox'));
				await userEvent.click(issuesTab);
			};

			// The tab counts the credential and "Send audit log". "Archive invoices" is a warning.
			expect(issuesTab).toHaveTextContent(/^Issues\s*2$/);
			expect(getAllByTestId('promotion-preview-blocker-row')).toHaveLength(2);
			expect(usedBy(/Archive invoices/)).toBe('w3w4');
			expect(submit).toHaveTextContent(/^Apply with 2 unresolved dependencies$/);

			await toggle('workflow:w3');

			// No selected workflow uses "Send audit log" now. "Format currency" uses the other one.
			expect(issuesTab).toHaveTextContent(/^Issues\s*1$/);
			expect(queryByRole('row', { name: /Send audit log/ })).not.toBeInTheDocument();
			expect(usedBy(/Archive invoices/)).toBe('w4');
			expect(submit).toHaveTextContent(/^Apply with 1 unresolved dependency$/);
			// The user cannot select the workflow that the credential stops, so its row stays.
			expect(usedBy(/Stripe/)).toBe('Invoice reconciliation');

			await toggle('workflow:w4');

			expect(issuesTab).toHaveTextContent(/^Issues\s*1$/);
			expect(getAllByTestId('promotion-preview-blocker-row')).toHaveLength(1);
			expect(queryByRole('row', { name: /Archive invoices/ })).not.toBeInTheDocument();
			expect(submit).not.toHaveTextContent('unresolved');

			await toggle('workflow:w3');

			expect(issuesTab).toHaveTextContent(/^Issues\s*2$/);
			expect(usedBy(/Send audit log/)).toBe('Weekly KPI report');
			expect(usedBy(/Archive invoices/)).toBe('w3');
			expect(submit).toHaveTextContent(/^Apply with 2 unresolved dependencies$/);
		});

		it('should name the unresolved dependencies of the selected workflows on the Apply button', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(
					check({
						missingDependencies: [unreachableCredential, unreachableWorkflow, archivedWorkflow],
					}),
				),
			);
			const { getAllByTestId, getByTestId, queryAllByTestId } = await renderApply();
			const submit = getByTestId('promotion-preview-submit');

			// No dependency stops a workflow.
			expect(queryAllByTestId('promotion-preview-tree-blocker')).toHaveLength(0);
			expect(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox')).toBeChecked();
			expect(submit).toHaveTextContent(/^Apply with 3 unresolved dependencies$/);
			expect(submit).toBeEnabled();

			// Only "Weekly KPI report" (w3) uses "Send audit log".
			await userEvent.click(treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox'));
			expect(submit).toHaveTextContent(/^Apply with 2 unresolved dependencies$/);

			await userEvent.click(treeRow(getAllByTestId, 'workflow:w1').getByRole('checkbox'));
			expect(submit).toHaveTextContent(/^Apply \d+ changes?$/);
		});

		it('should ask the user to accept the unresolved dependencies in place of the generic question, then continue the Apply', async () => {
			const missingDependencies = [unreachableCredential, unreachableWorkflow];
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(check({ missingDependencies })),
			);
			vi.mocked(api.continueApplyProjectSelection).mockResolvedValue({
				...applied,
				missingDependencies,
			});

			const { getAllByTestId, getByRole, getByTestId, queryByTestId } = await renderApply();
			await userEvent.click(getByTestId('promotion-preview-submit'));

			const dialog = getByTestId('apply-unresolved-dialog');
			expect(getByRole('heading', { name: 'Apply with 2 unresolved dependencies?' })).toBeVisible();
			expect(dialog).toHaveTextContent(
				'These dependencies stay missing on this instance. Apply does not create them. Workflows that use them cannot be published until the dependencies exist here.',
			);
			expect(
				getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
			).toEqual([
				'StripeCredential · Used by Invoice reconciliation',
				'Send audit logWorkflow · Used by Weekly KPI report',
			]);
			// "Billing" is the project of the workflows. The API sends no project for a dependency.
			expect(dialog).not.toHaveTextContent('Billing');
			expect(dialog).not.toHaveTextContent(/project|owner/i);
			expect(getByTestId('apply-unresolved-confirm')).toHaveTextContent(
				/^Apply with 2 unresolved dependencies$/,
			);
			expect(confirm).not.toHaveBeenCalled();
			expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();

			await userEvent.click(getByTestId('apply-unresolved-confirm'));
			await waitAllPromises();

			expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
			expect(confirm).not.toHaveBeenCalled();
			expect(api.applyProjectSelection).not.toHaveBeenCalled();
			expect(api.continueApplyProjectSelection).toHaveBeenCalledTimes(1);
			expect(api.continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				expectedSource,
				expectedPreviewRevision: REVISION,
				confirmMissingDependencies: true,
			});
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Changes applied',
					message: expect.stringMatching(/ 2 dependencies are still missing\.$/),
				}),
			);
			expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
		});

		it.each([
			[
				'the Cancel button',
				async () => await userEvent.click(screen.getByTestId('apply-unresolved-cancel')),
			],
			['the Escape key', async () => await userEvent.keyboard('{Escape}')],
		])('should apply nothing when the user closes the question with %s', async (_name, close) => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(check({ missingDependencies: [unreachableWorkflow] })),
			);
			const { getByTestId, queryByTestId } = await renderApply();
			await userEvent.click(getByTestId('promotion-preview-submit'));
			expect(getByTestId('apply-unresolved-dialog')).toBeVisible();

			await close();

			await waitFor(() => expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument());
			expect(confirm).not.toHaveBeenCalled();
			expect(api.applyProjectSelection).not.toHaveBeenCalled();
			expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();
			expect(getByTestId('promotion-preview-submit')).toBeEnabled();
		});

		it('should ask both questions when the Apply also removes data table values', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(
					check({
						conflicts: [{ ...destructiveChange, id: 't1', consumers: consumers('w1', 'w2') }],
						missingDependencies: [unreachableWorkflow],
					}),
				),
			);
			vi.mocked(api.continueApplyProjectSelection).mockResolvedValue(applied);

			const { getByTestId } = await renderApply();
			await userEvent.click(getByTestId('promotion-preview-submit'));

			// The question about the dependencies comes first.
			expect(getByTestId('apply-unresolved-dialog')).toBeVisible();
			expect(confirm).not.toHaveBeenCalled();

			await userEvent.click(getByTestId('apply-unresolved-confirm'));
			await waitAllPromises();

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining("can't be restored"),
				'Apply data table changes?',
				expect.anything(),
			);
			expect(api.continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				expectedSource,
				expectedPreviewRevision: REVISION,
				confirmDestructiveChanges: true,
				confirmMissingDependencies: true,
			});
		});

		it('should apply nothing when the user accepts the dependencies and refuses the data table changes', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(
					check({
						conflicts: [{ ...destructiveChange, id: 't1', consumers: consumers('w1', 'w2') }],
						missingDependencies: [unreachableWorkflow],
					}),
				),
			);
			confirm.mockResolvedValue('cancel');

			const { getByTestId } = await renderApply();
			await userEvent.click(getByTestId('promotion-preview-submit'));
			await userEvent.click(getByTestId('apply-unresolved-confirm'));
			await waitAllPromises();

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(api.applyProjectSelection).not.toHaveBeenCalled();
			expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();
		});

		it('should keep a workflow blocked for a dependency that stops it, and not ask the user to accept that dependency', async () => {
			// "Weekly KPI report" (w3) needs a variable. "Invoice reconciliation" (w1) uses a credential
			// that the user cannot access.
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(
					check({
						missingBindings: [missingVariable],
						missingDependencies: [repeatedBinding(missingVariable), unreachableCredential],
					}),
				),
			);
			vi.mocked(api.continueApplyProjectSelection).mockResolvedValue(applied);

			const { getAllByTestId, getByTestId } = await renderApply();
			const blockedWorkflow = treeRow(getAllByTestId, 'workflow:w3').getByRole('checkbox');
			expect(blockedWorkflow).not.toBeChecked();
			expect(blockedWorkflow).toBeDisabled();
			// The button counts only what the user can accept.
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Apply with 1 unresolved dependency$/,
			);

			await userEvent.click(getByTestId('promotion-preview-submit'));
			expect(
				getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
			).toEqual(['StripeCredential · Used by Invoice reconciliation']);

			await userEvent.click(getByTestId('apply-unresolved-confirm'));
			expect(api.continueApplyProjectSelection).toHaveBeenCalledWith(
				expect.anything(),
				'p1',
				expect.objectContaining({ workflowIds: ['w1', 'w2', 'w4'] }),
			);
		});

		it('should keep Apply disabled, with the label of today, while every selected change has a dependency that stops it', async () => {
			const stopsAll = { ...missingVariable, consumers: consumers('w1', 'w2', 'w3', 'w4') };
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(
					check({
						missingBindings: [stopsAll],
						missingDependencies: [repeatedBinding(stopsAll)],
					}),
				),
			);

			const { getByTestId, queryByTestId } = await renderApply();

			expect(getByTestId('promotion-preview-submit')).toBeDisabled();
			expect(getByTestId('promotion-preview-submit')).not.toHaveTextContent('unresolved');
			expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
		});

		describe('with a credential that the project cannot use', () => {
			const stopsWorkflow =
				'1 dependency is outside your access and stops this workflow. Someone with access must resolve it.';

			it.each(['not-shared', 'incompatible-usage-scope'] as const)(
				'should stop the workflows that use the credential, and apply the other changes, for the reason %s',
				async (reason) => {
					// "Invoice reconciliation" (w1) uses the credential. The user cannot share it.
					vi.mocked(api.getPromotionPreview).mockResolvedValue(
						previewWithCheck(check({ missingDependencies: [{ ...unsharedCredential, reason }] })),
					);
					vi.mocked(api.applyProjectSelection).mockResolvedValue(applied);

					const { getAllByTestId, getByRole, getByTestId, queryByTestId } = await renderApply();
					const stopped = treeRow(getAllByTestId, 'workflow:w1');
					expect(stopped.getByRole('checkbox')).not.toBeChecked();
					expect(stopped.getByRole('checkbox')).toBeDisabled();
					expect(stopped.getByTestId('promotion-preview-tree-blocker')).toHaveAccessibleName(
						stopsWorkflow,
					);
					expect(
						stopped.queryByTestId('promotion-preview-tree-dependencies'),
					).not.toBeInTheDocument();
					expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*1$/);
					// The user cannot accept this dependency, so the button does not name it.
					const submit = getByTestId('promotion-preview-submit');
					expect(submit).toHaveTextContent(/^Apply \d+ changes$/);
					expect(submit).toBeEnabled();

					await userEvent.click(submit);
					await waitAllPromises();

					expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
					expect(api.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
						workflowIds: ['w2', 'w3', 'w4'],
						folderIds: [],
						expectedSource,
						expectedPreviewRevision: REVISION,
					});
					expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();
				},
			);

			it('should show the credential with a message and no action, and count it as an issue to resolve', async () => {
				const { getAllByRole, getAllByTestId, getByTestId } = await renderIssues({
					missingDependencies: [unsharedCredential],
				});

				expect(headings(getAllByRole)).toEqual(['Outside your access (1)']);
				const outside = section(getAllByTestId, 'Outside your access (1)');
				expect(
					outside.getByText(
						'You do not have access to these dependencies. A credential that this project cannot use stops the workflows that use it. You can apply without the other dependencies.',
					),
				).toBeVisible();
				expect(cells(outside.getByRole('row', { name: /Stripe/ }))).toEqual([
					'StripeThis credential exists on this instance, but this project cannot use it. Someone with access must share it with this project.',
					'Invoice reconciliation',
					'Credential',
					'No access',
					'',
				]);
				// The credential exists, so the user has nothing to add.
				expect(
					outside.queryByTestId('promotion-preview-blocker-disabled-action'),
				).not.toBeInTheDocument();
				expect(outside.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument();
				expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
					'1 issue to resolve',
				);
			});

			it('should keep Apply disabled while the credential stops every selected change', async () => {
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(
						check({
							missingDependencies: [
								{ ...unsharedCredential, consumers: consumers('w1', 'w2', 'w3', 'w4') },
							],
						}),
					),
				);

				const { getAllByTestId, getByTestId, queryByTestId } = await renderApply();

				expect(getAllByTestId('promotion-preview-tree-checkbox')).not.toHaveLength(0);
				for (const key of ['workflow:w1', 'workflow:w2', 'workflow:w3', 'workflow:w4']) {
					expect(treeRow(getAllByTestId, key).getByRole('checkbox')).toBeDisabled();
				}
				expect(getByTestId('promotion-preview-submit')).toBeDisabled();
				expect(getByTestId('promotion-preview-submit')).not.toHaveTextContent('unresolved');
				expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
			});

			it('should stop only for the credential, and ask the user to accept the dependencies that do not stop the Apply', async () => {
				const missingDependencies = [
					// "Invoice reconciliation" (w1) uses these two credentials. Only the first stops it.
					unsharedCredential,
					notOnBranchCredential,
					// "Weekly KPI report" (w3) calls this sub-workflow, which does not stop it.
					unreachableWorkflow,
				];
				vi.mocked(api.getPromotionPreview).mockResolvedValue(
					previewWithCheck(check({ missingDependencies })),
				);
				vi.mocked(api.continueApplyProjectSelection).mockResolvedValue({
					...applied,
					missingDependencies: [unreachableWorkflow],
				});

				const { getAllByRole, getAllByTestId, getByRole, getByTestId } = await renderApply();
				const stopped = treeRow(getAllByTestId, 'workflow:w1');
				expect(stopped.getByRole('checkbox')).toBeDisabled();
				expect(stopped.getByTestId('promotion-preview-tree-blocker')).toHaveAccessibleName(
					stopsWorkflow,
				);
				const accepted = treeRow(getAllByTestId, 'workflow:w3');
				expect(accepted.getByRole('checkbox')).toBeChecked();
				expect(accepted.getByRole('checkbox')).toBeEnabled();
				expect(accepted.getByTestId('promotion-preview-tree-dependencies')).toHaveAccessibleName(
					'This workflow uses 1 dependency that is outside your access. You can apply it without it.',
				);
				expect(accepted.queryByTestId('promotion-preview-tree-blocker')).not.toBeInTheDocument();
				// The selection leaves out the stopped workflow, and so its other credential. The tab
				// and the button count the same dependencies that the Apply continues without.
				expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*2$/);
				const submit = getByTestId('promotion-preview-submit');
				expect(submit).toHaveTextContent(/^Apply with 1 unresolved dependency$/);

				await userEvent.click(getByRole('tab', { name: /Issues/ }));
				expect(headings(getAllByRole)).toEqual(['Outside your access (2)']);
				const outside = section(getAllByTestId, 'Outside your access (2)');
				expect(outside.queryByRole('row', { name: /Legacy SMTP/ })).not.toBeInTheDocument();
				expect(cells(outside.getByRole('row', { name: /Send audit log/ }))[4]).toBe('Add workflow');
				expect(cells(outside.getByRole('row', { name: /Stripe/ }))[4]).toBe('');
				expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
					'1 issue to resolve',
				);

				await userEvent.click(submit);
				expect(
					getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
				).toEqual(['Send audit logWorkflow · Used by Weekly KPI report']);
				await userEvent.click(getByTestId('apply-unresolved-confirm'));
				await waitAllPromises();

				expect(api.continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
					workflowIds: ['w2', 'w3', 'w4'],
					folderIds: [],
					expectedSource,
					expectedPreviewRevision: REVISION,
					confirmMissingDependencies: true,
				});
			});
		});

		it.each([
			{
				status: 'blocked' as const,
				notice: "Apply found new issues, so it didn't change anything.",
			},
			{
				status: 'preview-changed' as const,
				notice: "This instance changed after the page loaded, so Apply didn't change anything.",
			},
		])(
			'should apply nothing and reload the preview when the confirmed Apply answers $status',
			async ({ status, notice }) => {
				// After the confirmation, "Weekly KPI report" (w3) also needs a variable.
				const newCheck = {
					missingBindings: [missingVariable],
					missingDependencies: [repeatedBinding(missingVariable), unreachableWorkflow],
				};
				vi.mocked(api.getPromotionPreview)
					.mockResolvedValueOnce(
						previewWithCheck(check({ missingDependencies: [unreachableWorkflow] })),
					)
					.mockResolvedValue(previewWithCheck(check(newCheck)));
				const { environmentId, git } = check();
				vi.mocked(api.continueApplyProjectSelection).mockResolvedValue(
					status === 'blocked'
						? { ...blocked(newCheck), environmentId, git }
						: { environmentId, git, status },
				);

				const { getByTestId } = await renderApply();
				await userEvent.click(getByTestId('promotion-preview-submit'));
				await userEvent.click(getByTestId('apply-unresolved-confirm'));
				await waitAllPromises();

				expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(notice);
				expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
				expect(showMessage).not.toHaveBeenCalled();
				expect(router.currentRoute.value.name).not.toBe(VIEWS.PROJECTS_WORKFLOWS);
			},
		);

		it('should list a reference that was broken on the source instance as a warning, and ask for no confirmation of it', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(
					check({
						warnings: [
							{
								kind: 'variable',
								code: 'variable-shadowed',
								name: 'API_URL',
								scope: { kind: 'global' },
								consumers: consumers('w3'),
							},
							{ ...deletedWorkflowWarning, consumers: consumers('w1') },
						],
					}),
				),
			);
			vi.mocked(api.applyProjectSelection).mockResolvedValue(applied);

			const { getByRole, getByTestId, queryAllByTestId, queryByTestId } = await renderApply();
			// A warning does not count, on the tab or on the button.
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues$/);
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Apply \d+ changes$/);

			await userEvent.click(getByRole('tab', { name: /Issues/ }));
			expect(getByRole('heading', { level: 2, name: '2 warnings' })).toBeVisible();
			expect(queryAllByTestId('promotion-preview-blocker-row')).toHaveLength(0);
			expect(getByTestId('promotion-preview-blockers')).toHaveTextContent(
				'Some dependencies did not exist on the source instance',
			);
			expect(cells(getByTestId('promotion-preview-dependency-warning'))).toEqual([
				'Archive invoicesThis workflow did not exist on the source instance. Workflows that use it fail until it exists here.',
				'w1',
				'Workflow',
			]);

			await userEvent.click(getByTestId('promotion-preview-submit'));
			await waitAllPromises();

			expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
			expect(confirm).toHaveBeenCalledWith(
				expect.anything(),
				'Apply the selected changes?',
				expect.anything(),
			);
			expect(api.applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'p1', {
				workflowIds: ['w1', 'w2', 'w3', 'w4'],
				folderIds: [],
				expectedSource,
				expectedPreviewRevision: REVISION,
			});
			expect(api.continueApplyProjectSelection).not.toHaveBeenCalled();
		});

		it('should not stop a workflow for a dependency that it cannot use, and mark the workflow', async () => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(
				previewWithCheck(check({ missingDependencies: [archivedWorkflow, unreachableWorkflow] })),
			);

			const { getAllByTestId, getByRole, queryAllByTestId, queryByTestId } = await renderApply();

			expect(queryAllByTestId('promotion-preview-tree-blocker')).toHaveLength(0);
			expect(queryByTestId('promotion-preview-submit-blocked')).not.toBeInTheDocument();
			const needsAction = treeRow(getAllByTestId, 'workflow:w1');
			expect(needsAction.getByTestId('promotion-preview-tree-dependencies')).toHaveAccessibleName(
				'1 dependency is not usable on this instance.',
			);
			const outside = treeRow(getAllByTestId, 'workflow:w3');
			expect(outside.getByTestId('promotion-preview-tree-dependencies')).toHaveAccessibleName(
				'This workflow uses 1 dependency that is outside your access. You can apply it without it.',
			);
			for (const row of [needsAction, outside]) {
				expect(row.getByRole('checkbox')).toBeChecked();
				expect(row.getByRole('checkbox')).toBeEnabled();
			}

			await userEvent.click(outside.getByTestId('promotion-preview-tree-dependencies'));
			expect(getByRole('tab', { name: /Issues/ })).toHaveAttribute('aria-selected', 'true');
		});

		it('should open the Issues tab after an Apply that found dependencies that the user did not accept', async () => {
			const missingDependencies = [unreachableCredential];
			vi.mocked(api.getPromotionPreview)
				.mockResolvedValueOnce(previewWithCheck())
				.mockResolvedValue(previewWithCheck(check({ missingDependencies })));
			vi.mocked(api.applyProjectSelection).mockResolvedValue(
				blocked({ missingBindings: [], missingDependencies }),
			);

			const { getAllByTestId, getByRole, getByTestId, queryByTestId } = await renderApply();
			await userEvent.click(getByTestId('promotion-preview-submit'));
			await waitAllPromises();

			expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
				"Apply found new issues, so it didn't change anything.",
			);
			expect(showMessage).not.toHaveBeenCalled();
			expect(getByRole('tab', { name: /Issues/ })).toHaveAttribute('aria-selected', 'true');
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*1$/);
			expect(section(getAllByTestId, 'Outside your access (1)').getByText('Stripe')).toBeVisible();
			// The user can accept the dependency and apply again.
			expect(queryByTestId('promotion-preview-blockers-status')).not.toBeInTheDocument();
			expect(getByTestId('promotion-preview-submit')).toBeEnabled();
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Apply with 1 unresolved dependency$/,
			);
		});
	});

	it.each([
		['Promote', 'promote', billingPreview({ missingDependencies: [outsideAccessWorkflow] })],
		['Apply', 'apply', previewWithCheck(check({ missingDependencies: [unreachableWorkflow] }))],
	] as const)(
		'should open the card of a workflow from its name in the Issues tab of %s',
		async (_page, direction, preview) => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(preview);
			const { getByRole, getByTestId } = await render(
				`/projects/p1/promotions/${direction}`,
				direction,
			);
			await userEvent.click(getByRole('tab', { name: /Issues/ }));

			const usedBy = within(getByTestId('promotion-preview-blocker-row')).getByRole('button', {
				name: 'Weekly KPI report',
			});
			expect(usedBy).toHaveAttribute('data-test-id', 'promotion-preview-workflow-link');
			await userEvent.click(usedBy);
			await waitAllPromises();

			expect(getByRole('tab', { name: /Changes/ })).toHaveAttribute('aria-selected', 'true');
			expect(router.currentRoute.value.query.resource).toBe('workflow:w3');
		},
	);

	describe('whole-instance Apply', () => {
		// The branch no longer holds the "Sales" project, so Apply deletes it and its workflow.
		// Apply applies the whole package, so the server marks nothing as selectable.
		const instancePreview = (fields: Partial<ApplyCheckResult> = {}) => {
			const preview = previewWithCheck(check(fields));
			return {
				...preview,
				commitSha: COMMIT_SHA,
				resources: [
					...preview.resources,
					resource({ key: 'project:team-b', name: 'Sales', change: 'deleted' }),
					resource({
						key: 'workflow:w20',
						name: 'Lead routing',
						parentKey: 'project:team-b',
						change: 'deleted',
					}),
				].map((entry) => ({ ...entry, selectable: false })),
			};
		};

		async function renderInstance() {
			vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([
				mock<settingsApi.PromotionEnvironmentSummary>({
					id: sourceEnvironmentId,
					direction: 'apply',
					scope: 'instance',
				}),
			]);
			await router.push('/promotions/apply');
			const result = renderComponent({
				pinia: createTestingPinia(),
				props: { direction: 'apply' },
			});
			await waitAllPromises();
			return result;
		}

		it('should stop for a blocker on a workflow that the Apply does not change', async () => {
			const missing = { ...variable, name: 'API_URL', consumers: consumers('w-unchanged') };
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({ missingBindings: [missing] }),
			);

			const { getByTestId } = await renderInstance();

			expect(getByTestId('promotion-preview-submit')).toBeDisabled();
			expect(getByTestId('promotion-preview-submit-blocked')).toHaveTextContent(
				'Resolve the issues that need your action, then apply.',
			);
		});

		it('should stop for a credential that a project cannot use, and not ask the user to accept it', async () => {
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({
					missingDependencies: [{ ...unsharedCredential, consumers: consumers('w-unchanged') }],
				}),
			);

			const { getAllByTestId, getByRole, getByTestId, queryByTestId } = await renderInstance();

			const submit = getByTestId('promotion-preview-submit');
			expect(submit).toBeDisabled();
			expect(submit).not.toHaveTextContent('unresolved');
			expect(getByTestId('promotion-preview-submit-blocked')).toHaveTextContent(
				'Resolve the issues that need your action, then apply.',
			);
			expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*1$/);

			await userEvent.click(getByRole('tab', { name: /Issues/ }));
			expect(
				cells(
					section(getAllByTestId, 'Outside your access (1)').getByRole('row', { name: /Stripe/ }),
				),
			).toEqual([
				'StripeThis credential exists on this instance, but this project cannot use it. Someone with access must share it with this project.',
				'w-unchanged',
				'Credential',
				'No access',
				'',
			]);
			expect(getByTestId('promotion-preview-blockers-status')).toHaveTextContent(
				'1 issue to resolve',
			);
		});

		it('should show the plain label on the disabled Apply button, without the unresolved dependencies', async () => {
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({
					missingBindings: [{ ...variable, name: 'API_URL', consumers: consumers('w-unchanged') }],
					missingDependencies: [{ ...unreachableCredential, consumers: consumers('w-unchanged') }],
				}),
			);

			const { getByRole, getByTestId, queryByTestId } = await renderInstance();

			const submit = getByTestId('promotion-preview-submit');
			expect(submit).toBeDisabled();
			expect(submit).toHaveTextContent(/^Apply \d+ changes$/);
			expect(getByTestId('promotion-preview-submit-blocked')).toHaveTextContent(
				'Apply is disabled. Resolve the issues that need your action, then apply.',
			);
			// The Issues tab still counts the dependency that the user can accept later.
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*2$/);
			expect(queryByTestId('apply-unresolved-dialog')).not.toBeInTheDocument();
		});

		it('should list a dependency that does not stop the Apply, on a workflow that the Apply does not change', async () => {
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({
					missingDependencies: [{ ...archivedWorkflow, consumers: consumers('w-unchanged') }],
				}),
			);

			const { getAllByTestId, getByRole } = await renderInstance();

			// The Apply has no selection, so the tab lists the dependency for every workflow. The
			// dependency is a warning, so the tab does not count it.
			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues$/);
			await userEvent.click(getByRole('tab', { name: /Issues/ }));
			expect(getAllByTestId('promotion-preview-dependency-warning')).toHaveLength(1);
		});

		it('should ask the user to accept a dependency of a workflow that the Apply does not change, then continue the Apply', async () => {
			const missingDependencies = [
				{ ...unreachableCredential, consumers: consumers('w-unchanged') },
			];
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({ missingDependencies }),
			);
			vi.mocked(settingsApi.continueApplyPromotion).mockResolvedValue({
				...applied,
				missingDependencies,
			});

			const { getAllByTestId, getByRole, getByTestId, queryByTestId } = await renderInstance();

			expect(getByRole('tab', { name: /Issues/ })).toHaveTextContent(/^Issues\s*1$/);
			const submit = getByTestId('promotion-preview-submit');
			expect(submit).toBeEnabled();
			expect(submit).toHaveTextContent(/^Apply with 1 unresolved dependency$/);
			expect(queryByTestId('promotion-preview-submit-blocked')).not.toBeInTheDocument();

			await userEvent.click(submit);
			expect(getByRole('heading', { name: 'Apply with 1 unresolved dependency?' })).toBeVisible();
			expect(
				getAllByTestId('promotion-missing-dependency').map((row) => row.textContent?.trim()),
			).toEqual(['StripeCredential · Used by w-unchanged']);
			await userEvent.click(getByTestId('apply-unresolved-confirm'));
			await waitAllPromises();

			// The dialog replaces the question "Apply all changes?".
			expect(confirm).not.toHaveBeenCalled();
			expect(settingsApi.applyPromotion).not.toHaveBeenCalled();
			expect(settingsApi.continueApplyPromotion).toHaveBeenCalledWith(
				expect.anything(),
				expectedSource.environmentId,
				{ expectedSource, expectedPreviewRevision: REVISION, confirmMissingDependencies: true },
			);
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Instance updated',
					message: expect.stringMatching(/ 1 dependency is still missing\.$/),
				}),
			);
			expect(router.currentRoute.value.name).toBe(PROMOTIONS_SETTINGS_VIEW);
		});

		it('should ask the user to accept the dependencies, then to confirm the deletion of a project', async () => {
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({
					conflicts: [{ ...projectDeletion, project: { id: 'team-b', name: 'Sales' } }],
					missingDependencies: [unreachableWorkflow],
				}),
			);
			vi.mocked(settingsApi.continueApplyPromotion).mockResolvedValue(applied);

			const { getByTestId } = await renderInstance();
			await userEvent.click(getByTestId('promotion-preview-submit'));

			expect(getByTestId('apply-unresolved-dialog')).toBeVisible();
			expect(confirm).not.toHaveBeenCalled();
			await userEvent.click(getByTestId('apply-unresolved-confirm'));
			await waitAllPromises();

			expect(confirm).toHaveBeenCalledTimes(1);
			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining('"Sales"'),
				'Apply and delete projects?',
				expect.anything(),
			);
			expect(settingsApi.continueApplyPromotion).toHaveBeenCalledWith(
				expect.anything(),
				expectedSource.environmentId,
				{
					expectedSource,
					expectedPreviewRevision: REVISION,
					confirmDestructiveChanges: true,
					confirmMissingDependencies: true,
				},
			);
		});

		it('should show the new issues, and no success, after an Apply that found dependencies that the user did not accept', async () => {
			const missingDependencies = [unreachableCredential];
			vi.mocked(api.getPromotionEnvironmentChanges)
				.mockResolvedValueOnce(instancePreview())
				.mockResolvedValue(instancePreview({ missingDependencies }));
			vi.mocked(settingsApi.applyPromotion).mockResolvedValue(
				blocked({ missingBindings: [], missingDependencies }),
			);

			const { getByRole, getByTestId } = await renderInstance();
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(/^Apply \d+ changes$/);
			await userEvent.click(getByTestId('promotion-preview-submit'));
			await waitAllPromises();

			expect(getByTestId('promotion-preview-operation-notice')).toHaveTextContent(
				"Apply found new issues, so it didn't change anything.",
			);
			expect(showMessage).not.toHaveBeenCalled();
			expect(router.currentRoute.value.path).toBe('/promotions/apply');
			expect(getByRole('tab', { name: /Issues/ })).toHaveAttribute('aria-selected', 'true');
			expect(getByRole('heading', { level: 2, name: 'Outside your access (1)' })).toBeVisible();
			// The user can accept the dependency and apply again.
			expect(getByTestId('promotion-preview-submit')).toBeEnabled();
			expect(getByTestId('promotion-preview-submit')).toHaveTextContent(
				/^Apply with 1 unresolved dependency$/,
			);
		});

		it.each([false, true])(
			'should keep the preview after a locked Apply (confirmation: %s)',
			async (destructive) => {
				vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
					instancePreview(destructive ? { conflicts: [projectDeletion] } : {}),
				);
				const apply = destructive ? settingsApi.continueApplyPromotion : settingsApi.applyPromotion;
				vi.mocked(apply).mockRejectedValue(
					new ResponseError('Environment is locked', { httpStatusCode: 423 }),
				);
				confirm.mockResolvedValue('confirm');
				const { getByTestId } = await renderInstance();

				await userEvent.click(getByTestId('promotion-preview-submit'));

				expect(apply).toHaveBeenCalledTimes(1);
				expect(getByTestId('promotion-preview-operation-error')).toHaveTextContent(
					'Nothing was applied. Another operation is running on this environment. Try again when it finishes.',
				);
				expect(getByTestId('promotion-preview-submit')).toBeEnabled();
				expect(api.getPromotionEnvironmentChanges).toHaveBeenCalledTimes(1);
				expect(router.currentRoute.value.path).toBe('/promotions/apply');
			},
		);

		it('should list a deleted project with its workflows, confirm the deletion and apply the reviewed state', async () => {
			vi.mocked(api.getPromotionEnvironmentChanges).mockResolvedValue(
				instancePreview({
					conflicts: [{ ...projectDeletion, project: { id: 'team-b', name: 'Sales' } }],
				}),
			);
			vi.mocked(settingsApi.continueApplyPromotion).mockResolvedValue(applied);
			confirm.mockResolvedValue('confirm');

			const { getAllByTestId, getByTestId } = await renderInstance();
			expect(treeRow(getAllByTestId, 'workflow:w20').getByText('Lead routing')).toBeVisible();

			await userEvent.click(getByTestId('promotion-preview-submit'));

			expect(confirm).toHaveBeenCalledWith(
				expect.stringContaining('"Sales"'),
				'Apply and delete projects?',
				expect.anything(),
			);
			expect(settingsApi.continueApplyPromotion).toHaveBeenCalledWith(
				expect.anything(),
				expectedSource.environmentId,
				{ expectedSource, expectedPreviewRevision: REVISION, confirmDestructiveChanges: true },
			);
			expect(router.currentRoute.value.name).toBe(PROMOTIONS_SETTINGS_VIEW);
		});
	});
});
