import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import CheckCard from './CheckCard.vue';

const renderComponent = createComponentRenderer(CheckCard);

describe('CheckCard', () => {
	it('renders icon, title, and badge', () => {
		const { getByText, container } = renderComponent({
			props: {
				icon: 'thumbs-up',
				title: 'Helpfulness',
				badge: 'LLM-as-judge',
			},
		});

		expect(getByText('Helpfulness')).toBeInTheDocument();
		expect(getByText('LLM-as-judge')).toBeInTheDocument();
		// `thumbs-up` is the N8nIcon name; the rendered SVG carries the same id.
		expect(container.querySelector('[class*="icon"]')).toBeTruthy();
	});

	it('emits toggle on click and keyboard activation', async () => {
		const { emitted, getByRole } = renderComponent({
			props: {
				icon: 'thumbs-up',
				title: 'Helpfulness',
			},
		});

		const card = getByRole('button');
		await userEvent.click(card);
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(' ');

		expect(emitted('toggle')).toHaveLength(3);
	});

	// The readonly contract is what makes CheckCard reusable inside the canvas
	// info card — the same component should render but stay completely
	// inert. Asserting on the absence of the click handler / button role
	// prevents an accidental future change to the click semantics from
	// re-introducing interactivity in the info-card preview.
	it('is inert when `readonly` is set', async () => {
		const { emitted, container } = renderComponent({
			props: {
				icon: 'thumbs-up',
				title: 'Helpfulness',
				readonly: true,
				selected: true,
			},
		});

		// No `role=button` and no `tabindex` → not focusable / not activatable.
		expect(container.querySelector('[role="button"]')).toBeNull();
		expect(container.querySelector('[tabindex="0"]')).toBeNull();

		const root = container.firstElementChild;
		if (root) await userEvent.click(root);
		expect(emitted('toggle')).toBeUndefined();
	});

	// `readonly` also suppresses the selected check-mark — the info card
	// shouldn't display a "selected" affordance because the user can't
	// actually select things from the preview.
	it('hides the selected check-mark when `readonly` is set', () => {
		const { container } = renderComponent({
			props: {
				icon: 'thumbs-up',
				title: 'Helpfulness',
				selected: true,
				readonly: true,
			},
		});

		// The check-mark span carries `aria-hidden="true"` to keep screen readers
		// quiet, so we assert on that element directly.
		expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
	});

	it('renders the remove button when `removable` and emits `remove` on click', async () => {
		const onRemove = vi.fn();
		const { emitted, getByTestId } = renderComponent({
			props: {
				icon: 'code',
				title: 'My custom check',
				removable: true,
				removeAriaLabel: 'Remove custom check',
				removeTestId: 'remove-btn',
				selected: true,
			},
			global: {
				config: {
					warnHandler() {},
				},
			},
		});

		const removeBtn = getByTestId('remove-btn');
		await userEvent.click(removeBtn);

		expect(emitted('remove')).toHaveLength(1);
		expect(onRemove).not.toHaveBeenCalled(); // sanity: emitted, not the callback
	});

	// Clicking the remove button must NOT bubble up and toggle the card —
	// otherwise removing a custom check from the wizard would also deselect
	// it on the way out, racing the store's remove action.
	it('stops click propagation on the remove button so it does not also toggle the card', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				icon: 'code',
				title: 'My custom check',
				removable: true,
				removeTestId: 'remove-btn',
				selected: true,
			},
		});

		await userEvent.click(getByTestId('remove-btn'));
		expect(emitted('remove')).toHaveLength(1);
		expect(emitted('toggle')).toBeUndefined();
	});
});
