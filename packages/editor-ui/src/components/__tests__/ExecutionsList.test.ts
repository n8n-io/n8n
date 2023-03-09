import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render, cleanup } from '@testing-library/vue';
import { STORES } from '@/constants';
import ExecutionsList from '@/components/ExecutionsList.vue';
import { externalHooks } from '@/mixins/externalHooks';
import { genericHelpers } from '@/mixins/genericHelpers';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { showMessage } from '@/mixins/showMessage';
import { i18nInstance, I18nPlugin } from '@/plugins/i18n';

const workflowsData = [
	{
		createdAt: '2023-03-01T05:52:34.106Z',
		updatedAt: '2023-03-01T05:53:00.000Z',
		id: '1039',
		name: 'Set workflow',
		active: false,
		tags: [{ id: '2', name: 'finance' }],
	},
	{
		createdAt: '2023-02-08T13:33:51.023Z',
		updatedAt: '2023-02-27T09:14:35.000Z',
		id: '1037',
		name: 'Manual wait set',
		active: false,
		tags: [{ id: '4', name: 'development' }],
	},
	{
		createdAt: '2023-02-14T10:35:41.769Z',
		updatedAt: '2023-02-14T10:36:07.000Z',
		id: '1038',
		name: 'Webhook wait set',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-01-11T05:01:19.530Z',
		updatedAt: '2023-02-08T13:33:28.000Z',
		id: '1025',
		name: 'Long running',
		active: true,
		tags: [],
	},
	{
		createdAt: '2023-02-07T11:45:22.388Z',
		updatedAt: '2023-02-08T08:21:09.000Z',
		id: '1036',
		name: 'Items count test',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-02-06T13:17:11.555Z',
		updatedAt: '2023-02-06T13:17:11.555Z',
		id: '1035',
		name: 'Items length test',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-11-18T13:58:54.602Z',
		updatedAt: '2023-02-03T14:46:51.000Z',
		id: '1017',
		name: 'Waiter',
		active: true,
		tags: [],
	},
	{
		createdAt: '2022-12-22T09:24:56.454Z',
		updatedAt: '2023-02-03T14:46:51.000Z',
		id: '1019',
		name: 'HTTP test',
		active: true,
		tags: [],
	},
	{
		createdAt: '2023-01-10T13:58:10.243Z',
		updatedAt: '2023-02-03T14:46:51.000Z',
		id: '1024',
		name: 'Infinite waiter',
		active: true,
		tags: [],
	},
	{
		createdAt: '2023-01-11T16:24:38.349Z',
		updatedAt: '2023-02-03T14:46:51.000Z',
		id: '1026',
		name: 'Pinned data',
		active: true,
		tags: [],
	},
	{
		createdAt: '2023-01-25T10:01:38.870Z',
		updatedAt: '2023-02-03T14:46:51.000Z',
		id: '1027',
		name: 'A webhook',
		active: true,
		tags: [],
	},
	{
		createdAt: '2023-02-01T13:53:35.170Z',
		updatedAt: '2023-02-01T13:53:35.170Z',
		id: '1034',
		name: 'My workflow 10',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-02-01T13:52:27.937Z',
		updatedAt: '2023-02-01T13:52:27.937Z',
		id: '1033',
		name: 'My workflow 9',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-02-01T13:51:56.977Z',
		updatedAt: '2023-02-01T13:51:56.977Z',
		id: '1032',
		name: 'My workflow 8',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-02-01T13:51:44.565Z',
		updatedAt: '2023-02-01T13:51:44.565Z',
		id: '1031',
		name: 'My workflow 7',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-01-31T12:52:15.797Z',
		updatedAt: '2023-01-31T12:52:15.797Z',
		id: '1030',
		name: 'My workflow 6',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-01-31T12:10:11.850Z',
		updatedAt: '2023-01-31T12:10:11.850Z',
		id: '1029',
		name: 'My workflow 5',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-11-01T10:27:37.477Z',
		updatedAt: '2023-01-16T17:07:11.000Z',
		id: '1015',
		name: 'Execution testing',
		active: false,
		tags: [],
	},
	{
		createdAt: '2023-01-10T10:36:02.480Z',
		updatedAt: '2023-01-10T10:36:02.480Z',
		id: '1021',
		name: 'Empty',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-09-13T08:27:55.565Z',
		updatedAt: '2023-01-09T15:48:52.000Z',
		id: '3',
		name: 'Null values in table and json',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-09-12T13:46:20.452Z',
		updatedAt: '2023-01-09T14:54:16.000Z',
		id: '2',
		name: 'Improve visibility of Trigger NDV listening state',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-09-13T18:47:34.347Z',
		updatedAt: '2023-01-05T17:18:34.000Z',
		id: '4',
		name: 'Mapping test',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-12-22T09:24:56.448Z',
		updatedAt: '2022-12-22T09:24:56.448Z',
		id: '1018',
		name: 'My workflow 4',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-11-18T13:58:54.596Z',
		updatedAt: '2022-11-18T13:58:54.596Z',
		id: '1016',
		name: 'My workflow 3',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-10-27T09:54:34.808Z',
		updatedAt: '2022-10-27T09:54:34.808Z',
		id: '1014',
		name: 'Large data',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-10-26T18:58:22.675Z',
		updatedAt: '2022-10-26T18:58:22.675Z',
		id: '1013',
		name: 'My workflow',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-10-20T21:50:27.089Z',
		updatedAt: '2022-10-24T14:03:39.482Z',
		id: '5',
		name: 'Readonly nodes',
		active: false,
		tags: [],
	},
	{
		createdAt: '2022-02-22T09:37:42.963Z',
		updatedAt: '2022-10-10T11:13:47.133Z',
		id: '1012',
		name: 'Transporeon - orders - step 3 - process single',
		active: false,
		tags: [
			{ id: '9', name: 'nested' },
			{ id: '10', name: 'transporeon' },
		],
	},
	{
		createdAt: '2022-09-08T20:25:49.637Z',
		updatedAt: '2022-09-14T12:13:52.930Z',
		id: '1',
		name: 'Input error test',
		active: false,
		tags: [],
	},
];

