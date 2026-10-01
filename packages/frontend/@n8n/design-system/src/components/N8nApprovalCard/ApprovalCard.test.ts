import { render, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import N8nApprovalCard, { type ApprovalOption } from './ApprovalCard.vue';

const OPTIONS: ApprovalOption[] = [
	{ key: 'always-allow', icon: 'check', label: 'Always allow', testId: 'opt-always-allow' },
	{ key: 'allow-once', icon: 'check', label: 'Allow once', testId: 'opt-allow-once' },
	{ key: 'deny', icon: 'ban', label: 'Deny', withArrow: false, testId: 'opt-deny' },
];

describe('N8nApprovalCard', () => {
	it('offers the standard session choice only when supported', async () => {
		const { getByRole, queryByRole, getAllByRole, rerender } = render(N8nApprovalCard, {
			props: { title: 'Approval required', supportsSessionApproval: true },
		});
		expect(
			getByRole('option', { name: 'Always allow during this session' }).getAttribute(
				'aria-selected',
			),
		).toBe('true');
		expect(getByRole('option', { name: 'Allow once' }).getAttribute('aria-selected')).toBe('false');
		expect(getByRole('option', { name: 'Deny' })).toBeVisible();
		await rerender({ supportsSessionApproval: false });
		expect(queryByRole('option', { name: /Always allow/ })).toBeNull();
		expect(getAllByRole('option')).toHaveLength(2);
		expect(getByRole('option', { name: 'Allow once' }).getAttribute('aria-selected')).toBe('true');
	});

	it('moves highlight on ArrowDown and stops at the last option', async () => {
		const { getByTestId, getByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		const listbox = getByRole('listbox');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		expect(getByTestId('opt-allow-once').getAttribute('aria-selected')).toBe('true');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		expect(getByTestId('opt-deny').getAttribute('aria-selected')).toBe('true');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		expect(getByTestId('opt-deny').getAttribute('aria-selected')).toBe('true');
	});

	it('moves highlight on ArrowUp and stops at the first option', async () => {
		const { getByTestId, getByRole } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		const listbox = getByRole('listbox');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		await fireEvent.keyDown(listbox, { key: 'ArrowUp' });
		expect(getByTestId('opt-allow-once').getAttribute('aria-selected')).toBe('true');
		await fireEvent.keyDown(listbox, { key: 'ArrowUp' });
		await fireEvent.keyDown(listbox, { key: 'ArrowUp' });
		expect(getByTestId('opt-always-allow').getAttribute('aria-selected')).toBe('true');
	});

	it('hovering a row moves the highlight to that row', async () => {
		const { getByTestId } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		await fireEvent.mouseEnter(getByTestId('opt-deny'));
		expect(getByTestId('opt-deny').getAttribute('aria-selected')).toBe('true');
		expect(getByTestId('opt-always-allow').getAttribute('aria-selected')).toBe('false');
	});

	it.each(['Enter', ' '])('emits select with the highlighted option on %j', async (key) => {
		const { getByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		const listbox = getByRole('listbox');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		await fireEvent.keyDown(listbox, { key });
		expect(emitted('select')).toEqual([['allow-once']]);
	});

	it('emits select on click', async () => {
		const { getByTestId, getByRole, emitted } = render(N8nApprovalCard, {
			props: { title: 'Approval required', options: OPTIONS },
		});
		await userEvent.click(getByTestId('opt-deny'));
		expect(emitted('select')).toEqual([['deny']]);
		expect(getByRole('listbox')).toHaveFocus();
	});
});
