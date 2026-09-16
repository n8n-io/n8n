import { nextTick } from 'vue';
import type { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createTestingPinia } from '@pinia/testing';
import type { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { useSettingsStore } from '@n8n/stores/settings.store';
import ParameterInputFull from './ParameterInputFull.vue';
import { FROM_AI_AUTO_GENERATED_MARKER } from 'n8n-workflow';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestNodeProperties } from '@/__tests__/mocks';
import { parameterInputRegistry } from '@n8n/frontend-module-sdk';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

let mockNdvState: Partial<ReturnType<typeof useNDVStore>>;
let mockNodeTypesState: Writeable<Partial<ReturnType<typeof useNodeTypesStore>>>;
let mockSettingsState: Writeable<Partial<ReturnType<typeof useSettingsStore>>>;

beforeEach(() => {
	mockNdvState = {
		hasInputData: true,
		activeNode: {
			id: '123',
			name: 'myParam',
			parameters: {},
			position: [0, 0],
			type: 'test',
			typeVersion: 1,
		},
		isInputPanelEmpty: false,
		isOutputPanelEmpty: false,
		ndvInputDataWithPinnedData: [],
		getHoveringItem: undefined,
		expressionOutputItemIndex: 0,
		isTableHoverOnboarded: false,
		setHighlightDraggables: vi.fn(),
	};
	mockNodeTypesState = {
		allNodeTypes: [],
		getNodeType: vi.fn().mockReturnValue({}),
		getAllNodeTypes: vi.fn().mockReturnValue({
			nodeTypes: {},
			init: async () => {},
			getByNameAndVersion: () => undefined,
		}),
	};
	mockSettingsState = {
		settings: {
			releaseChannel: 'stable',
		} as never,
		isEnterpriseFeatureEnabled: { externalSecrets: false } as never,
	};
});

vi.mock('@/features/ndv/shared/ndv.store', () => {
	return {
		useNDVStore: vi.fn(() => mockNdvState),
		injectNDVStore: vi.fn(() => ({ value: mockNdvState })),
		injectNDVStoreIfProvided: vi.fn(() => ({ value: mockNdvState })),
	};
});

vi.mock('@/app/stores/nodeTypes.store', () => {
	return {
		useNodeTypesStore: vi.fn(() => mockNodeTypesState),
	};
});

vi.mock('@n8n/stores/settings.store', () => {
	return {
		useSettingsStore: vi.fn(() => mockSettingsState),
	};
});

const renderComponent = createComponentRenderer(ParameterInputFull, {
	pinia: createTestingPinia(),
	props: {
		path: 'myParam',
		value: '',
		parameter: createTestNodeProperties({
			displayName: 'My Param',
			name: 'myParam',
			type: 'string',
		}),
	},
});

