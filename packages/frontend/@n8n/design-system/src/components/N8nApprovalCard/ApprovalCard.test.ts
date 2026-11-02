import { render, fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import N8nApprovalCard, { type ApprovalOption } from './ApprovalCard.vue';
import source from './ApprovalCard.vue?raw';

const OPTIONS: ApprovalOption[] = [
	{ key: 'always-allow', icon: 'check', label: 'Always allow', testId: 'opt-always-allow' },
	{ key: 'allow-once', icon: 'check', label: 'Allow once', testId: 'opt-allow-once' },
	{ key: 'deny', icon: 'ban', label: 'Deny', withArrow: false, testId: 'opt-deny' },
];

describe('N8nApprovalCard', () => {
	it('uses the shared card border token', () => {
		expect(source).toMatch(/\.card\s*\{[^}]*border: var\(--border\);/);
	});
	it('respects withArrow=false on the highlighted option', async () => {
		const { getByTestId } = render(N8nApprovalCard, {
			props: { title: 'Review action', options: OPTIONS },
		});
		const deny = getByTestId('opt-deny');
		deny.focus();
		await waitFor(() => {
			expect(deny).toHaveAttribute('tabindex', '0');
			expect(deny.querySelector('[data-icon="arrow-right"]')).toBeNull();
		});
	});
	it.each([false, true])(
		'shows description-only content after expansion when collapsed=%s',
		async (defaultCollapsed) => {
			const { getByRole, getByText, queryByRole } = render(N8nApprovalCard, {
				props: {
					title: 'Review action',
					description: 'Action details',
					descriptionLabel: 'Details',
					defaultCollapsed,
				},
			});
			if (defaultCollapsed) {
				expect(queryByRole('region', { name: 'Details' })).toBeNull();
				await userEvent.click(getByRole('button', { name: 'Review action' }));
			}
			const region = getByRole('region', { name: 'Details' });
			expect(region).toBeVisible();
			expect(region).toHaveAttribute('tabindex', '0');
			region.focus();
			expect(region).toHaveFocus();
			expect(getByText('Action details')).toBeVisible();
		},
	);

	it('keeps the title visible and hides details when collapsed', () => {
		const { getByText, queryByText, queryByTestId } = render(N8nApprovalCard, {
			props: { title: 'Review action', args: { value: 1 }, defaultCollapsed: true },
			slots: { description: 'Action details', title: 'Tool action' },
		});
		expect(queryByText('Action details')).toBeNull();
		expect(getByText('Tool action')).toBeVisible();
		expect(queryByTestId('approval-card-args')).toBeNull();
	});
	it('labels the choices with the status and visible title slot', () => {
		const { getByRole, getByText } = render(N8nApprovalCard, {
			props: { title: 'Use Calculator' },
			slots: { title: '<span>Agent wants to use Calculator</span>' },
		});
		expect(getByRole('toolbar')).toHaveAccessibleName(
			'Awaiting approval Agent wants to use Calculator',
		);
		expect(getByText('Agent wants to use Calculator')).toBeVisible();
	});

	it.each(['allowed', 'denied'] as const)('uses the saved %s status', (decision) => {
		const { queryByText, getAllByText } = render(N8nApprovalCard, {
			props: { title: 'Use Calculator', decision },
		});
		expect(queryByText('Awaiting approval')).toBeNull();
		expect(getAllByText(decision === 'allowed' ? 'Allowed' : 'Denied')).toHaveLength(2);
	});

	it.each([false, true])('toggles arguments with defaultCollapsed=%s', async (defaultCollapsed) => {
		const { getByRole, getByTestId, queryByTestId, getByText, queryByText, emitted } = render(
			N8nApprovalCard,
			{
				props: {
					title: 'Approval required',
					description: 'Run the tool',
					args: { query: 'Example' },
					defaultCollapsed,
				},
			},
		);
		const trigger = getByRole('button', { name: 'Approval required' });
		expect(trigger).toHaveAttribute('aria-expanded', String(!defaultCollapsed));
		if (defaultCollapsed) expect(queryByTestId('approval-card-args')).toBeNull();
		else {
			const args = getByTestId('approval-card-args');
			expect(args).toBeVisible();
			await waitFor(() =>
				expect(args.parentElement).toHaveAttribute('id', trigger.getAttribute('aria-controls')),
			);
		}

		await userEvent.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', String(defaultCollapsed));
		if (defaultCollapsed) expect(getByTestId('approval-card-args')).toBeVisible();
		else expect(queryByTestId('approval-card-args')).toBeNull();
		if (defaultCollapsed) expect(getByText('Run the tool')).toBeVisible();
		else expect(queryByText('Run the tool')).toBeNull();
		await userEvent.click(getByRole('button', { name: 'Allow once' }));
		expect(emitted('select')).toEqual([['allow-once']]);
	});

	it.each([false, true])(
		'toggles arguments without a description with defaultCollapsed=%s',
		async (defaultCollapsed) => {
			const { getByRole, getByTestId, queryByTestId } = render(N8nApprovalCard, {
				props: { title: 'Approval required', args: { query: 'Example' }, defaultCollapsed },
			});
			const trigger = getByRole('button', { name: 'Approval required' });
			expect(trigger).toHaveAttribute('aria-expanded', String(!defaultCollapsed));
			if (defaultCollapsed) expect(queryByTestId('approval-card-args')).toBeNull();
			else {
				expect(getByTestId('approval-card-args')).toBeVisible();
				expect(getByTestId('approval-card-args')).toHaveTextContent('Example');
			}

			await userEvent.click(trigger);
			expect(trigger).toHaveAttribute('aria-expanded', String(defaultCollapsed));
			if (defaultCollapsed) expect(getByTestId('approval-card-args')).toBeVisible();
			else expect(queryByTestId('approval-card-args')).toBeNull();
		},
	);

	it('does not show a collapse control without arguments', () => {
		const { queryByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', defaultCollapsed: true },
		});
		expect(queryByRole('button', { name: 'Approval required' })).toBeNull();
	});

	it('focuses the choices on mount by default', async () => {
		const { getByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required' },
		});
		await waitFor(() => expect(getByRole('button', { name: 'Allow once' })).toHaveFocus());
	});

	it('keeps existing focus when automatic focus is disabled', async () => {
		const previousFocus = document.activeElement;
		const { getByRole, getByText, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', autoFocus: false },
		});
		expect(document.activeElement).toBe(previousFocus);
		await userEvent.click(getByText('Allow once'));
		expect(getByRole('button', { name: 'Allow once' })).toHaveFocus();
		expect(emitted('select')).toEqual([['allow-once']]);
	});

	it('focuses the active action when the user clicks the card', async () => {
		const { getByRole, getByText } = render(N8nApprovalCard, {
			props: { title: 'Approval required', autoFocus: false },
		});
		await userEvent.click(getByText('Approval required'));
		expect(getByRole('button', { name: 'Allow once' })).toHaveFocus();
	});

	it('offers the standard session choice only when supported', async () => {
		const { getByRole, queryByRole, getAllByRole, rerender } = render(N8nApprovalCard, {
			props: { title: 'Approval required', supportsSessionApproval: true },
		});
		expect(getByRole('button', { name: 'Always allow during this session' })).toBeVisible();
		expect(getByRole('button', { name: 'Allow once' })).toBeVisible();
		expect(getByRole('button', { name: 'Deny' })).toBeVisible();
		await rerender({ supportsSessionApproval: false });
		expect(queryByRole('button', { name: /Always allow/ })).toBeNull();
		expect(getAllByRole('button')).toHaveLength(2);
		expect(getByRole('button', { name: 'Allow once' })).toBeVisible();
	});

	it('moves highlight on ArrowDown and stops at the last option', async () => {
		const { getByTestId, getByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		const listbox = getByRole('toolbar');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		expect(getByTestId('opt-allow-once')).toHaveFocus();
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		expect(getByTestId('opt-deny')).toHaveFocus();
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		expect(getByTestId('opt-deny')).toHaveFocus();
	});

	it('moves highlight on ArrowUp and stops at the first option', async () => {
		const { getByTestId, getByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		const listbox = getByRole('toolbar');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		await fireEvent.keyDown(listbox, { key: 'ArrowUp' });
		expect(getByTestId('opt-allow-once')).toHaveFocus();
		await fireEvent.keyDown(listbox, { key: 'ArrowUp' });
		await fireEvent.keyDown(listbox, { key: 'ArrowUp' });
		expect(getByTestId('opt-always-allow')).toHaveFocus();
	});

	it('focusing a row moves the active action to that row', async () => {
		const { getByTestId } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		getByTestId('opt-deny').focus();
		expect(getByTestId('opt-deny')).toHaveFocus();
		expect(getByTestId('opt-always-allow')).not.toHaveFocus();
	});

	it.each(['Enter', ' '])('handles %j from the automatically focused button', async (key) => {
		const { getByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		await waitFor(() => expect(getByRole('button', { name: 'Always allow' })).toHaveFocus());
		await fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' });
		await userEvent.keyboard(key === 'Enter' ? '{Enter}' : ' ');
		expect(emitted('select')).toEqual([['allow-once']]);
	});

	it('keeps one tab stop when hover changes the active action', async () => {
		const { getByRole, getAllByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		const buttons = getAllByRole('button');
		await waitFor(() => expect(buttons[0]).toHaveFocus());
		expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
		await userEvent.keyboard('{ArrowDown}');
		expect(buttons[1]).toHaveFocus();
		expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0, -1]);
		await userEvent.hover(buttons[2]);
		expect(buttons[1]).toHaveFocus();
		expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
		await userEvent.tab();
		expect(buttons[2]).toHaveFocus();
		await userEvent.tab();
		expect(getByRole('toolbar')).not.toContainElement(document.activeElement as HTMLElement);
	});

	it('highlights the hovered action without stealing focus', async () => {
		const searchInput = document.createElement('input');
		document.body.append(searchInput);
		searchInput.focus();

		const { getAllByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS, autoFocus: false },
		});
		const buttons = getAllByRole('button');
		try {
			await userEvent.hover(buttons[2]);
			expect(searchInput).toHaveFocus();
			expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
			await userEvent.keyboard('{Enter}');
			await userEvent.keyboard(' ');
			expect(emitted('select')).toBeUndefined();

			await userEvent.tab();
			expect(buttons[2]).toHaveFocus();
			await userEvent.keyboard('{Enter}');
			expect(emitted('select')).toEqual([['deny']]);
			await userEvent.keyboard('{ArrowUp}');
			expect(buttons[1]).toHaveFocus();
			expect(buttons.map((button) => button.tabIndex)).toEqual([-1, 0, -1]);
		} finally {
			searchInput.remove();
		}
	});

	it('does not focus disabled actions on mouse entry', async () => {
		const previousFocus = document.activeElement;
		const { getAllByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS, disabled: true },
		});
		for (const button of getAllByRole('button')) {
			await fireEvent.mouseEnter(button);
			expect(document.activeElement).toBe(previousFocus);
			expect(button).toHaveAttribute('tabindex', '-1');
		}
		expect(emitted('select')).toBeUndefined();
	});

	it('keeps disabled actions out of the tab order', () => {
		const { getAllByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS, disabled: true },
		});
		for (const button of getAllByRole('button')) {
			expect(button).toBeDisabled();
			expect(button).toHaveAttribute('tabindex', '-1');
		}
	});

	it('retains number shortcuts and focuses the activated action', async () => {
		const { getByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		await waitFor(() => expect(getByRole('button', { name: 'Always allow' })).toHaveFocus());
		await userEvent.keyboard('3');
		expect(getByRole('button', { name: 'Deny' })).toHaveFocus();
		expect(emitted('select')).toEqual([['deny']]);
	});

	it('emits select on click', async () => {
		const { getByTestId, getByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		await userEvent.click(getByTestId('opt-deny'));
		expect(emitted('select')).toEqual([['deny']]);
		expect(getByRole('button', { name: 'Deny' })).toHaveFocus();
	});
});
