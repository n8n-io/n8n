import { render, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import ApprovalOptionList, {
	type ApprovalOption,
} from '@/features/ai/instanceAi/components/ApprovalOptionList.vue';

const OPTIONS: ApprovalOption[] = [
	{ key: 'always-allow', icon: 'check', label: 'Always allow', testId: 'opt-always-allow' },
	{ key: 'allow-once', icon: 'check', label: 'Allow once', testId: 'opt-allow-once' },
	{ key: 'deny', icon: 'ban', label: 'Deny', withArrow: false, testId: 'opt-deny' },
];

describe('ApprovalOptionList', () => {
	it('pre-selects the first option on mount', () => {
		const { getByTestId } = render(ApprovalOptionList, { props: { options: OPTIONS } });
		expect(getByTestId('opt-always-allow').getAttribute('aria-selected')).toBe('true');
		expect(getByTestId('opt-allow-once').getAttribute('aria-selected')).toBe('false');
	});

	it('moves highlight on ArrowDown and stops at the last option', async () => {
		const { getByTestId, getByRole } = render(ApprovalOptionList, {
			props: { options: OPTIONS },
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
		const { getByTestId, getByRole } = render(ApprovalOptionList, {
			props: { options: OPTIONS },
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
		const { getByTestId } = render(ApprovalOptionList, { props: { options: OPTIONS } });
		await fireEvent.mouseEnter(getByTestId('opt-deny'));
		expect(getByTestId('opt-deny').getAttribute('aria-selected')).toBe('true');
		expect(getByTestId('opt-always-allow').getAttribute('aria-selected')).toBe('false');
	});

	it('emits select with the highlighted option on Enter', async () => {
		const { getByRole, emitted } = render(ApprovalOptionList, { props: { options: OPTIONS } });
		const listbox = getByRole('listbox');
		await fireEvent.keyDown(listbox, { key: 'ArrowDown' });
		await fireEvent.keyDown(listbox, { key: 'Enter' });
		expect(emitted('select')).toEqual([['allow-once']]);
	});

	it('emits select on click', async () => {
		const { getByTestId, emitted } = render(ApprovalOptionList, { props: { options: OPTIONS } });
		await userEvent.click(getByTestId('opt-deny'));
		expect(emitted('select')).toEqual([['deny']]);
	});
});
