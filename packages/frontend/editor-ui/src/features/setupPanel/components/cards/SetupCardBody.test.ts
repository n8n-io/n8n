import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import SetupCardBody from './SetupCardBody.vue';
import type { NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';
import { jsonParse } from 'n8n-workflow';

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: {
		template: `<div data-test-id="parameter-input-list" :data-hidden-issues="JSON.stringify(hiddenIssuesInputs)">
			<button data-test-id="change-param1" @click="$emit('valueChanged', { name: 'param1', value: 'v' })">Change param1</button>
			<button data-test-id="change-param2" @click="$emit('valueChanged', { name: 'param2', value: 'v' })">Change param2</button>
			<button data-test-id="blur-param1" @click="$emit('parameterBlur', 'param1')">Blur param1</button>
			<button data-test-id="blur-param2" @click="$emit('parameterBlur', 'param2')">Blur param2</button>
		</div>`,
		props: [
			'parameters',
			'nodeValues',
			'node',
			'hideDelete',
			'hiddenIssuesInputs',
			'path',
			'optionsOverrides',
			'removeFirstParameterMargin',
			'removeLastParameterMargin',
		],
		emits: ['valueChanged', 'parameterBlur'],
	},
}));

const { mockUpdateNodeProperties } = vi.hoisted(() => ({
	mockUpdateNodeProperties: vi.fn(),
}));

vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: vi.fn(() => ({
		updateNodeProperties: mockUpdateNodeProperties,
	})),
}));

const renderComponent = createComponentRenderer(SetupCardBody);

const NODE_PROPERTIES = [
	{
		name: 'param1',
		displayName: 'Param 1',
		type: 'string' as const,
		required: true,
		default: '',
	},
	{
		name: 'param2',
		displayName: 'Param 2',
		type: 'string' as const,
		required: true,
		default: '',
	},
];

const createState = (overrides: Partial<NodeSetupState> = {}): NodeSetupState => ({
	node: createTestNode({
		name: 'TestNode',
		type: 'n8n-nodes-base.openAi',
		parameters: {},
	}) as INodeUi,
	parameterIssues: { param1: ['Required'], param2: ['Required'] },
	isTrigger: false,
	isComplete: false,
	...overrides,
});

function getHiddenIssues(container: Element): string[] {
	const el = container.querySelector('[data-test-id="parameter-input-list"]');
	return jsonParse<string[]>(el?.getAttribute('data-hidden-issues') ?? '[]', { fallbackValue: [] });
}

describe('SetupCardBody', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		mockUpdateNodeProperties.mockClear();
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ properties: NODE_PROPERTIES });
	});

	describe('hidden issues', () => {
		it('should hide all parameter issues initially', () => {
			const { container } = renderComponent({
				props: { state: createState() },
			});

			expect(getHiddenIssues(container)).toEqual(expect.arrayContaining(['param1', 'param2']));
		});

		it('should reveal parameter issues when a value is changed', async () => {
			const { container, getByTestId } = renderComponent({
				props: { state: createState() },
			});

			await fireEvent.click(getByTestId('change-param1'));

			const hidden = getHiddenIssues(container);
			expect(hidden).not.toContain('param1');
			expect(hidden).toContain('param2');
		});

		it('should reveal parameter issues on blur', async () => {
			const { container, getByTestId } = renderComponent({
				props: { state: createState() },
			});

			await fireEvent.click(getByTestId('blur-param2'));

			const hidden = getHiddenIssues(container);
			expect(hidden).toContain('param1');
			expect(hidden).not.toContain('param2');
		});

		it('should keep revealed state when new parameters appear', async () => {
			const { container, getByTestId, rerender } = renderComponent({
				props: { state: createState() },
			});

			// Reveal param1
			await fireEvent.click(getByTestId('change-param1'));
			expect(getHiddenIssues(container)).not.toContain('param1');

			// Add a new parameter via updated node type properties
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
				properties: [
					...NODE_PROPERTIES,
					{ name: 'param3', displayName: 'Param 3', type: 'string', required: true, default: '' },
				],
			});

			await rerender({
				state: createState({
					parameterIssues: {
						param1: ['Required'],
						param2: ['Required'],
						param3: ['Required'],
					},
				}),
			});

			const hidden = getHiddenIssues(container);
			// param1 was revealed and should stay revealed
			expect(hidden).not.toContain('param1');
			// param2 was never interacted with, stays hidden
			expect(hidden).toContain('param2');
			// param3 is new and should start hidden
			expect(hidden).toContain('param3');
		});
	});
});
