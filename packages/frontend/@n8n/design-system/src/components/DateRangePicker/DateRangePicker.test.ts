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

async function applySelection(
	getByRole: (role: string, options?: { name: string }) => HTMLElement,
) {
	await userEvent.click(getByRole('button', { name: 'Apply' }));
	await nextTick();
}

/** Clicks a calendar day cell trigger. */
async function clickCalendarDay(popover: HTMLElement, date: { toString(): string }) {
	const day = date.toString();
	const cell =
		(popover.querySelector(
			`[data-reka-calendar-cell-trigger][data-value="${day}"]`,
		) as HTMLElement | null) ??
		(popover.querySelector(
			`[data-reka-calendar-cell-trigger][data-value^="${day}"]`,
		) as HTMLElement | null);
	expect(cell).toBeTruthy();
	await userEvent.click(cell as HTMLElement);
}

describe('N8nDateRangePicker', () => {
	it('should show the date range picker when trigger is clicked', async () => {
		const { container } = render(DateRangePicker);
		await openCalendarPopover(container);
	});

	it('selects today as both start and end date when applied', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		await openCalendarPopover(container);
		await applySelection(getByRole);

		const todayRange = emitted('update:modelValue')?.at(-1)?.[0];
		const todayDate = today(getLocalTimeZone());

		expect(todayRange?.start?.compare(todayDate)).toBe(0);
		expect(todayRange?.end?.compare(todayDate)).toBe(0);
	});

	it('does not emit modelValue until Apply is clicked', async () => {
		const { container, emitted } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		await clickCalendarDay(popover, tomorrow.toString());

		expect(emitted('update:modelValue')).toBeFalsy();
	});

	it('keeps the start and end dates when navigating to the previous month', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const prevButton = popover.querySelector('[aria-label="Previous page"]') as HTMLElement;
		expect(prevButton).toBeTruthy();

		await userEvent.click(prevButton);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('keeps the start and end dates when navigating to another month', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const nextButton = popover.querySelector('[aria-label="Next page"]') as HTMLElement;
		expect(nextButton).toBeTruthy();

		await userEvent.click(nextButton);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('extends the range from today after navigating to the previous month', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const previousMonth = todayDate.subtract({ months: 1 });
		const targetDay = previousMonth.set({ day: 15 });

		await clickCalendarDay(popover, todayDate);
		await userEvent.click(popover.querySelector('[aria-label="Previous page"]') as HTMLElement);
		await clickCalendarDay(popover, targetDay);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(targetDay)).toBe(0);
		expect(lastUpdate?.end?.compare(todayDate)).toBe(0);
	});

	it('can complete a range by selecting an end date in another month', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const nextMonth = todayDate.add({ months: 1 });
		const targetDay = nextMonth.set({ day: 15 });

		await clickCalendarDay(popover, todayDate);
		await userEvent.click(popover.querySelector('[aria-label="Next page"]') as HTMLElement);
		await clickCalendarDay(popover, targetDay);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(todayDate)).toBe(0);
		expect(lastUpdate?.end?.compare(targetDay)).toBe(0);
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

	it('starts a new range from the focused placeholder day when clicked after changing month', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const firstOfNextMonth = todayDate.add({ months: 1 }).set({ day: 1 });
		const secondOfNextMonth = firstOfNextMonth.add({ days: 1 });

		await userEvent.click(popover.querySelector('[aria-label="Next page"]') as HTMLElement);

		await clickCalendarDay(popover, firstOfNextMonth);
		await clickCalendarDay(popover, secondOfNextMonth);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(firstOfNextMonth)).toBe(0);
		expect(lastUpdate?.end?.compare(secondOfNextMonth)).toBe(0);
	});

	it('starts a new range from the clicked day after today is auto-selected', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const dayAfter = tomorrow.add({ days: 1 });

		await clickCalendarDay(popover, tomorrow);
		await clickCalendarDay(popover, dayAfter);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(tomorrow)).toBe(0);
		expect(lastUpdate?.end?.compare(dayAfter)).toBe(0);
	});

	it('starts a new range when Enter is pressed on a day after today is auto-selected', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const dayAfter = tomorrow.add({ days: 1 });

		const tomorrowCell = popover.querySelector(
			`[data-value="${tomorrow.toString()}"]`,
		) as HTMLElement;
		expect(tomorrowCell).toBeTruthy();
		tomorrowCell.focus();
		await userEvent.keyboard('{Enter}');
		await clickCalendarDay(popover, dayAfter);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(tomorrow)).toBe(0);
		expect(lastUpdate?.end?.compare(dayAfter)).toBe(0);
	});

	it('alternates between starting and completing a range', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const fiveDaysAgo = todayDate.subtract({ days: 5 });

		await clickCalendarDay(popover, tomorrow);
		await clickCalendarDay(popover, fiveDaysAgo);

		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(fiveDaysAgo)).toBe(0);
		expect(lastUpdate?.end?.compare(tomorrow)).toBe(0);
	});

	it('starts a new range on the next click after a complete selection', async () => {
		const todayDate = today(getLocalTimeZone());
		const start = todayDate.subtract({ days: 6 });
		const end = todayDate.subtract({ days: 1 });
		const newStart = todayDate;
		const newEnd = todayDate.add({ days: 6 });

		const { container, emitted, getByRole } = render(DateRangePicker, {
			props: {
				modelValue: { start, end },
			},
		});
		const popover = await openCalendarPopover(container);

		await clickCalendarDay(popover, newStart);
		expect(
			popover.querySelector(`[data-value="${end.toString()}"][data-selection-end="true"]`),
		).toBeFalsy();

		await clickCalendarDay(popover, newEnd);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(newStart)).toBe(0);
		expect(lastUpdate?.end?.compare(newEnd)).toBe(0);
	});

	it('builds start then end across consecutive clicks', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const start = todayDate.add({ days: 2 });
		const end = todayDate.add({ days: 8 });

		await clickCalendarDay(popover, start);
		await clickCalendarDay(popover, end);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(start)).toBe(0);
		expect(lastUpdate?.end?.compare(end)).toBe(0);
	});

	it('alternates start and end across two full selection cycles including the next week row', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const firstStart = todayDate.add({ days: 2 });
		const firstEnd = todayDate.add({ days: 4 });
		const secondStart = todayDate.add({ days: 9 });
		const secondEnd = todayDate.add({ days: 11 });

		await clickCalendarDay(popover, firstStart);
		await clickCalendarDay(popover, firstEnd);
		await clickCalendarDay(popover, secondStart);
		await clickCalendarDay(popover, secondEnd);
		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(secondStart)).toBe(0);
		expect(lastUpdate?.end?.compare(secondEnd)).toBe(0);
	});

	it('should emit update:open when clicking the apply button', async () => {
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

	it('commits the selected range when Apply is clicked', async () => {
		const { container, emitted, getByRole } = render(DateRangePicker);
		const popover = await openCalendarPopover(container);

		const todayDate = today(getLocalTimeZone());
		const tomorrow = todayDate.add({ days: 1 });
		const dayAfter = tomorrow.add({ days: 1 });

		await clickCalendarDay(popover, tomorrow);
		await clickCalendarDay(popover, dayAfter);

		expect(emitted('update:modelValue')).toBeFalsy();

		await applySelection(getByRole);

		const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
		expect(lastUpdate?.start?.compare(tomorrow)).toBe(0);
		expect(lastUpdate?.end?.compare(dayAfter)).toBe(0);
	});

	it('does not commit the selected range when the popover is dismissed', async () => {
		const initial = {
			start: today(getLocalTimeZone()).subtract({ days: 7 }),
			end: today(getLocalTimeZone()),
		};
		const { container, emitted } = render(DateRangePicker, {
			props: { modelValue: initial },
		});
		const popover = await openCalendarPopover(container);

		const tomorrow = today(getLocalTimeZone()).add({ days: 1 });
		await clickCalendarDay(popover, tomorrow.toString());

		const trigger = container.querySelector(
			'[data-reka-date-field-segment="trigger"]',
		) as HTMLElement;
		await userEvent.click(trigger);
		await nextTick();

		expect(emitted('update:modelValue')).toBeFalsy();
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
			const dayAfter = tomorrow.add({ days: 1 });

			const { container, emitted, getByRole } = render(DateRangePicker, {
				props: {
					showTime: true,
					modelValue: { start, end },
				},
			});
			const popover = await openCalendarPopover(container);

			await clickCalendarDay(popover, tomorrow);
			await clickCalendarDay(popover, dayAfter);
			await applySelection(getByRole);

			const lastUpdate = emitted('update:modelValue')?.at(-1)?.[0];
			expect(lastUpdate?.start?.toString()).toBe(`${tomorrow.toString()}T09:30:00`);
			expect(lastUpdate?.end?.toString()).toBe(`${dayAfter.toString()}T09:30:00`);
		});
	});

	describe('hideInputs prop', () => {
		it('should not render the input fields when hideInputs is true', async () => {
			const { container, queryByText } = render(DateRangePicker, {
				props: { hideInputs: true },
			});
			await openCalendarPopover(container);

			expect(queryByText('Apply', { selector: 'button' })).not.toBeInTheDocument();
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
			const { container, emitted, getByRole } = render(DateRangePicker, {
				props: { single: true },
			});
			const popover = await openCalendarPopover(container);

			const todayDate = today(getLocalTimeZone());
			const tomorrow = todayDate.add({ days: 1 });

			await clickCalendarDay(popover, tomorrow);
			await applySelection(getByRole);

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
		});
	});
});
