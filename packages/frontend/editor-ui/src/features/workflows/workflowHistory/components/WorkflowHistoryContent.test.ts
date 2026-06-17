import { vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { UserAction } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryContent from './WorkflowHistoryContent.vue';
import type { WorkflowHistoryActionTypes } from '@n8n/rest-api-client/api/workflowHistory';
import { workflowVersionDataFactory } from '../__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import type { IUser } from 'n8n-workflow';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
const actions: Array<UserAction<IUser>> = actionTypes.map((value) => ({
	label: value,
	disabled: false,
	value,
}));

const renderComponent = createComponentRenderer(WorkflowHistoryContent);

let pinia: ReturnType<typeof createPinia>;
let projectsStore: ReturnType<typeof useProjectsStore>;
let postMessageSpy: MockInstance;

describe('WorkflowHistoryContent', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		projectsStore = useProjectsStore();

		// Mock currentProjectId for all tests
		vi.spyOn(projectsStore, 'currentProjectId', 'get').mockReturnValue('test-project-id');

		postMessageSpy = vi.fn();
		Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
			writable: true,
			value: {
				postMessage: postMessageSpy,
			},
		});
	});

	it('should render version data with action toggle', () => {
		const workflowVersion = workflowVersionDataFactory();
		const { getByTestId } = renderComponent({
			pinia,
			props: {
				workflow: null,
				workflowVersion,
				actions,
			},
		});

		expect(getByTestId('workflow-history-content-actions')).toBeInTheDocument();
		expect(getByTestId('action-toggle-button')).toBeInTheDocument();
	});

	test.each(actionTypes)('should emit %s event', async (action) => {
		const workflowVersion = workflowVersionDataFactory();
		const { getByTestId, emitted } = renderComponent({
			pinia,
			props: {
				workflow: null,
				workflowVersion,
				actions,
			},
		});

		await userEvent.click(getByTestId('action-toggle-button'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		await userEvent.click(getByTestId(`action-${action}`));
		expect(emitted().action).toEqual([
			[
				{
					action,
					id: workflowVersion.versionId,
					data: {
						formattedCreatedAt: expect.any(String),
						versionName: workflowVersion.name,
						description: workflowVersion.description,
					},
				},
			],
		]);
	});

	it('should pass proper workflow data to WorkflowPreview component', async () => {
		const workflowVersion = workflowVersionDataFactory();
		const workflow = { pinData: {} } as IWorkflowDb;
		renderComponent({
			pinia,
			props: {
				workflow,
				workflowVersion,
				actions,
			},
		});

		window.postMessage('{"command":"n8nReady"}', '*');
		await waitFor(() => {
			expect(postMessageSpy).toHaveBeenCalledWith(expect.not.stringContaining('pinData'), '*');
		});
	});
});
