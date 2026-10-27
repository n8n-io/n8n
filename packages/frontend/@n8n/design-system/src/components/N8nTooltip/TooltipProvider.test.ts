import { mount } from '@vue/test-utils';

import Tooltip from './Tooltip.vue';
import TooltipProvider from './TooltipProvider.vue';

function hover(element: Element) {
	element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
}

function leave(element: Element) {
	element.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
}

describe('N8nTooltipProvider', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it.each([undefined, 500])(
		'shares the skip delay window (%s) across tooltips',
		async (duration) => {
			vi.useFakeTimers();
			const wrapper = mount(TooltipProvider, {
				props: { skipDelayDuration: duration },
				slots: {
					default: {
						components: { Tooltip },
						template: `
						<Tooltip content="First" :teleported="false" :enterable="false"><button>First</button></Tooltip>
						<Tooltip content="Second" :teleported="false" :enterable="false"><button>Second</button></Tooltip>
					`,
					},
				},
			});

			try {
				const [first, second] = wrapper.findAll('[data-grace-area-trigger]');
				hover(first.element);
				await vi.advanceTimersByTimeAsync(699);
				expect(first.attributes('data-state')).toBe('closed');
				await vi.advanceTimersByTimeAsync(1);
				expect(first.attributes('data-state')).toBe('delayed-open');

				leave(first.element);
				await vi.advanceTimersByTimeAsync((duration ?? 2_000) - 1);
				hover(second.element);
				await vi.advanceTimersByTimeAsync(0);
				expect(second.attributes('data-state')).toBe('instant-open');

				leave(second.element);
				await vi.advanceTimersByTimeAsync((duration ?? 2_000) + 1);
				hover(first.element);
				await vi.advanceTimersByTimeAsync(699);
				expect(first.attributes('data-state')).toBe('closed');
				await vi.advanceTimersByTimeAsync(1);
				expect(first.attributes('data-state')).toBe('delayed-open');
			} finally {
				wrapper.unmount();
			}
		},
	);
});
