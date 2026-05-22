import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CanvasNodeToolbar from './CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import {
	createCanvasNodeToolbarProps,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '../../../canvas.types';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

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
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should render disabled execute node button when canvas is executing', () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide({ isExecuting: true }),
			},
		});

		expect(getByTestId('execute-node-button')).toBeDisabled();
	});

	it('should render disabled execute node button when node is deactivated', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps({ data: { disabled: true } }),
			global: {
				provide: createCanvasProvide(),
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
			props: createCanvasNodeToolbarProps({
				data: {
					render: {
						type: CanvasNodeRenderType.Default,
						options: { configuration: true },
					},
				},
			}),
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should emit "run" when execute node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide(),
			},
		});

		await userEvent.click(getByTestId('execute-node-button'));

		expect(emitted('run')[0]).toEqual([]);
	});

	it('should emit "toggle" when disable node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide(),
			},
		});

		await userEvent.click(getByTestId('disable-node-button'));

		expect(emitted('toggle')[0]).toEqual([]);
	});

	it('should emit "delete" when delete node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide(),
			},
		});

		await userEvent.click(getByTestId('delete-node-button'));

		expect(emitted('delete')[0]).toEqual([]);
	});

	it('should emit "open:contextmenu" when overflow node button is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide(),
			},
		});

		await userEvent.click(getByTestId('overflow-node-button'));

		expect(emitted('open:contextmenu')[0]).toEqual([expect.any(MouseEvent)]);
	});

	it('should emit "update" when sticky note color is changed', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps({
				data: {
					render: {
						type: CanvasNodeRenderType.StickyNote,
						options: { color: 3 },
					},
				},
			}),
			global: {
				provide: createCanvasProvide(),
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
			props: createCanvasNodeToolbarProps({ readOnly: true, canExecute: true }),
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(getByTestId('execute-node-button')).toBeInTheDocument();
	});

	it('should hide execute button when readOnly is true and canExecute is false', () => {
		const { queryByTestId } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps({ readOnly: true, canExecute: false }),
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(queryByTestId('execute-node-button')).not.toBeInTheDocument();
	});

	it('should hide delete and disable buttons when readOnly is true regardless of canExecute', () => {
		const { queryByTestId } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps({ readOnly: true, canExecute: true }),
			global: {
				provide: createCanvasProvide(),
			},
		});

		expect(queryByTestId('delete-node-button')).not.toBeInTheDocument();
		expect(queryByTestId('disable-node-button')).not.toBeInTheDocument();
	});

	it('should have "forceVisible" class when hovered', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps(),
			global: {
				provide: createCanvasProvide(),
			},
		});

		const toolbar = getByTestId('canvas-node-toolbar');

		await userEvent.hover(toolbar);

		expect(toolbar).toHaveClass('forceVisible');
	});

	it('should have "forceVisible" class when sticky color picker is visible', async () => {
		const { getByTestId } = renderComponent({
			pinia,
			props: createCanvasNodeToolbarProps({
				data: {
					render: {
						type: CanvasNodeRenderType.StickyNote,
						options: { color: 3 },
					},
				},
			}),
			global: {
				provide: createCanvasProvide(),
			},
		});

		const toolbar = getByTestId('canvas-node-toolbar');

		await userEvent.click(getByTestId('change-sticky-color'));

		await waitFor(() => expect(toolbar).toHaveClass('forceVisible'));
	});
});
