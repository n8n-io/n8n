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

	it('keeps explicit input modes separate from the parameter value', async () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const {
			findByDisplayValue,
			getByRole,
			getByText,
			getByTestId,
			queryByTestId,
			emitted,
			rerender,
		} = renderComponent({
			props: { inputMode: 'fixed', value: '=literal', displayOptions: true },
		});

		expect(await findByDisplayValue('=literal')).toBeInTheDocument();

		await fireEvent.click(getByText('Expression'));
		expect(emitted()['update:inputMode']).toEqual([['expression']]);

		await fireEvent.click(getByTestId('from-ai-override-button'));
		expect(emitted()['update:inputMode']).toEqual([['expression'], ['ai']]);
		expect(emitted().update).toBeUndefined();

		await rerender({ inputMode: 'ai' });
		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(queryByTestId('selectable-list-selectable-description')).not.toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: 'Edit value' }));
		expect(emitted()['update:inputMode']).toEqual([['expression'], ['ai'], ['fixed']]);
		expect(emitted().update).toBeUndefined();

		await rerender({
			inputMode: undefined,
			value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
		});
		expect(getByTestId('selectable-list-selectable-description')).toBeInTheDocument();
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
		const { queryByTestId, getByTestId, getByRole, emitted } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
				disableFromAi: true,
			},
		});
		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(queryByTestId('override-button')).not.toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: 'Edit value' }));
		expect(emitted().update).toEqual([[{ node: 'myParam', name: 'myParam', value: '' }]]);
	});

	it('keeps validation issues visible in read-only parameters', () => {
		mockNodeTypesState.getNodeType = vi.fn().mockReturnValue({
			codex: {
				categories: ['AI'],
				subcategories: { AI: ['Tools'] },
			},
		});
		const { getByTestId, queryByRole } = renderComponent({
			props: {
				value: `={{ ${FROM_AI_AUTO_GENERATED_MARKER} $fromAI('myParam') }}`,
				disableFromAi: true,
				isReadOnly: true,
				externalIssues: ["The model can't set the URL. Enter a fixed URL."],
			},
		});

		expect(getByTestId('fromAI-override-field')).toBeInTheDocument();
		expect(getByTestId('parameter-issues')).toBeInTheDocument();
		expect(queryByRole('button', { name: 'Edit value' })).not.toBeInTheDocument();
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

	// KNO-13: a drop on a fixed field with `requiresDataPath: 'multiple'` (for example
	// "Fields To Include" in the Aggregate node) appends ", <field>" to the value. While
	// the user hovers, the drag ghost must snap to where the value lands, after the
	// existing text, and not on top of it.
	describe('drag ghost position on a fixed multiple-fields input', () => {
		const inputRect = { left: 100, top: 200, width: 300, height: 30 };
		const charWidth = 6;
		const ghostWidth = 40;
		const ghostHeight = 20;
		const fieldStyle = {
			paddingLeft: '11px',
			borderLeftWidth: '1px',
			paddingTop: '4px',
			borderTopWidth: '1px',
			lineHeight: '18px',
		};
		const textStartX = 11 + 1;
		const textStartY = 4 + 1;
		const lineHeight = 18;

		const fieldsParameter = createTestNodeProperties({
			displayName: 'Fields To Include',
			name: 'fieldsToInclude',
			type: 'string',
			default: '',
			requiresDataPath: 'multiple',
		});

		beforeEach(() => {
			// jsdom has no text layout, so give each character a fixed width
			vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
				font: '',
				measureText: (text: string) => ({ width: text.length * charWidth }),
			} as never);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const startMappingDrag = () => {
			mockNdvState.isDraggableDragging = true;
			mockNdvState.draggableType = 'mapping';
			mockNdvState.draggable = {
				isDragging: true,
				type: 'mapping',
				data: '{{ $json.age }}',
				dimensions: { width: ghostWidth, height: ghostHeight },
				activeTarget: null,
				stickyPosition: null,
			} as never;
			mockNdvState.setDraggableTarget = vi.fn();
		};

		const hoverDropTarget = async (
			value: string,
			{
				parameter = fieldsParameter,
				rect = inputRect,
			}: { parameter?: typeof fieldsParameter; rect?: typeof inputRect } = {},
		) => {
			startMappingDrag();
			const { getByTestId } = renderComponent({
				props: { path: parameter.name, parameter, value },
			});

			// jsdom applies no stylesheet, so give the field fixed box metrics
			const field = document.querySelector<HTMLElement>('input, textarea');
			if (field) {
				Object.assign(field.style, fieldStyle);
			}

			// The DraggableTarget root is the direct child of the input label
			const inputLabel = getByTestId('input-label');
			let dropTarget = getByTestId('parameter-input');
			while (dropTarget.parentElement && dropTarget.parentElement !== inputLabel) {
				dropTarget = dropTarget.parentElement;
			}
			vi.spyOn(dropTarget, 'getBoundingClientRect').mockReturnValue({
				...rect,
				x: rect.left,
				y: rect.top,
				right: rect.left + rect.width,
				bottom: rect.top + rect.height,
				toJSON: () => ({}),
			});

			await fireEvent.mouseEnter(dropTarget);
			await nextTick();

			const calls = vi.mocked(mockNdvState.setDraggableTarget!).mock.calls;
			const target = calls[calls.length - 1]?.[0];
			expect(target).toBeTruthy();
			return target!.stickyPosition;
		};

		it('snaps the ghost to the start of an empty field', async () => {
			const stickyPosition = await hoverDropTarget('');

			expect(stickyPosition).toEqual([inputRect.left + 3, inputRect.top + 3]);
		});

		it('snaps the ghost after the existing fields, not over them', async () => {
			const stickyPosition = await hoverDropTarget('name, email');

			expect(stickyPosition).not.toBeNull();
			// The ghost must not cover the existing "name, email" text at the start of the input
			expect(stickyPosition![0]).toBeGreaterThan(inputRect.left + 3);
			// The drop appends ", <field>", so the ghost sits where the new field lands
			expect(stickyPosition).toEqual([
				inputRect.left + textStartX + 'name, email, '.length * charWidth,
				inputRect.top + 3,
			]);
		});

		it('snaps the ghost after the last line of a multiline value', async () => {
			const textareaRect = { ...inputRect, height: 100 };
			const stickyPosition = await hoverDropTarget('name,\nemail', { rect: textareaRect });

			expect(document.querySelector('textarea')).not.toBeNull();
			expect(stickyPosition).toEqual([
				textareaRect.left + textStartX + 'email, '.length * charWidth,
				textareaRect.top + textStartY + lineHeight,
			]);
		});

		it('keeps the ghost inside the textarea when the value has more lines than it shows', async () => {
			const textareaRect = { ...inputRect, height: 100 };
			const stickyPosition = await hoverDropTarget(
				Array.from({ length: 10 }, (_, i) => `field${i}`).join(',\n'),
				{ rect: textareaRect },
			);

			expect(stickyPosition![1]).toBe(textareaRect.top + textareaRect.height - ghostHeight - 3);
		});

		it('keeps the ghost inside the input when the existing fields are wider than it', async () => {
			const stickyPosition = await hoverDropTarget('a'.repeat(200));

			expect(stickyPosition).toEqual([
				inputRect.left + inputRect.width - ghostWidth - 3,
				inputRect.top + 3,
			]);
		});

		it('keeps the ghost at the start of a field whose value is replaced on drop', async () => {
			const stickyPosition = await hoverDropTarget('name', {
				parameter: createTestNodeProperties({
					displayName: 'Field To Split Out',
					name: 'fieldToSplitOut',
					type: 'string',
					default: '',
					requiresDataPath: 'single',
				}),
			});

			expect(stickyPosition).toEqual([inputRect.left + 3, inputRect.top + 3]);
		});
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
