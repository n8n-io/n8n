import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import PolicySelectionBar from './PolicySelectionBar.vue';

const renderComponent = createComponentRenderer(PolicySelectionBar);

const setup = (props: Partial<{ count: number; canRestrict: boolean; canAllow: boolean }> = {}) =>
	renderComponent({ props: { count: 2, canRestrict: true, canAllow: true, ...props } });

describe('PolicySelectionBar', () => {
	it('shows the count and the actions in a named group', () => {
		const { getByRole, getByText } = setup();

		expect(getByRole('group', { name: 'Actions for the selected rows' })).toBeInTheDocument();
		expect(getByText('2 rows selected')).toBeInTheDocument();
		expect(getByRole('button', { name: 'Restrict' })).not.toHaveAttribute('aria-disabled');
		expect(getByRole('button', { name: 'Allow' })).not.toHaveAttribute('aria-disabled');
	});

	it('emits the action that the admin picks', async () => {
		const { getByRole, emitted } = setup();

		await userEvent.click(getByRole('button', { name: 'Restrict' }));
		await userEvent.click(getByRole('button', { name: 'Allow' }));
		await userEvent.click(getByRole('button', { name: 'Clear selection' }));

		expect(emitted('restrict')).toHaveLength(1);
		expect(emitted('allow')).toHaveLength(1);
		expect(emitted('clear')).toHaveLength(1);
	});

	it('disables an action that would change no selected row', () => {
		const { getByRole } = setup({ canAllow: false });

		expect(getByRole('button', { name: 'Allow' })).toHaveAttribute('aria-disabled', 'true');
		expect(getByRole('button', { name: 'Restrict' })).not.toHaveAttribute('aria-disabled');
	});

	it('clears the selection on Escape', async () => {
		const { getByRole, emitted } = setup();

		getByRole('button', { name: 'Allow' }).focus();
		await userEvent.keyboard('{Escape}');

		expect(emitted('clear')).toHaveLength(1);
	});

	it('keeps the status region when the bar hides, and announces each count', async () => {
		const { getByRole, queryByRole, rerender } = setup({ count: 0 });
		const status = getByRole('status');
		expect(status).toBeEmptyDOMElement();
		expect(queryByRole('group')).not.toBeInTheDocument();

		await rerender({ count: 1 });
		expect(status).toHaveTextContent('1 row selected');

		await rerender({ count: 0 });
		expect(getByRole('status')).toBe(status);
		expect(status).toHaveTextContent('Selection cleared');
	});
});
