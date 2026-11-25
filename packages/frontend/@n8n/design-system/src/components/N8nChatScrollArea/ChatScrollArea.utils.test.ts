import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAnchoredScrollTop, takeScrollSnapshot } from './ChatScrollArea.utils';

/** Sets fixed scroll values on an element, because jsdom has no layout. */
function setScrollValues(
	element: HTMLElement,
	values: { scrollTop: number; scrollHeight: number },
) {
	Object.defineProperty(element, 'scrollTop', {
		configurable: true,
		writable: true,
		value: values.scrollTop,
	});
	Object.defineProperty(element, 'scrollHeight', {
		configurable: true,
		value: values.scrollHeight,
	});
}

/** Makes `getBoundingClientRect` return a rect with the given `top`. */
function setRectTop(element: Element, top: number) {
	vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
		DOMRect.fromRect({ x: 0, y: top, width: 100, height: 100 }),
	);
}

describe('ChatScrollArea.utils', () => {
	let viewport: HTMLElement;
	let content: HTMLElement;
	let message: HTMLElement;

	beforeEach(() => {
		viewport = document.createElement('div');
		content = document.createElement('div');
		message = document.createElement('p');
		content.appendChild(message);
		viewport.appendChild(content);
		document.body.appendChild(viewport);

		setRectTop(viewport, 0);
		setScrollValues(viewport, { scrollTop: 300, scrollHeight: 1000 });
	});

	afterEach(() => {
		viewport.remove();
		vi.restoreAllMocks();
	});

	describe('takeScrollSnapshot', () => {
		it('should use the content element at the top of the view as the anchor', () => {
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(message);
			setRectTop(message, -20);

			expect(takeScrollSnapshot(viewport, content)).toEqual({
				scrollHeight: 1000,
				scrollTop: 300,
				anchor: message,
				anchorTop: -20,
			});
		});

		it('should not use an element outside the content as the anchor', () => {
			const outside = document.createElement('div');
			document.body.appendChild(outside);
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(outside);

			const snapshot = takeScrollSnapshot(viewport, content);

			expect(snapshot.anchor).toBeUndefined();
			expect(snapshot.anchorTop).toBeUndefined();
			outside.remove();
		});

		it('should have no anchor when no element is at the top of the view', () => {
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);

			expect(takeScrollSnapshot(viewport, content).anchor).toBeUndefined();
		});
	});

	describe('getAnchoredScrollTop', () => {
		it('should move the view by the distance the anchor moved', () => {
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(message);
			setRectTop(message, -20);
			const snapshot = takeScrollSnapshot(viewport, content);

			/** Older messages above push the anchor down by 400px. */
			setRectTop(message, 380);

			expect(getAnchoredScrollTop(snapshot, viewport)).toBe(700);
		});

		it('should ignore content that grows below the anchor', () => {
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(message);
			setRectTop(message, -20);
			const snapshot = takeScrollSnapshot(viewport, content);

			/** A streamed reply below adds height, but the anchor does not move. */
			setScrollValues(viewport, { scrollTop: 300, scrollHeight: 1500 });

			expect(getAnchoredScrollTop(snapshot, viewport)).toBe(300);
		});

		it('should use the change in height when the anchor was removed', () => {
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(message);
			setRectTop(message, -20);
			const snapshot = takeScrollSnapshot(viewport, content);

			message.remove();
			setScrollValues(viewport, { scrollTop: 300, scrollHeight: 1400 });

			expect(getAnchoredScrollTop(snapshot, viewport)).toBe(700);
		});

		it('should use the change in height when there is no anchor', () => {
			vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);
			const snapshot = takeScrollSnapshot(viewport, content);

			setScrollValues(viewport, { scrollTop: 300, scrollHeight: 1250 });

			expect(getAnchoredScrollTop(snapshot, viewport)).toBe(550);
		});
	});
});
