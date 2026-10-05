import { nextTick } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import {
	CanvasNodeRenderType,
	type CanvasNodeWebpageRender,
} from '@/features/workflows/canvas/canvas.types';
import { CanvasKey, CanvasNodeKey } from '@/app/constants';
import CanvasNodeWebpage from './CanvasNodeWebpage.vue';

// d3-drag does not run in jsdom, so the stub emits the resize events directly.
// The library names the NodeResizeControl component ResizeControl.
const ResizeControlStub = {
	props: ['nodeId', 'position', 'minWidth', 'minHeight'],
	emits: ['resizeStart', 'resize', 'resizeEnd'],
	template: `<div data-test-id="webpage-resize-control">
		<button data-test-id="resize-start" @click="$emit('resizeStart', {})" />
		<button
			data-test-id="resize"
			@click="$emit('resize', { params: { x: 0, y: 0, width: 650, height: 410, direction: [1, 1] } })"
		/>
		<button data-test-id="resize-end" @click="$emit('resizeEnd', {})" />
	</div>`,
};

const renderComponent = createComponentRenderer(CanvasNodeWebpage, {
	global: {
		stubs: {
			CanvasNodeStatusIcons: true,
			ResizeControl: ResizeControlStub,
		},
	},
});

function renderWebpage({
	selected = false,
	readOnly = false,
	options = {
		html: '<h1>Hello</h1>',
		width: 480,
		height: 320,
		icon: { type: 'icon', name: 'globe' },
	},
	canvas = createCanvasProvide(),
}: {
	selected?: boolean;
	readOnly?: boolean;
	options?: CanvasNodeWebpageRender['options'];
	canvas?: ReturnType<typeof createCanvasProvide>;
} = {}) {
	const nodeProvide = createCanvasNodeProvide({
		id: 'webpage',
		selected,
		readOnly,
		data: {
			name: 'Landing page',
			type: 'n8n-nodes-base.webpage',
			render: { type: CanvasNodeRenderType.Webpage, options },
		},
	});

	const result = renderComponent({
		global: {
			provide: {
				...canvas,
				...nodeProvide,
			},
		},
	});

	return { ...result, node: nodeProvide[String(CanvasNodeKey)] };
}

// The page gets the pointer only after a short delay after selection.
async function waitForSelectionToSettle() {
	vi.runAllTimers();
	await nextTick();
}

