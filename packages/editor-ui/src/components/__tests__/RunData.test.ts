import type Vue from 'vue';
import { defineComponent } from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { render, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import RunData from '@/components/RunData.vue';
import { STORES, VIEWS } from '@/constants';
import { useSSOStore } from '@/stores/sso.store';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { externalHooks } from '@/mixins/externalHooks';
import { genericHelpers } from '@/mixins/genericHelpers';
import { pinData } from '@/mixins/pinData';
import { useNDVStore, useWorkflowsStore } from '@/stores';

let pinia: ReturnType<typeof createTestingPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let ndvStore: ReturnType<typeof useNDVStore>;

function TelemetryPlugin(vue: typeof Vue): void {
	Object.defineProperty(vue, '$telemetry', {
		get() {
			return {
				track: () => {},
			};
		},
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() {
			return {
				track: () => {},
			};
		},
	});
}

const nodeHelpers = defineComponent({
	methods: {
		getNodeInputData: vi.fn().mockReturnValue([
			{
				json: {
					id: 1,
					name: 'Test 1',
					json: {
						data: 'Json data 1',
					},
				},
			},
			{
				json: {
					id: 2,
					name: 'Test 2',
					json: {
						data: 'Json data 2',
					},
				},
			},
		]),
	},
});

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		RunData,
		merge(
			{
				pinia,
				mocks: {
					$route: {
						name: VIEWS.WORKFLOW,
					},
				},
				mixins: [externalHooks, genericHelpers, nodeHelpers, pinData],
			},
			renderOptions,
		),
		(vue) => {
			vue.use(TelemetryPlugin);
			vue.use(PiniaVuePlugin);
		},
	);

describe('RunData', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		ssoStore = useSSOStore();
		workflowsStore = useWorkflowsStore();
		ndvStore = useNDVStore();

		vi.spyOn(workflowsStore, 'getWorkflowExecution', 'get').mockReturnValue({
			id: '1',
			finished: true,
			mode: 'trigger',
			startedAt: new Date(),
			workflowData: {
				id: '1',
				name: 'Test Workflow',
				versionId: '1',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				active: false,
				nodes: [],
				connections: {},
			},
			data: {
				resultData: {
					runData: {
						'Test Node': [
							{
								startTime: new Date().getTime(),
								executionTime: new Date().getTime(),
								data: {},
								source: [null],
							},
						],
					},
				},
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render data correctly even when "item.json" has another "json" key', async () => {
		vi.spyOn(ndvStore, 'getPanelDisplayMode').mockReturnValue('schema');
		vi.spyOn(ndvStore, 'activeNode', 'get').mockReturnValue({
			id: '1',
			typeVersion: 1,
			name: 'Test Node',
			position: [0, 0],
			type: 'test',
			parameters: {},
		});

		const { getByText, getAllByTestId, getByTestId } = renderComponent({
			props: {
				nodeUi: {
					name: 'Test Node',
					position: [0, 0],
				},
				runIndex: 0,
				paneType: 'output',
				isExecuting: false,
				mappingEnabled: true,
				distanceFromActive: 0,
			},
		});

		await userEvent.click(getByTestId('ndv-pin-data'));
		await waitFor(() => getAllByTestId('run-data-schema-item'));
		expect(getByText('Test 1')).toBeInTheDocument();
		expect(getByText('Json data 1')).toBeInTheDocument();
	});
});
