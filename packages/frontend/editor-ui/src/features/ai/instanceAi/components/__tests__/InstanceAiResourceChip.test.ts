import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { describe, it, expect, vi } from 'vitest';
import { renderComponent } from '@/__tests__/render';
import InstanceAiResourceChip from '../InstanceAiResourceChip.vue';

const TEST_ID = 'chip';

// Reka UI opens a tooltip on a mouse pointermove (after the show delay) or at
// once on keyboard focus. The content is teleported, so it is read from the body.
function hover(element: Element) {
	element.dispatchEvent(
		new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerType: 'mouse' }),
	);
}

async function findTooltip() {
	return await waitFor(() => screen.getByTestId('tooltip-content'), { timeout: 2000 });
}

describe('InstanceAiResourceChip', () => {
	it('shows the full label in a tooltip on hover instead of a native title', async () => {
		const { getByTestId, getByText } = renderComponent(InstanceAiResourceChip, {
			props: { label: 'Start Enrichment', testId: TEST_ID },
		});

		expect(getByTestId(TEST_ID).querySelector('[title]')).toBeNull();
		expect(screen.queryByTestId('tooltip-content')).toBeNull();

		hover(getByText('Start Enrichment'));

		expect(await findTooltip()).toHaveTextContent(/^Start Enrichment$/);
	});

	it('renders the breadcrumbs path in the tooltip, ending with the label', async () => {
		const { getByTestId } = renderComponent(InstanceAiResourceChip, {
			props: {
				label: 'Start Enrichment',
				breadcrumbs: ['Leads', 'Enrichment', 'Start Enrichment'],
				testId: TEST_ID,
			},
		});

		await fireEvent.focus(getByTestId(TEST_ID));

		expect(await findTooltip()).toHaveTextContent('Leads > Enrichment > Start Enrichment');
	});

	it('forwards attributes and listeners to the chip root', async () => {
		const onClick = vi.fn();
		const { getByTestId } = renderComponent(InstanceAiResourceChip, {
			props: { label: 'A', testId: TEST_ID },
			attrs: { role: 'group', tabindex: '0', 'aria-label': 'A', onClick },
		});

		const chip = getByTestId(TEST_ID);
		expect(chip).toHaveAttribute('role', 'group');
		expect(chip).toHaveAttribute('tabindex', '0');
		expect(chip).toHaveAttribute('aria-label', 'A');

		await fireEvent.click(chip);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('keeps the remove control labelled for assistive tech without a native title', async () => {
		const { getByTestId, emitted } = renderComponent(InstanceAiResourceChip, {
			props: { label: 'A', removable: true, removeLabel: 'Delete', removeTestId: 'remove' },
		});

		const remove = getByTestId('remove');
		expect(remove).toHaveAttribute('aria-label', 'Delete');
		expect(remove).not.toHaveAttribute('title');

		await fireEvent.click(remove);

		expect(emitted().remove).toHaveLength(1);
	});
});