const executionsData = {
	count: 239,
	results: [
		{
			id: '28803',
			finished: true,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-03-01T05:53:02.273Z',
			stoppedAt: '2023-03-01T05:53:02.283Z',
			workflowId: '1039',
			workflowName: 'Set workflow',
			status: 'success',
			nodeExecutionStatus: {},
		},
		{
			id: '28800',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:31.871Z',
			stoppedAt: '2023-02-14T10:59:32.162Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28799',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:21.886Z',
			stoppedAt: '2023-02-14T10:59:22.521Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28798',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:18.240Z',
			stoppedAt: '2023-02-14T10:59:19.247Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28797',
			finished: true,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:13.053Z',
			stoppedAt: '2023-02-14T10:59:15.084Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'success',
			nodeExecutionStatus: {},
		},
		{
			id: '28796',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:08.348Z',
			stoppedAt: '2023-02-14T10:59:09.527Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28795',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:06.001Z',
			stoppedAt: '2023-02-14T10:59:06.542Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28794',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:59:04.309Z',
			stoppedAt: '2023-02-14T10:59:04.447Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28793',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:58:59.666Z',
			stoppedAt: '2023-02-14T10:59:00.695Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
		{
			id: '28792',
			finished: false,
			mode: 'manual',
			waitTill: null,
			startedAt: '2023-02-14T10:58:55.243Z',
			stoppedAt: '2023-02-14T10:58:57.086Z',
			workflowId: '1037',
			workflowName: 'Manual wait set',
			status: 'failed',
			nodeExecutionStatus: {},
		},
	],
	estimated: false,
};

const mockRestApiMixin = Vue.extend({
	methods: {
		restApi() {
			return {
				getWorkflows() {
					return Promise.resolve(workflowsData);
				},
				getCurrentExecutions() {
					return Promise.resolve([]);
				},
				getPastExecutions() {
					return Promise.resolve(executionsData);
				},
			};
		},
	},
});

const renderOptions = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					templates: {
						enabled: true,
						host: 'https://api.n8n.io/api/',
					},
				},
			},
		},
	}),
	i18n: i18nInstance,
	stubs: ['font-awesome-icon'],
	mixins: [externalHooks, genericHelpers, executionHelpers, showMessage, mockRestApiMixin],
};

export function TelemetryPlugin(vue: typeof Vue): void {
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

const renderComponent = () =>
	render(ExecutionsList, renderOptions, (vue) => {
		vue.use(TelemetryPlugin);
		vue.use(PiniaVuePlugin);
		vue.use((vue) => I18nPlugin(vue));
	});

describe('ExecutionsList.vue', () => {
	it('renders list', async () => {
		const { getAllByTestId } = renderComponent();
		await new Promise((resolve) => setTimeout(resolve));
		expect(getAllByTestId('execution-data-row').length).toBe(executionsData.results.length);
	});
});
