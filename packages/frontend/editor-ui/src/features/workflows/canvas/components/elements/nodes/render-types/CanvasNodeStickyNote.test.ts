import CanvasNodeStickyNote from './CanvasNodeStickyNote.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { CanvasNodeRenderType, type CanvasNodeEventBusEvents } from '../../../../canvas.types';

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

const renderComponent = createComponentRenderer(CanvasNodeStickyNote);

function defaultProps(overrides: { id?: string; readOnly?: boolean; selected?: boolean } = {}) {
	return {
		id: overrides.id ?? 'sticky',
		selected: overrides.selected ?? false,
		readOnly: overrides.readOnly ?? false,
		render: {
			type: CanvasNodeRenderType.StickyNote as const,
			options: {},
		},
		eventBus: createEventBus<CanvasNodeEventBusEvents>(),
	};
}

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasNodeStickyNote', () => {
	it('should render node correctly', () => {
		const { html } = renderComponent({
			props: defaultProps(),
		});

		expect(html()).toMatchSnapshot();
	});

	it('should disable resizing when node is readonly', () => {
		const { container } = renderComponent({
			props: defaultProps({ readOnly: true }),
		});

		const resizeControls = container.querySelectorAll('.vue-flow__resize-control');

		expect(resizeControls).toHaveLength(0);
	});

	it('should disable sticky options when in edit mode', async () => {
		const { container } = renderComponent({
			props: defaultProps({ readOnly: false }),
		});

		const stickyTextarea = container.querySelector('.sticky-textarea');

		if (!stickyTextarea) return;

		await fireEvent.dblClick(stickyTextarea);

		const stickyOptions = container.querySelector('.sticky-options');

		if (!stickyOptions) return;

		expect(getComputedStyle(stickyOptions).display).toBe('none');
	});

	it('should emit "activate" on double click', async () => {
		const { container, emitted } = renderComponent({
			props: defaultProps(),
		});

		const sticky = container.querySelector('.sticky-textarea');
		if (!sticky) throw new Error('Sticky not found');

		await fireEvent.dblClick(sticky);

		expect(emitted()).toHaveProperty('activate');
	});

	it('should emit "deactivate" on blur', async () => {
		const { container, emitted } = renderComponent({
			props: defaultProps(),
		});

		const sticky = container.querySelector('.sticky-textarea');

		if (!sticky) throw new Error('Sticky not found');

		await fireEvent.dblClick(sticky);

		const stickyTextarea = container.querySelector('.sticky-textarea textarea');
		if (!stickyTextarea) throw new Error('Textarea not found');

		await fireEvent.blur(stickyTextarea);

		expect(emitted()).toHaveProperty('deactivate');
	});
});
