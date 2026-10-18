import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { IWorkflowDb } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { createWorkflow, getScenarios } from './selfHealingPlayground';
import SelfHealingPlaygroundView from './SelfHealingPlaygroundView.vue';

const mocks = vi.hoisted(() => ({
	context: { baseUrl: '/rest', pushRef: 'playground' },
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
	activate: vi.fn(),
	create: vi.fn(),
	request: vi.fn(),
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
	useWorkflowsStore: () => ({ createNewWorkflow: mocks.create }),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		getMyProjects: vi.fn(),
		getPersonalProject: vi.fn(),
		personalProject: { id: 'personal' },
		myProjects: [
			{ id: 'personal', name: 'Personal' },
			{ id: 'project1', name: 'Self-healing test' },
		],
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
	global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
});
let workflow: IWorkflowDb;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.clearAllMocks();
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
	mocks.request.mockResolvedValue({ results: [] });
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
	});
	it('sends the alternate input to the production webhook', async () => {
		const screen = render();
		const send = await screen.findByRole('button', { name: 'Send alternate input' });
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
		const send = await screen.findByRole('button', { name: 'Send original input' });
		await waitFor(() => expect(send).toBeEnabled());
		mocks.getWorkflow.mockResolvedValue({ ...workflow, versionId: 'new-draft' });
		await userEvent.click(send);
		await waitFor(() =>
			expect(screen.getByTestId('playground-error')).toHaveTextContent('Publish the current draft'),
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
