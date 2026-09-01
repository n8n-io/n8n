import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import ConnectionRow from '../ConnectionRow.vue';

const renderComponent = createComponentRenderer(ConnectionRow);

const baseProps = {
	name: 'Brave',
	subtitle: 'Search the web',
	icon: 'plug' as const,
};

describe('ConnectionRow', () => {
	it('opens settings on row click', async () => {
		const { getByText, emitted } = renderComponent({
			props: baseProps,
		});

		await fireEvent.click(getByText('Brave'));

		expect(emitted().openSettings).toHaveLength(1);
	});

	it('stays inert when not clickable', async () => {
		const { getByText, emitted } = renderComponent({
			props: { ...baseProps, clickable: false },
		});

		await fireEvent.click(getByText('Brave'));

		expect(emitted().openSettings).toBeUndefined();
	});

	it('renders the action slot', () => {
		const { getByTestId } = renderComponent({
			props: baseProps,
			slots: { action: '<button data-test-id="slotted-action">Connected</button>' },
		});

		expect(getByTestId('slotted-action')).toBeVisible();
	});

	it('does not open settings when interacting with the action slot', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: baseProps,
			slots: { action: '<button data-test-id="slotted-action">Connected</button>' },
		});

		await fireEvent.click(getByTestId('slotted-action'));

		expect(emitted().openSettings).toBeUndefined();
	});
});
