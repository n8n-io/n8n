import type { SpyInstance } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import WorkflowHistoryPage from '@/views/WorkflowHistory.vue';
import { useWorkflowHistoryStore } from '@/stores/workflowHistory.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { STORES, VIEWS } from '@/constants';
import {
	workflowHistoryDataFactory,
	workflowVersionDataFactory,
} from '@/stores/__tests__/utils/workflowHistoryTestUtils';
import type { WorkflowVersion } from '@/types/workflowHistory';
import type { IWorkflowDb } from '@/Interface';

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
				template:
					'<div><button data-test-id="stub-preview-button" @click="event => $emit(`preview`, {id, event})">Preview</button>button></div>',
			}),
		},
	},
});

let pinia: ReturnType<typeof createTestingPinia>;
let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;
let workflowHistoryStore: ReturnType<typeof useWorkflowHistoryStore>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let windowOpenSpy: SpyInstance;

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
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should replace url path to contain /:versionId', async () => {
		route.params.workflowId = workflowId;

		renderComponent({ pinia });

		await waitFor(() =>
			expect(router.replace).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId: versionData.versionId },
			}),
		);
	});

	it('should load version data if path contains /:versionId', async () => {
		const getWorkflowVersionSpy = vi.spyOn(workflowHistoryStore, 'getWorkflowVersion');

		route.params.workflowId = workflowId;
		route.params.versionId = versionData.versionId;

		renderComponent({ pinia });

		await waitFor(() => expect(router.replace).not.toHaveBeenCalled());
		expect(getWorkflowVersionSpy).toHaveBeenCalledWith(workflowId, versionData.versionId);
	});

	it('should change path on preview', async () => {
		route.params.workflowId = workflowId;

		const { getByTestId } = renderComponent({ pinia });

		await userEvent.click(getByTestId('stub-preview-button'));

		await waitFor(() =>
			expect(router.push).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId },
			}),
		);
	});

	it('should open preview in new tab if meta key used', async () => {
		route.params.workflowId = workflowId;
		const { getByTestId } = renderComponent({ pinia });

		const user = userEvent.setup();

		await user.keyboard('[ControlLeft>]');
		await user.click(getByTestId('stub-preview-button'));

		await waitFor(() =>
			expect(router.resolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW_HISTORY,
				params: { workflowId, versionId },
			}),
		);
		expect(windowOpenSpy).toHaveBeenCalled();
	});
});
