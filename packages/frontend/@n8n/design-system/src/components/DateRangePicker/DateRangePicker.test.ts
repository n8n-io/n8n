import { CalendarDateTime, getLocalTimeZone, today } from '@internationalized/date';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { nextTick } from 'vue';

import DateRangePicker from './DateRangePicker.vue';

async function openCalendarPopover(container: Element) {
	const trigger = container.querySelector('[data-reka-date-field-segment="trigger"]') as Element;
	expect(trigger).toBeVisible();

	await userEvent.click(trigger);

	const popoverId = trigger.getAttribute('aria-controls') as string;
	const popover = document.getElementById(popoverId) as HTMLElement;
	expect(popover).toBeVisible();

	const anyCell = popover.querySelector('[data-reka-calendar-cell-trigger]');
	expect(anyCell).toBeVisible();

	return popover;
}

describe('N8nDateRangePicker', () => {
	it('should show the date range picker when trigger is clicked', async () => {
		const { container } = render(DateRangePicker);
		await openCalendarPopover(container);
	});

	it('selects today as both start and end date when opened', async () => {
		const { container, emitted } = render(DateRangePicker);
		await openCalendarPopover(container);

		const modelValueUpdates = emitted('update:modelValue') ?? [];
		const todayRange = modelValueUpdates.at(-1)?.[0];
		const todayDate = today(getLocalTimeZone());

		expect(todayRange?.start?.compare(todayDate)).toBe(0);
		expect(todayRange?.end?.compare(todayDate)).toBe(0);
	});

	it('keeps the start and end dates when navigating to the previous month', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const prevButton = popover.querySelector('[aria-label="Previous page"]') as HTMLElement;
		expect(prevButton).toBeTruthy();

		await userEvent.click(prevButton);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('keeps the start and end dates when navigating to another month', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const nextButton = popover.querySelector('[aria-label="Next page"]') as HTMLElement;
		expect(nextButton).toBeTruthy();

		await userEvent.click(nextButton);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('extends the range from today after navigating to the previous month', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const previousMonth = todayDate.subtract({ months: 1 });
		const targetDay = previousMonth.set({ day: 15 });

		const prevButton = popover.querySelector('[aria-label="Previous page"]') as HTMLElement;
		await userEvent.click(prevButton);

		const targetCell = popover.querySelector(
			`[data-value="${targetDay.toString()}"]`,
		) as HTMLElement;
		expect(targetCell).toBeTruthy();

		await userEvent.click(targetCell);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(targetDay)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('stays on the selected month when choosing an end date in another month', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const nextMonth = todayDate.add({ months: 1 });
		const targetDay = nextMonth.set({ day: 15 });

		await userEvent.click(popover.querySelector('[aria-label="Next page"]') as HTMLElement);

		const targetCell = popover.querySelector(
			`[data-value="${targetDay.toString()}"]`,
		) as HTMLElement;
		expect(targetCell).toBeTruthy();

		await userEvent.click(targetCell);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(targetDay)).toBe(0);

		await nextTick();

		// Calendar should remain on the month of the selected end date (not jump back to start).
		const selectedEndCell = popover.querySelector(
			`[data-value="${targetDay.toString()}"]`,
		) as HTMLElement;
		expect(selectedEndCell).toBeTruthy();
		expect(selectedEndCell.hasAttribute('data-focused')).toBe(true);
		expect(selectedEndCell.getAttribute('data-selection-end')).toBe('true');
	});

	it('does not mark the placeholder day as selected after month navigation', async () => {
		const { container } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const firstOfNextMonth = todayDate.add({ months: 1 }).set({ day: 1 });

		await userEvent.click(popover.querySelector('[aria-label="Next page"]') as HTMLElement);

		const firstCell = popover.querySelector(
			`[data-value="${firstOfNextMonth.toString()}"]`,
		) as HTMLElement;
		expect(firstCell).toBeTruthy();
		expect(firstCell.getAttribute('data-selected')).not.toBe('true');
		expect(firstCell.getAttribute('data-selection-start')).toBeFalsy();
		expect(firstCell.getAttribute('data-selection-end')).toBeFalsy();
		expect(firstCell.hasAttribute('data-focused')).toBe(true);
	});

	it('ignores the placeholder day click immediately after changing month', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const firstOfNextMonth = todayDate.add({ months: 1 }).set({ day: 1 });

		await userEvent.click(popover.querySelector('[aria-label="Next page"]') as HTMLElement);

		const firstCell = popover.querySelector(
			`[data-value="${firstOfNextMonth.toString()}"]`,
		) as HTMLElement;
		expect(firstCell).toBeTruthy();

		await userEvent.click(firstCell);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('extends the auto-selected today range when another day is clicked', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const tomorrowCell = popover.querySelector(
			`[data-value="${tomorrow.toString()}"]`,
		) as HTMLElement;

		expect(tomorrowCell).toBeTruthy();

		await userEvent.click(tomorrowCell);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(tomorrow)).toBe(0);
	});

	it('extends the auto-selected today range when Enter is pressed on a day', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const tomorrowCell = popover.querySelector(
			`[data-value="${tomorrow.toString()}"]`,
		) as HTMLElement;

		expect(tomorrowCell).toBeTruthy();
		tomorrowCell.focus();
		await userEvent.keyboard('{Enter}');

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(tomorrow)).toBe(0);
	});

	it('alternates active field between end and start after each selection', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const fiveDaysAgo = todayDate.subtract({ days: 5 });

		expect(popover.querySelector('[data-active-field="end"]')).toBeTruthy();

		await userEvent.click(
			popover.querySelector(`[data-value="${tomorrow.toString()}"]`) as HTMLElement,
		);

		expect(popover.querySelector('[data-active-field="start"]')).toBeTruthy();

		await userEvent.click(
			popover.querySelector(`[data-value="${fiveDaysAgo.toString()}"]`) as HTMLElement,
		);

		expect(popover.querySelector('[data-active-field="end"]')).toBeTruthy();

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(fiveDaysAgo)).toBe(0);
		expect(lastUpdate?.end?.compare(tomorrow)).toBe(0);
	});

	it('switches to end immediately after selecting start', async () => {
		const { container } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const fiveDaysAgo = todayDate.subtract({ days: 5 });

		await userEvent.click(
			popover.querySelector(`[data-value="${tomorrow.toString()}"]`) as HTMLElement,
		);

		expect(popover.querySelector('[data-active-field="start"]')).toBeTruthy();

		await userEvent.click(
			popover.querySelector(`[data-value="${fiveDaysAgo.toString()}"]`) as HTMLElement,
		);

		expect(popover.querySelector('[data-active-field="end"]')).toBeTruthy();
	});

	it('allows selecting a new start date when the start field is active', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const newStart = todayDate.subtract({ days: 5 });

		await userEvent.click(popover.querySelector('[aria-label="Start date"]') as HTMLElement);
		await userEvent.click(
			popover.querySelector(`[data-value="${newStart.toString()}"]`) as HTMLElement,
		);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(newStart)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('should emit update:close when clicking the apply button', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		await openCalendarPopover(container);

		const applyButton = getByRole('button', { name: 'Apply' });
		expect(applyButton).toBeVisible();

		await userEvent.click(applyButton);

		expect(emitted('update:open')).toStrictEqual([
			[true], //opened
			[false], // closed by button interaction
		]);
	});

	it('should clear the selected range when the popover closes', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		await openCalendarPopover(container);

		const todayRange = emitted('update:modelValue')?.at(-1)?.[0];
		expect(todayRange?.start).toBeTruthy();
		expect(todayRange?.end).toBeTruthy();

		await userEvent.click(getByRole('button', { name: 'Apply' }));
		await nextTick();

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start).toBeUndefined();
		expect(lastUpdate?.end).toBeUndefined();
	});

	it('should clear the selected range when clicking the clear button', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		await openCalendarPopover(container);

		await userEvent.click(getByRole('button', { name: 'Clear' }));

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start).toBeUndefined();
		expect(lastUpdate?.end).toBeUndefined();
	});

	it('should render separate start and end date inputs', async () => {
		const { container } = render(DateRangePicker);
		const calendar = await openCalendarPopover(container);

		expect(calendar.querySelector('[aria-label="Start date"]')).toBeVisible();
		expect(calendar.querySelector('[aria-label="End date"]')).toBeVisible();
	});

	it('should render date stacked inputs with time', async () => {
		const { container } = render(DateRangePicker, {
			props: {
				modelValue: {
					start: new CalendarDateTime(2023, 1, 1, 12, 0, 0),
					end: new CalendarDateTime(2023, 1, 7, 12, 0, 0),
				},
			},
		});
		const calendar = await openCalendarPopover(container);

		expect(calendar.querySelector('[aria-label="Start date"]')).toBeVisible();
		expect(calendar.querySelector('[aria-label="End date"]')).toBeVisible();
	});

	describe('showTime prop', () => {
		it('should render time inputs next to each date when showTime is true', async () => {
			const { container } = render(DateRangePicker, {
				props: {
					showTime: true,
					modelValue: {
						start: new CalendarDateTime(2023, 1, 1, 9, 30, 0),
						end: new CalendarDateTime(2023, 1, 7, 17, 0, 0),
					},
				},
			});
			const calendar = await openCalendarPopover(container);

			expect(calendar.querySelector('[aria-label="Start date"]')).toBeVisible();
			expect(calendar.querySelector('[aria-label="End date"]')).toBeVisible();
			expect(calendar.querySelector('[aria-label="Start time"]')).toBeVisible();
			expect(calendar.querySelector('[aria-label="End time"]')).toBeVisible();
			expect(calendar.querySelector('[aria-label="Start time"]')).toHaveValue('09:30');
			expect(calendar.querySelector('[aria-label="End time"]')).toHaveValue('17:00');
		});

		it('should render a single time input when single and showTime are true', async () => {
			const { container, queryByLabelText, getByLabelText } = render(DateRangePicker, {
				props: {
					single: true,
					showTime: true,
					modelValue: {
						start: new CalendarDateTime(2023, 1, 1, 12, 0, 0),
						end: new CalendarDateTime(2023, 1, 1, 12, 0, 0),
					},
				},
			});
			await openCalendarPopover(container);

			expect(getByLabelText('Date')).toBeVisible();
			expect(getByLabelText('Time')).toBeVisible();
			expect(queryByLabelText('End date')).not.toBeInTheDocument();
			expect(queryByLabelText('End time')).not.toBeInTheDocument();
		});

		it('formats time with AM/PM when hourCycle is 12', async () => {
			const { container } = render(DateRangePicker, {
				props: {
					showTime: true,
					hourCycle: 12,
					modelValue: {
						start: new CalendarDateTime(2023, 1, 1, 9, 30, 0),
						end: new CalendarDateTime(2023, 1, 7, 17, 0, 0),
					},
				},
			});
			const calendar = await openCalendarPopover(container);

			expect(calendar.querySelector('[aria-label="Start time"]')).toHaveValue('09:30 AM');
			expect(calendar.querySelector('[aria-label="End time"]')).toHaveValue('05:00 PM');
		});

		it('preserves existing time when selecting a new day', async () => {
			const todayDate = today(getLocalTimeZone());
			const start = new CalendarDateTime(todayDate.year, todayDate.month, todayDate.day, 9, 30, 0);
			const end = new CalendarDateTime(todayDate.year, todayDate.month, todayDate.day, 17, 0, 0);
			const tomorrow = todayDate.add({ days: 1 });

			const { container, emitted } = render(DateRangePicker, {
				props: {
					showTime: true,
					modelValue: { start, end },
				},
			});
			const popover = await openCalendarPopover(container);

			const tomorrowCell = popover.querySelector(
				`[data-value^="${tomorrow.toString()}"]`,
			) as HTMLElement;
			expect(tomorrowCell).toBeTruthy();

			await userEvent.click(tomorrowCell);

			const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
			expect(lastUpdate?.start?.toString()).toBe(start.toString());
			expect(lastUpdate?.end?.toString()).toBe(`${tomorrow.toString()}T17:00:00`);
		});
	});

	describe('hideInputs prop', () => {
		it('should not render the input fields when hideInputs is true', async () => {
			const { container, queryByText } = render(DateRangePicker, {
				props: { hideInputs: true },
			});
			await openCalendarPopover(container);

			expect(queryByText('Apply', { selector: 'button' })).not.toBeInTheDocument();
			expect(queryByText('Clear', { selector: 'button' })).not.toBeInTheDocument();
		});
	});

	describe('single prop', () => {
		it('should render a single date input when single is true', async () => {
			const { container, queryByLabelText, getByLabelText } = render(DateRangePicker, {
				props: { single: true },
			});
			await openCalendarPopover(container);

			expect(getByLabelText('Date')).toBeVisible();
			expect(queryByLabelText('Start date')).not.toBeInTheDocument();
			expect(queryByLabelText('End date')).not.toBeInTheDocument();
		});

		it('selects the same date for start and end when a day is clicked', async () => {
			const { container, emitted } = render(DateRangePicker, {
				props: { single: true },
			});
			const popover = await openCalendarPopover(container);

			const todayDate = today(getLocalTimeZone());
			const tomorrow = todayDate.add({ days: 1 });
			const tomorrowCell = popover.querySelector(
				`[data-value="${tomorrow.toString()}"]`,
			) as HTMLElement;

			await userEvent.click(tomorrowCell);

			const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
			expect(lastUpdate?.start?.compare(tomorrow)).toBe(0);
			expect(lastUpdate?.end?.compare(tomorrow)).toBe(0);
		});
	});

	describe('presets slot', () => {
		it('should render preset buttons when provided via the presets slot', async () => {
			const { container, getByText } = render(DateRangePicker, {
				slots: {
					presets: '<button data-testid="preset-button">Preset 1</button>',
				},
			});
			await openCalendarPopover(container);

			const presetButton = getByText('Preset 1', { selector: 'button' });
			expect(presetButton).toBeVisible();
		});
	});

	describe('footer slot', () => {
		it('replaces the default footer when provided', async () => {
			const { container, getByRole, queryByRole } = render(DateRangePicker, {
				slots: {
					footer: '<button>Custom Footer</button>',
				},
			});
			await openCalendarPopover(container);

			expect(getByRole('button', { name: 'Custom Footer' })).toBeVisible();
			expect(queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
			expect(queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
		});
	});
});