describe('ParameterInputFull.vue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render basic parameter', async () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('parameter-input')).toBeInTheDocument();
	});

	it('should render parameter with override button inline', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId } = renderComponent();
		expect(getByTestId('parameter-input')).toBeInTheDocument();
		expect(getByTestId('from-ai-override-button')).toBeInTheDocument();
	});

	it('does not offer a model override when disabled', () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { queryByTestId } = renderComponent({ props: { disableFromAi: true } });

		expect(queryByTestId('from-ai-override-button')).not.toBeInTheDocument();
	});

	it('should render parameter with override button in options', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId } = renderComponent({
			props: {
				value: `={{
					'and the air is free'


				}}`,
			},
		});
		expect(getByTestId('parameter-input')).toBeInTheDocument();
		expect(getByTestId('from-ai-override-button')).toBeInTheDocument();
	});

	it('should render parameter with active override', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { queryByTestId, getByTestId } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
				disableFromAi: true,
			},
		});
		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(queryByTestId('override-button')).not.toBeInTheDocument();
	});

	it('shows external validation issues in the parameter row', () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
				disableFromAi: true,
				externalIssues: ["The model can't set the URL. Enter a fixed URL."],
			},
		});

		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(getByTestId('parameter-issues')).toBeInTheDocument();
	});

	it('should render an existing fromAI override for static options parameters', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { queryByTestId, getByTestId } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('priorityId', 'Priority value', 'number') }}`,
				parameter: createTestNodeProperties({
					displayName: 'Priority',
					name: 'priorityId',
					type: 'options',
					options: [
						{ name: 'Urgent', value: 1 },
						{ name: 'No Priority', value: 0 },
					],
				}),
			},
		});

		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(queryByTestId('parameter-input')).not.toBeInTheDocument();
		expect(queryByTestId('from-ai-override-button')).not.toBeInTheDocument();
	});

	it('should not render an existing fromAI override for dynamic options parameters', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { queryByTestId, getByTestId } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('teamId', 'Team ID', 'string') }}`,
				parameter: createTestNodeProperties({
					displayName: 'Team',
					name: 'teamId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getTeams',
					},
				}),
			},
		});

		expect(queryByTestId('fromAI-override-field')).not.toBeInTheDocument();
		expect(getByTestId('parameter-input')).toBeInTheDocument();
	});

	it('should emit on wrapper hover', async () => {
		const { getByTestId, emitted } = renderComponent();
		const wrapper = getByTestId('input-label');

		await fireEvent.mouseEnter(wrapper);
		await nextTick();

		expect(emitted().hover).toEqual([[true]]);

		await fireEvent.mouseLeave(wrapper);
		await nextTick();

		expect(emitted().hover).toEqual([[true], [false]]);
	});

	// Guards the three capability reads in this component. Each test pairs a baseline
	// with the flag set, so reverting a read back to the literal
	// `isResourceLocator` list flips the flagged case and fails here.
	describe('module-contributed capabilities', () => {
		const contributedInput = { render: () => null };

		const asAiToolNode = () => {
			mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
				codex: { categories: ['AI'], subcategories: { AI: ['Tools'] } },
			});
		};

		afterEach(() => {
			parameterInputRegistry.clear();
		});

		describe('ownsFromAiOverride', () => {
			it('offers the from-AI override to a contributed input that does not claim it', () => {
				asAiToolNode();
				parameterInputRegistry.register({ type: 'string', component: contributedInput });

				const { getByTestId } = renderComponent();

				expect(getByTestId('from-ai-override-button')).toBeInTheDocument();
			});

			it('hides the shell override when the contributed input owns it', () => {
				asAiToolNode();
				parameterInputRegistry.register({
					type: 'string',
					component: contributedInput,
					capabilities: { ownsFromAiOverride: true },
				});

				const { queryByTestId } = renderComponent();

				expect(queryByTestId('from-ai-override-button')).not.toBeInTheDocument();
			});
		});

		describe('disableDrop', () => {
			// `DraggableTarget` only reports `droppable` mid-drag, and that flag reaches
			// the DOM as the `droppable` class on the parameter input.
			const startMappingDrag = () => {
				mockNdvState.isDraggableDragging = true;
				mockNdvState.draggableType = 'mapping';
				mockNdvState.draggable = {
					isDragging: true,
					type: 'mapping',
					data: '',
					dimensions: { width: 0, height: 0 },
					activeTarget: null,
					stickyPosition: null,
				} as never;
				mockNdvState.setDraggableTarget = vi.fn();
			};

			it('accepts a drop for a contributed input that does not disable it', () => {
				startMappingDrag();
				parameterInputRegistry.register({ type: 'string', component: contributedInput });

				const { container } = renderComponent();

				expect(container.querySelector('.droppable')).toBeInTheDocument();
			});

			it('refuses the drop when the contributed input disables it', () => {
				startMappingDrag();
				parameterInputRegistry.register({
					type: 'string',
					component: contributedInput,
					capabilities: { disableDrop: true },
				});

				const { container } = renderComponent();

				expect(container.querySelector('.droppable')).not.toBeInTheDocument();
			});
		});

		describe('ownsExpressionRendering', () => {
			// A list-only parameter is where the two paths diverge: the flagged path
			// derives the selector from the modes, the default path does not look at them.
			const listOnlyParameter = createTestNodeProperties({
				displayName: 'My Param',
				name: 'myParam',
				type: 'string',
				modes: [{ displayName: 'From list', name: 'list', type: 'list' }],
			});

			it('keeps the expression selector for a contributed input that does not own expression rendering', () => {
				parameterInputRegistry.register({ type: 'string', component: contributedInput });

				const { getByTestId } = renderComponent({
					props: { parameter: listOnlyParameter, displayOptions: true },
				});

				expect(getByTestId('radio-button-expression')).toBeInTheDocument();
			});

			it('drops the expression selector for a list-only parameter when the input owns expression rendering', () => {
				parameterInputRegistry.register({
					type: 'string',
					component: contributedInput,
					capabilities: { ownsExpressionRendering: true },
				});

				const { queryByTestId } = renderComponent({
					props: { parameter: listOnlyParameter, displayOptions: true },
				});

				expect(queryByTestId('radio-button-expression')).not.toBeInTheDocument();
			});
		});
	});
});
