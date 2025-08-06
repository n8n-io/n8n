import type { MockInstance } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import WorkflowHistoryPage from '@/views/WorkflowHistory.vue';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { STORES } from '@n8n/stores';
import { VIEWS } from '@/constants';
import {
	workflowHistoryDataFactory,
	workflowVersionDataFactory,
} from '@/stores/__tests__/utils/workflowHistoryTestUtils';
import type { WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import type { IWorkflowDb } from '@/Interface';
import { telemetry } from '@/plugins/telemetry';

vi.mock('vue-router', () => {
	const params = {};
	const push = vi.fn();
	const replace = vi.fn();
	const resolve = vi.fn().mockImplementation(() => ({ href: '' }));
	return {
		useRoute: () => ({
			params,
		}),
		useRouter: () => ({
			push,
			replace,
			resolve,
		}),
		RouterLink: vi.fn(),
	};
});

const workflowId = faker.string.nanoid();
const historyData = Array.from({ length: 5 }, workflowHistoryDataFactory);
const versionData: WorkflowVersion = {
	...workflowVersionDataFactory(),
	...historyData[0],
};
const versionId = faker.string.nanoid();

const renderComponent = createComponentRenderer(WorkflowHistoryPage, {
	global: {
		stubs: {
			'workflow-history-content': true,
			'workflow-history-list': defineComponent({
				props: {
					id: {
						type: String,
						default: versionId,
					},
				},
				template: `<div>
						<button data-test-id="stub-preview-button" @click="event => $emit('preview', {id, event})" />
						<button data-test-id="stub-open-button" @click="() => $emit('action', { action: 'open', id })" />
						<button data-test-id="stub-clone-button" @click="() => $emit('action', { action: 'clone', id })" />
						<button data-test-id="stub-download-button" @click="() => $emit('action', { action: 'download', id })" />
					</div>`,
			}),
		},
	},
});

let pinia: ReturnType<typeof createTestingPinia>;
let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;
let workflowHistoryStore: ReturnType<typeof useWorkflowHistoryStore>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let windowOpenSpy: MockInstance;

describe('WorkflowHistory', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
			},
		});
		workflowHistoryStore = useWorkflowHistoryStore();
		workflowsStore = useWorkflowsStore();
		route = useRoute();
		router = useRouter();

		vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({} as IWorkflowDb);
		vi.spyOn(workflowHistoryStore, 'getWorkflowHistory').mockResolvedValue(historyData);
		vi.spyOn(workflowHistoryStore, 'getWorkflowVersion').mockResolvedValue(versionData);
		vi.spyOn(telemetry, 'track').mockImplementation(() => {});
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should replace url path to contain /:versionId', async () => {
		route.params.workflowId = workflowId;

		renderComponent({ pinia });

		await waitFor(() => {
			expect(router.replace).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId: versionData.versionId },
			});
			expect(telemetry.track).toHaveBeenCalledWith('User opened workflow history', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
	});

	it('should load version data if path contains /:versionId', async () => {
		const getWorkflowVersionSpy = vi.spyOn(workflowHistoryStore, 'getWorkflowVersion');

		route.params.workflowId = workflowId;
		route.params.versionId = versionData.versionId;

		renderComponent({ pinia });

		expect(getWorkflowVersionSpy).toHaveBeenCalledWith(workflowId, versionData.versionId);
		await waitFor(() => {
			expect(router.replace).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith('User selected version', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
	});

	it('should change path on preview', async () => {
		route.params.workflowId = workflowId;

		const { getByTestId } = renderComponent({ pinia });

		await userEvent.click(getByTestId('stub-preview-button'));

		await waitFor(() => {
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId },
			});
			expect(telemetry.track).toHaveBeenCalledWith('User selected version', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
	});

	it('should open preview in new tab if open action is dispatched', async () => {
		route.params.workflowId = workflowId;
		const { getByTestId } = renderComponent({ pinia });

		await userEvent.click(getByTestId('stub-open-button'));

		await waitFor(() => {
			expect(router.resolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId },
			});
			expect(telemetry.track).toHaveBeenCalledWith('User opened version in new tab', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
		expect(windowOpenSpy).toHaveBeenCalled();
	});

	it('should open preview in new tab if meta key used', async () => {
		route.params.workflowId = workflowId;
		const { getByTestId } = renderComponent({ pinia });

		const user = userEvent.setup();

		await user.keyboard('[ControlLeft>]');
		await user.click(getByTestId('stub-preview-button'));

		await waitFor(() => {
			expect(router.resolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId },
			});
			expect(telemetry.track).toHaveBeenCalledWith('User opened version in new tab', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
		expect(windowOpenSpy).toHaveBeenCalled();
	});

	it('should clone workflow from version data', async () => {
		route.params.workflowId = workflowId;
		const newWorkflowId = faker.string.nanoid();
		vi.spyOn(workflowHistoryStore, 'cloneIntoNewWorkflow').mockResolvedValue({
			id: newWorkflowId,
		} as IWorkflowDb);

		const { getByTestId, getByRole } = renderComponent({ pinia });
		await userEvent.click(getByTestId('stub-clone-button'));

		await waitFor(() => {
			expect(router.resolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { name: newWorkflowId },
			});
			expect(telemetry.track).toHaveBeenCalledWith('User cloned version', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});

		expect(within(getByRole('alert')).getByRole('link')).toBeInTheDocument();
	});

	it('should download workflow version', async () => {
		route.params.workflowId = workflowId;

		const { getByTestId } = renderComponent({ pinia });
		await userEvent.click(getByTestId('stub-download-button'));

		await waitFor(() => {
			expect(telemetry.track).toHaveBeenCalledWith('User downloaded version', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
	});

	it('should display archived tag on header if workflow is archived', async () => {
		vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
			id: workflowId,
			name: 'Test Workflow',
			isArchived: true,
		} as IWorkflowDb);

		route.params.workflowId = workflowId;

		const { container, getByTestId } = renderComponent({ pinia });
		await flushPromises();

		expect(getByTestId('workflow-archived-tag')).toBeInTheDocument();
		expect(container.textContent).toContain('Test Workflow');
	});

	it('should not display archived tag on header if workflow is not archived', async () => {
		vi.spyOn(workflowsStore, 'fetchWorkflow').mockResolvedValue({
			id: workflowId,
			name: 'Test Workflow',
			isArchived: false,
		} as IWorkflowDb);

		route.params.workflowId = workflowId;

		const { queryByTestId, container } = renderComponent({ pinia });
		await flushPromises();

		expect(queryByTestId('workflow-archived-tag')).not.toBeInTheDocument();
		expect(container.textContent).toContain('Test Workflow');
	});
});
