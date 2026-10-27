import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { IWorkflowDb } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { createWorkflow, getScenarios } from './selfHealingPlayground';
import SelfHealingPlaygroundView from './SelfHealingPlaygroundView.vue';

const mocks = vi.hoisted(() => ({
	projects: [
		{ id: 'personal', name: 'Personal', type: 'personal' },
		{ id: 'project1', name: 'Self-healing test', type: 'team' },
	],
	context: { baseUrl: '/rest', pushRef: 'playground' },
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
	activate: vi.fn(),
	create: vi.fn(),
	archive: vi.fn(),
	delete: vi.fn(),
	request: vi.fn(),
	configurations: vi.fn(),
	executions: vi.fn(),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: mocks.context,
		webhookUrl: 'http://localhost:5678/webhook',
	}),
}));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		moduleSettings: { 'instance-ai': { workflowSuggestionsEnabled: true } },
	}),
}));
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ createNewWorkflow: mocks.create, archiveWorkflow: mocks.archive }),
}));
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ deleteWorkflow: mocks.delete }),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		getMyProjects: vi.fn(),
		myProjects: mocks.projects,
	}),
}));
vi.mock('@/app/api/workflows', () => ({
	getWorkflow: mocks.getWorkflow,
	getWorkflows: mocks.getWorkflows,
	activateWorkflow: mocks.activate,
}));
vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest: mocks.request,
}));

