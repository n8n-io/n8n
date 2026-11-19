import { computed, defineComponent, h } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { mockedStore } from '@/__tests__/utils';
import { createTestWorkflow } from '@/__tests__/mocks';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import {
	useSourceControlPullReload,
	type SourceControlPullReloadOptions,
} from './useSourceControlPullReload';

const mockRoute = vi.hoisted(() => ({ query: {} as Record<string, string> }));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => mockRoute,
}));

function renderComposable(workflowId = 'wf-1') {
	const initializeWorkspace = vi.fn<SourceControlPullReloadOptions['initializeWorkspace']>();
	const fitView = vi.fn<SourceControlPullReloadOptions['fitView']>();

	const TestComponent = defineComponent({
		setup() {
			useSourceControlPullReload({ initializeWorkspace, fitView });
			return () => h('div');
		},
	});

	const { unmount } = render(TestComponent, {
		global: {
			plugins: [createTestingPinia()],
			provide: { [WorkflowIdKey as symbol]: computed(() => workflowId) },
		},
	});

	return { initializeWorkspace, fitView, unmount };
}

async function pull() {
	sourceControlEventBus.emit('pull');
	await flushPromises();
}

describe('useSourceControlPullReload', () => {
	beforeEach(() => {
		mockRoute.query = {};
	});

	it('loads the pulled version of the open workflow into the canvas', async () => {
		const { initializeWorkspace, fitView } = renderComposable();
		const pulled = createTestWorkflow({ id: 'wf-1', name: 'Pulled' });
		mockedStore(useWorkflowsListStore).fetchWorkflow.mockResolvedValue(pulled);

		await pull();

		expect(initializeWorkspace).toHaveBeenCalledWith(pulled);
		expect(fitView).toHaveBeenCalledOnce();
	});

	it('refreshes variables, tags and projects after a pull', async () => {
		renderComposable();

		await pull();

		expect(mockedStore(useEnvironmentsStore).fetchAllVariables).toHaveBeenCalledOnce();
		expect(mockedStore(useTagsStore).fetchAll).toHaveBeenCalledOnce();
		expect(mockedStore(useProjectsStore).getAvailableProjects).toHaveBeenCalledOnce();
	});

	it('loads credentials of the open workflow', async () => {
		renderComposable('wf-1');

		await pull();

		expect(mockedStore(useCredentialsStore).fetchUsableCredentials).toHaveBeenCalledWith({
			workflowId: 'wf-1',
		});
	});

	it('loads credentials of the personal project for a new workflow without a project in the URL', async () => {
		mockRoute.query = { new: 'true' };
		renderComposable();
		mockedStore(useProjectsStore).personalProject = createTestProject({ id: 'personal-1' });

		await pull();

		expect(mockedStore(useCredentialsStore).fetchUsableCredentials).toHaveBeenCalledWith({
			projectId: 'personal-1',
		});
	});

	it('logs the error and keeps the canvas when no project is found', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockRoute.query = { new: 'true' };
		const { initializeWorkspace } = renderComposable();

		await pull();

		expect(consoleError).toHaveBeenCalledWith(
			expect.objectContaining({ message: expect.stringContaining('Could not find projectId') }),
		);
		expect(initializeWorkspace).not.toHaveBeenCalled();
	});

	it('shows the building status in the tab title while the AI builder streams', async () => {
		renderComposable();
		mockedStore(useBuilderStore).streaming = true;
		mockedStore(useWorkflowsListStore).fetchWorkflow.mockResolvedValue(
			createTestWorkflow({ id: 'wf-1', name: 'Pulled' }),
		);

		await pull();

		expect(document.title).toContain('[Building] Pulled');
	});

	it('keeps unsaved changes on the canvas', async () => {
		const { initializeWorkspace } = renderComposable();
		mockedStore(useUIStore).stateIsDirty = true;

		await pull();

		expect(mockedStore(useWorkflowsListStore).fetchWorkflow).not.toHaveBeenCalled();
		expect(initializeWorkspace).not.toHaveBeenCalled();
	});

	it('loads credentials of the project in the URL for a new workflow', async () => {
		mockRoute.query = { new: 'true', projectId: 'project-1' };
		renderComposable();

		await pull();

		expect(mockedStore(useCredentialsStore).fetchUsableCredentials).toHaveBeenCalledWith({
			projectId: 'project-1',
		});
	});

	it('stops reacting to pulls after the view unmounts', async () => {
		const { initializeWorkspace, unmount } = renderComposable();
		unmount();

		await pull();

		expect(mockedStore(useWorkflowsListStore).fetchWorkflow).not.toHaveBeenCalled();
		expect(initializeWorkspace).not.toHaveBeenCalled();
	});
});
