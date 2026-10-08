import { screen } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import StableButtonLabel from '../components/StableButtonLabel.vue';

const LABELS = ['Check connection', 'Checking…'];

// A plain button, so the test checks what assistive technology gets from the label.
const InButton = defineComponent({
	props: { label: { type: String, required: true } },
	setup(props) {
		return () =>
			h('button', { type: 'button' }, [
				h(StableButtonLabel, { label: props.label, labels: LABELS }),
			]);
	},
});

const renderButton = createComponentRenderer(InButton);

describe('StableButtonLabel', () => {
	it.each(LABELS)('gives the button only the current text "%s" as its name', (label) => {
		renderButton({ props: { label } });

		expect(screen.getByRole('button')).toHaveAccessibleName(label);
	});

	it('keeps every text in the button, hidden from screen readers, to reserve the width', () => {
		renderButton({ props: { label: 'Checking…' } });

		const reserved = screen
			.getByRole('button')
			.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
		expect(Array.from(reserved, (element) => element.textContent?.trim())).toEqual(LABELS);
	});

	it('changes the visible text in place, so a live region reads the new text', async () => {
		const { rerender } = renderButton({ props: { label: 'Check connection' } });

		await rerender({ label: 'Checking…' });

		expect(screen.getByRole('button')).toHaveAccessibleName('Checking…');
		expect(screen.getByRole('button').querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
	});
});