beforeEach(() => {
	setActivePinia(createTestingPinia());
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('CanvasNodeWebpage', () => {
	it('should render the page preview', () => {
		const { html } = renderWebpage();

		expect(html()).toMatchSnapshot();
	});

	it('should run the page in a sandbox without same-origin access', () => {
		const { getByTestId } = renderWebpage();

		const frame = getByTestId('canvas-node-webpage-frame');
		const sandbox = frame.getAttribute('sandbox')?.split(' ') ?? [];

		expect(frame).toHaveAttribute('srcdoc', '<h1>Hello</h1>');
		expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
		expect(frame).toHaveAttribute('title', 'Landing page');
		expect(sandbox).toContain('allow-scripts');
		expect(sandbox).not.toContain('allow-same-origin');
		expect(sandbox).not.toContain('allow-modals');
		expect(sandbox.some((token) => token.startsWith('allow-top-navigation'))).toBe(false);
	});

	it('should use the size from the render options', () => {
		const { getByTestId } = renderWebpage({ options: { html: '', width: 640, height: 400 } });

		expect(getByTestId('canvas-node-webpage')).toHaveStyle({ width: '640px', height: '400px' });
	});

	it('should use the default size when the render options have no size', () => {
		const { getByTestId } = renderWebpage({ options: { html: '' } });

		expect(getByTestId('canvas-node-webpage')).toHaveStyle({ width: '480px', height: '320px' });
	});

	describe('interaction', () => {
		it('should keep the page non-interactive when the node is not selected', () => {
			const { getByTestId } = renderWebpage();

			expect(getByTestId('canvas-node-webpage-body')).not.toHaveClass('interactive');
			expect(getByTestId('canvas-node-webpage-body')).not.toHaveClass('nodrag');
		});

		it('should make the page interactive when the node is selected', async () => {
			const { getByTestId } = renderWebpage({ selected: true });
			await waitForSelectionToSettle();

			expect(getByTestId('canvas-node-webpage-body')).toHaveClass(
				'interactive',
				'nodrag',
				'nowheel',
			);
		});

		it('should keep a double click that selects the node on the canvas', async () => {
			const { getByTestId, emitted, node } = renderWebpage();

			node.selected.value = true;
			await nextTick();
			const body = getByTestId('canvas-node-webpage-body');
			expect(body).not.toHaveClass('interactive');

			await fireEvent.dblClick(body);
			expect(emitted('activate')).toEqual([['webpage', expect.any(MouseEvent)]]);

			await waitForSelectionToSettle();
			expect(body).toHaveClass('interactive', 'nodrag', 'nowheel');
		});

		it('should keep the page non-interactive when the canvas is read-only', async () => {
			const { getByTestId } = renderWebpage({ selected: true, readOnly: true });
			await waitForSelectionToSettle();

			expect(getByTestId('canvas-node-webpage-body')).not.toHaveClass('interactive');
		});

		it('should keep the page non-interactive while the pane moves', async () => {
			const canvas = createCanvasProvide();
			canvas[String(CanvasKey)].isPaneMoving.value = true;

			const { getByTestId } = renderWebpage({ selected: true, canvas });
			await waitForSelectionToSettle();

			expect(getByTestId('canvas-node-webpage-body')).not.toHaveClass('interactive');
		});

		it('should keep the page non-interactive while a connection is dragged', async () => {
			const canvas = createCanvasProvide({
				connectingHandle: { nodeId: 'other', handleId: 'outputs/main/0', handleType: 'source' },
			});

			const { getByTestId } = renderWebpage({ selected: true, canvas });
			await waitForSelectionToSettle();

			expect(getByTestId('canvas-node-webpage-body')).not.toHaveClass('interactive');
		});
	});

	describe('resizing', () => {
		it('should not show the resize control when the node is not selected', () => {
			const { queryByTestId } = renderWebpage();

			expect(queryByTestId('webpage-resize-control')).not.toBeInTheDocument();
		});

		it('should not show the resize control when the canvas is read-only', () => {
			const { queryByTestId } = renderWebpage({ selected: true, readOnly: true });

			expect(queryByTestId('webpage-resize-control')).not.toBeInTheDocument();
		});

		it('should emit the size snapped to the grid only when the resize ends', async () => {
			const { getByTestId, emitted } = renderWebpage({ selected: true });
			await waitForSelectionToSettle();

			await fireEvent.click(getByTestId('resize-start'));
			expect(getByTestId('canvas-node-webpage-body')).not.toHaveClass('interactive');

			await fireEvent.click(getByTestId('resize'));
			expect(getByTestId('canvas-node-webpage')).toHaveStyle({ width: '656px', height: '416px' });
			expect(emitted('update')).toBeUndefined();

			await fireEvent.click(getByTestId('resize-end'));
			expect(emitted('update')).toEqual([[{ width: 656, height: 416 }]]);
			expect(getByTestId('canvas-node-webpage-body')).toHaveClass('interactive');
		});

		it('should reset the resize state when the resize control hides during a resize', async () => {
			const { getByTestId, queryByTestId, emitted, node } = renderWebpage({ selected: true });
			await waitForSelectionToSettle();

			await fireEvent.click(getByTestId('resize-start'));
			await fireEvent.click(getByTestId('resize'));

			node.readOnly.value = true;
			await nextTick();
			expect(queryByTestId('webpage-resize-control')).not.toBeInTheDocument();
			expect(getByTestId('canvas-node-webpage')).toHaveStyle({ width: '480px', height: '320px' });

			node.readOnly.value = false;
			await nextTick();
			expect(getByTestId('canvas-node-webpage-body')).toHaveClass('interactive');
			expect(emitted('update')).toBeUndefined();
		});

		it('should not emit an update when the resize did not change the size', async () => {
			const { getByTestId, emitted } = renderWebpage({ selected: true });

			await fireEvent.click(getByTestId('resize-start'));
			await fireEvent.click(getByTestId('resize-end'));

			expect(emitted('update')).toBeUndefined();
		});
	});

	it('should emit "activate" on double click', async () => {
		const { getByTestId, emitted } = renderWebpage();

		await fireEvent.dblClick(getByTestId('canvas-node-webpage'));

		expect(emitted('activate')).toEqual([['webpage', expect.any(MouseEvent)]]);
	});

	it('should emit "open:contextmenu" on right click', async () => {
		const { getByTestId, emitted } = renderWebpage();

		await fireEvent.contextMenu(getByTestId('canvas-node-webpage'));

		expect(emitted('open:contextmenu')).toHaveLength(1);
	});
});