const render = createComponentRenderer(SelfHealingPlaygroundView, {
	global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
});
let workflow: IWorkflowDb;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.projects = [
		{ id: 'personal', name: 'Personal', type: 'personal' },
		{ id: 'project1', name: 'Self-healing test', type: 'team' },
	];
	workflow = {
		...createWorkflow(getScenarios(useI18n())[0], 'project1'),
		id: 'workflow1',
		versionId: 'v1',
		activeVersionId: 'v1',
		isArchived: false,
	} as IWorkflowDb;
	mocks.getWorkflows.mockResolvedValue({ data: [workflow], count: 1 });
	mocks.getWorkflow.mockResolvedValue(workflow);
	mocks.create.mockResolvedValue(workflow);
	mocks.activate.mockResolvedValue(workflow);
	mocks.archive.mockResolvedValue(undefined);
	mocks.delete.mockResolvedValue(undefined);
	mocks.configurations.mockResolvedValue([{ id: 1, enabled: true, scope: 'all', workflowIds: [] }]);
	mocks.executions.mockResolvedValue({ results: [] });
	mocks.request.mockImplementation(async (_context, _method, path: string) =>
		path.endsWith('/self-healing-configurations')
			? await mocks.configurations(path)
			: await mocks.executions(),
	);
	fetchMock = vi
		.fn()
		.mockResolvedValue(new Response('{"message":"Error in workflow"}', { status: 500 }));
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('SelfHealingPlaygroundView', () => {
	it('allows creation but blocks execution until the project has an enabled configuration', async () => {
		mocks.configurations.mockResolvedValue([]);
		const screen = render();
		expect(screen.getByTestId('create-wrong-field')).toBeDisabled();
		expect(await screen.findByTestId('playground-configuration-required')).toHaveTextContent(
			'You can create test workflows now',
		);
		for (const scenario of getScenarios(useI18n())) {
			expect(screen.getByTestId(`create-${scenario.id}`)).toBeEnabled();
		}
		expect(mocks.configurations).toHaveBeenCalledWith(
			'/projects/project1/self-healing-configurations',
		);
		expect(screen.getByRole('button', { name: 'Run original input' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Run alternate input' })).toBeDisabled();
		await userEvent.click(screen.getByTestId('create-wrong-field'));
		await waitFor(() => expect(mocks.create).toHaveBeenCalled());
		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Check setup again' })).toBeEnabled(),
		);
		expect(fetchMock).not.toHaveBeenCalled();
		mocks.configurations.mockResolvedValue([
			{ id: 1, enabled: true, scope: 'all', workflowIds: [] },
		]);
		await userEvent.click(screen.getByRole('button', { name: 'Check setup again' }));
		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Run original input' })).toBeEnabled(),
		);
	});
	it('keeps execution blocked when configurations cannot be checked', async () => {
		mocks.configurations.mockRejectedValue(new Error('Forbidden'));
		const screen = render();
		expect(await screen.findByTestId('playground-configuration-required')).toHaveTextContent(
			"Couldn't check this project's self-healing configurations",
		);
		expect(screen.getByTestId('create-wrong-field')).toBeEnabled();
		expect(screen.getByRole('button', { name: 'Run original input' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Run alternate input' })).toBeDisabled();
		expect(mocks.create).not.toHaveBeenCalled();
		expect(screen.getByTestId('playground-reset')).toBeEnabled();
	});
	it.each(['Run original input', 'Run alternate input'])(
		'rechecks configurations before %s',
		async (name) => {
			const screen = render();
			const run = await screen.findByRole('button', { name });
			await waitFor(() => expect(run).toBeEnabled());
			mocks.configurations.mockResolvedValue([]);
			await userEvent.click(run);
			expect(await screen.findByTestId('playground-configuration-required')).toBeVisible();
			expect(run).toBeDisabled();
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ enabled: false, scope: 'all', workflowIds: [] },
		{ enabled: true, scope: 'selected', workflowIds: ['other-workflow'] },
	])(
		'blocks execution when the configuration does not cover the workflow: %j',
		async (configuration) => {
			mocks.configurations.mockResolvedValue([{ id: 1, ...configuration }]);
			const screen = render();
			await waitFor(() => expect(screen.getByTestId('create-wrong-field')).toBeEnabled());
			expect(screen.getByRole('button', { name: 'Run original input' })).toBeDisabled();
			expect(screen.getByRole('button', { name: 'Run alternate input' })).toBeDisabled();
		},
	);
	it('allows execution when an enabled configuration selects the workflow', async () => {
		mocks.configurations.mockResolvedValue([
			{ id: 1, enabled: true, scope: 'selected', workflowIds: ['workflow1'] },
		]);
		const screen = render();
		const run = await screen.findByRole('button', { name: 'Run original input' });
		await waitFor(() => expect(run).toBeEnabled());
		await userEvent.click(run);
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
	});
	it('checks the newly selected project instead of reusing the previous configuration', async () => {
		mocks.projects.push({ id: 'project2', name: 'Other team', type: 'team' });
		mocks.configurations.mockImplementation(async (path: string) =>
			path.includes('/project1/') ? [{ id: 1, enabled: true, scope: 'all', workflowIds: [] }] : [],
		);
		const screen = render();
		await waitFor(() => expect(screen.getByTestId('create-wrong-field')).toBeEnabled());
		await userEvent.click(screen.getByRole('combobox'));
		await userEvent.click(await screen.findByRole('option', { name: 'Other team' }));
		expect(await screen.findByTestId('playground-configuration-required')).toBeVisible();
		expect(screen.getByTestId('create-wrong-field')).toBeEnabled();
		expect(screen.getByRole('button', { name: 'Run original input' })).toBeDisabled();
		expect(mocks.configurations).toHaveBeenCalledWith(
			'/projects/project2/self-healing-configurations',
		);
	});
	it('does not delete test data when reset is canceled', async () => {
		const screen = render();
		const reset = screen.getByTestId('playground-reset');
		await waitFor(() => expect(reset).toBeEnabled());
		await userEvent.click(reset);
		expect(await screen.findByText(/permanently delete 1 playground workflows/)).toHaveTextContent(
			'Self-healing test',
		);
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(mocks.archive).not.toHaveBeenCalled();
		expect(mocks.delete).not.toHaveBeenCalled();
	});
	it('archives and deletes only recognized playground workflows after confirmation', async () => {
		const unrelated = { ...workflow, id: 'unrelated', nodes: [] };
		mocks.getWorkflows.mockResolvedValue({ data: [workflow, unrelated], count: 2 });
		mocks.getWorkflow.mockImplementation(async (_context, id) =>
			id === 'unrelated' ? unrelated : workflow,
		);
		const screen = render();
		const reset = screen.getByTestId('playground-reset');
		await waitFor(() => expect(reset).toBeEnabled());
		await userEvent.click(reset);
		const confirm = await screen.findByTestId('playground-reset-confirm');
		expect(mocks.delete).not.toHaveBeenCalled();
		mocks.getWorkflows.mockResolvedValue({ data: [unrelated], count: 1 });
		await userEvent.click(confirm);
		await waitFor(() => expect(mocks.delete).toHaveBeenCalledExactlyOnceWith('workflow1'));
		expect(mocks.archive).toHaveBeenCalledExactlyOnceWith('workflow1', undefined);
		expect(mocks.archive.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.delete.mock.invocationCallOrder[0],
		);
		expect(
			await screen.findByText(/Deleted 1 playground workflows and their test data/),
		).toBeVisible();
		expect(reset).toBeDisabled();
	});
	it('reports a partial reset and allows retrying a workflow that was already archived', async () => {
		const archived = { ...workflow, id: 'archived', isArchived: true, activeVersionId: null };
		mocks.getWorkflows.mockResolvedValue({ data: [workflow, archived], count: 2 });
		mocks.getWorkflow.mockImplementation(async (_context, id) =>
			id === 'archived' ? archived : workflow,
		);
		mocks.delete.mockRejectedValueOnce(new Error('Still unpublishing'));
		const screen = render();
		const reset = screen.getByTestId('playground-reset');
		await waitFor(() => expect(reset).toBeEnabled());
		await userEvent.click(reset);
		await userEvent.click(await screen.findByTestId('playground-reset-confirm'));
		expect(
			await screen.findByText(/Deleted 1 playground workflows. Couldn't delete 1/),
		).toBeVisible();
		expect(mocks.archive).toHaveBeenCalledExactlyOnceWith('workflow1', undefined);
		expect(mocks.delete).toHaveBeenCalledWith('archived');
		expect(reset).toBeEnabled();
	});
	it('does not delete a workflow that no longer has the playground identity', async () => {
		const screen = render();
		const reset = screen.getByTestId('playground-reset');
		await waitFor(() => expect(reset).toBeEnabled());
		await userEvent.click(reset);
		const confirm = await screen.findByTestId('playground-reset-confirm');
		mocks.getWorkflow.mockResolvedValue({ ...workflow, name: 'Other workflow' });
		await userEvent.click(confirm);
		expect(await screen.findByText(/Couldn't delete 1/)).toBeVisible();
		expect(mocks.archive).not.toHaveBeenCalled();
		expect(mocks.delete).not.toHaveBeenCalled();
	});
	it('loads and creates workflows in a personal project', async () => {
		mocks.projects = [{ id: 'personal', name: 'Personal', type: 'personal' }];
		const screen = render();
		await waitFor(() => expect(screen.getByTestId('create-wrong-field')).toBeEnabled());
		expect(mocks.configurations).toHaveBeenCalledWith(
			'/projects/personal/self-healing-configurations',
		);
		expect(screen.getByRole('link', { name: 'Self-healing settings' })).toHaveAttribute(
			'href',
			'/projects/personal/self-healing',
		);
		await userEvent.click(screen.getByTestId('create-wrong-field'));
		await waitFor(() =>
			expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'personal' })),
		);
	});
	it('blocks creation when no projects are available', async () => {
		mocks.projects = [];
		const screen = render();
		expect(await screen.findByText(/No projects are available/)).toBeVisible();
		expect(screen.getByTestId('create-wrong-field')).toBeDisabled();
		expect(mocks.getWorkflows).not.toHaveBeenCalled();
	});
	it('creates and publishes through the signed-in session without triggering an execution', async () => {
		const screen = render();
		const create = screen.getByTestId('create-wrong-field');
		await waitFor(() => expect(create).toBeEnabled());
		await userEvent.click(create);
		await waitFor(() =>
			expect(mocks.activate).toHaveBeenCalledWith(mocks.context, 'workflow1', { versionId: 'v1' }),
		);
		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project1' }));
		expect(fetchMock).not.toHaveBeenCalled();
		expect(mocks.getWorkflows).toHaveBeenCalledWith(
			mocks.context,
			expect.objectContaining({ projectId: 'project1' }),
			expect.any(Object),
		);
	});
	it('sends the alternate input to the production webhook', async () => {
		const screen = render();
		const send = await screen.findByRole('button', { name: 'Run alternate input' });
		await waitFor(() => expect(send).toBeEnabled());
		await userEvent.click(send);
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining('/webhook/self-healing-playground/'),
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(getScenarios(useI18n())[0].alternateInput),
			}),
		);
	});
	it('rechecks the published version before triggering', async () => {
		const screen = render();
		const send = await screen.findByRole('button', { name: 'Run original input' });
		await waitFor(() => expect(send).toBeEnabled());
		mocks.getWorkflow.mockResolvedValue({ ...workflow, versionId: 'new-draft' });
		await userEvent.click(send);
		await waitFor(() =>
			expect(screen.getByTestId('playground-error')).toHaveTextContent('Publish the current draft'),
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it.each([
		['error', 'The workflow failed.'],
		['success', 'The workflow completed.'],
	])('shows the next step for a saved %s execution', async (status, guidance) => {
		mocks.executions.mockResolvedValue({ results: [{ id: 'execution1', status }] });
		const screen = render();
		expect(await screen.findByText(guidance, { exact: false })).toBeVisible();
	});
});
