import { PiniaVuePlugin } from 'pinia';
import { createLocalVue, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { render, screen } from '@testing-library/vue';
import ParameterInputWrapper from '@/components/ParameterInputWrapper.vue';
import { createEmptyWorkflow, useWorkflowsStore } from '@/stores/workflows';
import { Workflow } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes';

describe('ParameterInputWrapper.vue', () => {
	const localVue = createLocalVue();
	localVue.use(PiniaVuePlugin);

	const DEFAULT_SETUP = {
		pinia: createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: SETTINGS_STORE_DEFAULT_STATE.settings,
				},
				[STORES.NDV]: {
					activeNodeName: 'Set',
					getters: {
						activeNode: () => ({ name: 'Set', parameters: {} }),
					},
				},
				[STORES.WORKFLOWS]: {
					workflow: {
						nodes: [{ name: 'Set', parameters: {} }],
						connections: {},
					},
					actions: {
						getCurrentWorkflow: () => ({ hello: 123 }),
					},
				},
				[STORES.NODE_TYPES]: {
					nodeTypes: {}, // @TODO
				},
			},
		}),
		props: {
			activeDrop: false,
			documentationUrl: undefined,
			droppable: false,
			errorHighlight: false,
			eventSource: undefined,
			forceShowExpression: false,
			hideIssues: false,
			hint: '',
			inputSize: 'small',
			isForCredential: false,
			isReadOnly: false,
			parameter: {
				default: 'propertyName',
				description:
					'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
				displayName: 'Name',
				name: 'name',
				requiresDataPath: 'single',
				type: 'string',
			},
			path: 'parameters.values.string[0].name',
			value: '={{ "" }}',
		},
		mocks: {
			$locale: {
				baseText() {
					return '';
				},
			},
			$store: {
				getters: {},
			},
		},
	};

	it('renders json values properly', () => {
		vi.mocked(useWorkflowsStore().getCurrentWorkflow).mockReturnValue(
			new Workflow({ ...createEmptyWorkflow(), nodes: [{ name: 'Set', parameters: {} }] }),
		);

		render(ParameterInputWrapper, DEFAULT_SETUP, (vue) => vue.use(PiniaVuePlugin));

		expect(screen.getByText('[empty]')).toBeInTheDocument();
	});
});
