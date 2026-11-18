import { defineComponent, h, useTemplateRef } from 'vue';
import { render } from '@testing-library/vue';

import { useFocusEntry } from './useFocusEntry';

const Panel = defineComponent({
	setup() {
		useFocusEntry(useTemplateRef<HTMLElement>('panel'));
		return () =>
			h('div', [
				h('button', { 'data-test-id': 'outside' }),
				h('div', { ref: 'panel' }, [h('button', { 'data-test-id': 'inside' })]),
			]);
	},
});

function leaveFocus(from: HTMLElement, to: HTMLElement): void {
	from.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }));
}

describe('useFocusEntry', () => {
	const seenByDocument = vi.fn();

	beforeEach(() => {
		seenByDocument.mockClear();
		document.addEventListener('focusout', seenByDocument);
	});

	afterEach(() => {
		document.removeEventListener('focusout', seenByDocument);
	});

	it('should hide a move of the focus into the element from the document', () => {
		const { getByTestId } = render(Panel);

		leaveFocus(getByTestId('outside'), getByTestId('inside'));

		expect(seenByDocument).not.toHaveBeenCalled();
	});

	it('should keep a move of the focus to another place visible', () => {
		const { getByTestId } = render(Panel);

		leaveFocus(getByTestId('inside'), getByTestId('outside'));

		expect(seenByDocument).toHaveBeenCalledTimes(1);
	});

	it('should stop when the element is unmounted', () => {
		const { getByTestId, unmount } = render(Panel);
		const outside = getByTestId('outside');
		const inside = getByTestId('inside');
		unmount();
		document.body.append(outside, inside);

		leaveFocus(outside, inside);

		expect(seenByDocument).toHaveBeenCalledTimes(1);
	});
});
