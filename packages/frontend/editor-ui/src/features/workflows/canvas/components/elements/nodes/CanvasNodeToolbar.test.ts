import { ref } from 'vue';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import CanvasNodeToolbar from './CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger, mockedStore } from '@/__tests__/utils';
import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '../../../canvas.types';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { EditorEnabledFeaturesKey } from '@/app/constants/injectionKeys';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import { useSettingsStore } from '@/app/stores/settings.store';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>()),
	injectCanvasRenderData: vi.fn(() => ({
		value: {
			nodeInputsByNodeId: new Map(),
			nodeOutputsByNodeId: new Map(),
			pinnedDataByNodeName: {},
			executionIssuesByNodeName: new Map(),
		},
	})),
}));

const renderComponent = createComponentRenderer(CanvasNodeToolbar);

describe('CanvasNodeToolbar', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render execute node button when renderType is not configuration', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should render disabled execute node button when canvas is executing', () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide({
						isExecuting: true,
					}),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeDisabled();
	});

	it('should render disabled execute node button when node is deactivated', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							disabled: true,
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		const button = getByTestId('execute-node-button');
		expect(button).toBeDisabled();

		// Verify tooltip shows deactivated message on hover
		await hoverTooltipTrigger(button);
		await waitFor(() => expect(getTooltip()).toHaveTextContent('deactivated'));
	});

	it('should not render execute node button when renderType is configuration', async () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.Default,
								options: { configuration: true },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should emit "run" when execute node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('execute-node-button'));

		expect(emitted('run')[0]).toEqual([]);
	});

	it('should emit "toggle" when disable node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('disable-node-button'));

		expect(emitted('toggle')[0]).toEqual([]);
	});

	it('should emit "delete" when delete node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('delete-node-button'));

		expect(emitted('delete')[0]).toEqual([]);
	});

	it('should emit "open:contextmenu" when overflow node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('overflow-node-button'));

		expect(emitted('open:contextmenu')[0]).toEqual([expect.any(MouseEvent)]);
	});

	it('should emit "update" when sticky note color is changed', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.StickyNote,
								options: { color: 3 },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('change-sticky-color'));

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		await userEvent.click(screen.getAllByTestId('color')[0]);

		expect(emitted('update')[0]).toEqual([{ color: 1 }]);
	});

	it('should show execute button when readOnly is true and canExecute is true', () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: {
				readOnly: true,
				canExecute: true,
				showStatusIcons: false,
				itemsClass: '',
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should hide execute button when readOnly is true and canExecute is false', () => {
		const { queryByTestId } = renderComponent({
			pinia,
			props: {
				readOnly: true,
				canExecute: false,
				showStatusIcons: false,
				itemsClass: '',
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should hide delete and disable buttons when readOnly is true regardless of canExecute', () => {
		const { queryByTestId } = renderComponent({
			pinia,
			props: {
				readOnly: true,
				canExecute: true,
				showStatusIcons: false,
				itemsClass: '',
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		expect(queryByTestId('delete-node-button')).not.toBeInTheDocument();
		expect(queryByTestId('disable-node-button')).not.toBeInTheDocument();
	});

	it('should have "forceVisible" class when hovered', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
					...createCanvasProvide(),
				},
			},
		});

		const toolbar = getByTestId('canvas-node-toolbar');

		await userEvent.hover(toolbar);

		expect(toolbar).toHaveClass('forceVisible');
	});

	describe('Add to AI button', () => {
		// The focused-nodes experiment and the instance-wide AI flags gate the
		// button; enable both so only the per-editor host override varies.
		const setupAiStores = () => {
			const testingPinia = createTestingPinia();
			setActivePinia(testingPinia);
			mockedStore(useFocusedNodesStore).isFeatureEnabled = true;
			mockedStore(useSettingsStore).isAiAssistantEnabled = true;
			return testingPinia;
		};

		it('should show when the focused-nodes feature is on and no host restricts AI', () => {
			const { getByTestId } = renderComponent({
				pinia: setupAiStores(),
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
					},
				},
			});

			expect(getByTestId('add-to-ai-button')).toBeInTheDocument();
		});

		it('should hide when the editor host disables AI (per-editor override)', () => {
			const { queryByTestId } = renderComponent({
				pinia: setupAiStores(),
				global: {
					provide: {
						...createCanvasNodeProvide(),
						...createCanvasProvide(),
						[EditorEnabledFeaturesKey]: ref({
							aiAssistant: false,
							aiBuilder: false,
							askAi: false,
						}),
					},
				},
			});

			expect(queryByTestId('add-to-ai-button')).not.toBeInTheDocument();
		});
	});

	it('should have "forceVisible" class when sticky color picker is visible', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.StickyNote,
								options: { color: 3 },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		const toolbar = getByTestId('canvas-node-toolbar');

		await userEvent.click(getByTestId('change-sticky-color'));

		await waitFor(() => expect(toolbar).toHaveClass('forceVisible'));
	});
});
