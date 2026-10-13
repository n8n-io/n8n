import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';

import { CanvasKey } from '@/app/constants';
import { createCanvasProvide } from '@/features/workflows/canvas/__tests__/utils';
import {
	RESULT_CARD_PLACEMENT_STORAGE_KEY,
	connectorFor,
	useCanvasResultCardPlacement,
} from './useCanvasResultCardPlacement';

type Placement = ReturnType<typeof useCanvasResultCardPlacement>;

function setup(options: { zoom?: number; workflowId?: string; nodeId?: string } = {}) {
	let placement!: Placement;
	const workflowId = ref(options.workflowId ?? 'wf');
	const nodeId = ref(options.nodeId ?? 'node');
	const wrapper = mount(
		defineComponent({
			setup() {
				placement = useCanvasResultCardPlacement({ workflowId, nodeId, gap: 28 });
				return () => h('div', { class: 'handle', onPointerdown: placement.startDrag });
			},
		}),
		{
			global: {
				provide: {
					...createCanvasProvide({ viewport: { x: 0, y: 0, zoom: options.zoom ?? 1 } }),
				},
			},
		},
	);
	return { wrapper, placement, workflowId, nodeId, handle: wrapper.find('.handle') };
}

function pointer(type: string, x: number, y: number, pointerId = 1) {
	const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
	Object.assign(event, { clientX: x, clientY: y, pointerId, pointerType: 'mouse', button: 0 });
	return event;
}

beforeEach(() => {
	localStorage.clear();
});

describe('useCanvasResultCardPlacement', () => {
	it('starts at the default slot and reports no movement', () => {
		const { placement } = setup();
		expect(placement.offset.value).toEqual({ x: 0, y: 0 });
		expect(placement.isMoved.value).toBe(false);
		expect(placement.transform.value).toBe('translate(28px, calc(-50% + 0px))');
	});

	it('drags in canvas units, dividing the pointer delta by the zoom', () => {
		const { placement, handle } = setup({ zoom: 2 });
		const el = handle.element as HTMLElement;
		el.dispatchEvent(pointer('pointerdown', 100, 100));
		expect(placement.dragging.value).toBe(true);
		el.dispatchEvent(pointer('pointermove', 160, 40));
		expect(placement.offset.value).toEqual({ x: 30, y: -30 });
		el.dispatchEvent(pointer('pointerup', 160, 40));
		expect(placement.dragging.value).toBe(false);
		expect(placement.isMoved.value).toBe(true);
		expect(placement.transform.value).toBe('translate(58px, calc(-50% + -30px))');
	});

	it('persists the offset per workflow and node and reloads it', () => {
		const first = setup();
		const el = first.handle.element as HTMLElement;
		el.dispatchEvent(pointer('pointerdown', 0, 0));
		el.dispatchEvent(pointer('pointermove', -400, 12));
		el.dispatchEvent(pointer('pointerup', -400, 12));
		expect(JSON.parse(localStorage.getItem(RESULT_CARD_PLACEMENT_STORAGE_KEY) ?? '{}')).toEqual({
			wf: { node: { x: -400, y: 12 } },
		});
		first.wrapper.unmount();

		const again = setup();
		expect(again.placement.offset.value).toEqual({ x: -400, y: 12 });
		again.wrapper.unmount();

		const other = setup({ nodeId: 'other' });
		expect(other.placement.offset.value).toEqual({ x: 0, y: 0 });
	});

	it('ignores pointers other than the one that started the drag', () => {
		const { placement, handle } = setup();
		const el = handle.element as HTMLElement;
		el.dispatchEvent(pointer('pointerdown', 0, 0, 1));
		el.dispatchEvent(pointer('pointermove', 50, 50, 2));
		expect(placement.offset.value).toEqual({ x: 0, y: 0 });
		el.dispatchEvent(pointer('pointerup', 50, 50, 2));
		expect(placement.dragging.value).toBe(true);
	});

	it('resets and forgets the stored offset', () => {
		const { placement } = setup();
		placement.nudge(16, -32);
		expect(placement.isMoved.value).toBe(true);
		expect(localStorage.getItem(RESULT_CARD_PLACEMENT_STORAGE_KEY)).toContain('"x":16');
		placement.reset();
		expect(placement.offset.value).toEqual({ x: 0, y: 0 });
		expect(localStorage.getItem(RESULT_CARD_PLACEMENT_STORAGE_KEY)).toBe('{}');
	});

	it('survives a corrupt store', () => {
		localStorage.setItem(RESULT_CARD_PLACEMENT_STORAGE_KEY, '{"wf":{"node":{"x":"nope"}}}');
		const { placement } = setup();
		expect(placement.offset.value).toEqual({ x: 0, y: 0 });
	});

	it('falls back to zoom 1 without a canvas', () => {
		let placement!: Placement;
		mount(
			defineComponent({
				setup() {
					placement = useCanvasResultCardPlacement({
						workflowId: ref('wf'),
						nodeId: ref('n'),
						gap: 28,
					});
					return () => h('div');
				},
			}),
			{ global: { provide: { [String(CanvasKey)]: undefined } } },
		);
		expect(placement.zoom.value).toBe(1);
	});
});

describe('connectorFor', () => {
	const node = { width: 100, height: 100 };
	const card = { width: 320, height: 200 };

	it('joins the node right edge to the card left edge in the default slot', () => {
		const connector = connectorFor({ x: 0, y: 0 }, 28, node, card);
		expect(connector).not.toBeNull();
		expect(connector?.from).toEqual({ x: -28, y: 100 });
		expect(connector?.to).toEqual({ x: 0, y: 100 });
		expect(connector?.path.startsWith('M-28.0 100.0 C')).toBe(true);
	});

	it('switches to the node top and card bottom when the card is dragged above', () => {
		const connector = connectorFor({ x: -238, y: -300 }, 28, node, card);
		// card is centred above the node: node centre x = -(28 - 238) - 50 = 160 = card centre
		expect(connector?.to).toEqual({ x: 160, y: 200 });
		expect(connector?.from.y).toBeCloseTo(350);
		expect(connector?.from.x).toBeCloseTo(160);
	});

	it('switches to the node left edge when the card is dragged past it', () => {
		const connector = connectorFor({ x: -600, y: 0 }, 28, node, card);
		expect(connector?.from).toEqual({ x: 472, y: 100 });
		expect(connector?.to).toEqual({ x: 320, y: 100 });
	});

	it('draws nothing until both boxes are measured', () => {
		expect(connectorFor({ x: 0, y: 0 }, 28, { width: 0, height: 0 }, card)).toBeNull();
		expect(connectorFor({ x: 0, y: 0 }, 28, node, { width: 0, height: 0 })).toBeNull();
	});
});
