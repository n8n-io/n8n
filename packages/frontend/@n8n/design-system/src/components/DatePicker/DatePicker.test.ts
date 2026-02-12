import { getLocalTimeZone, today } from '@internationalized/date';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import DatePicker from './DatePicker.vue';

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

describe('N8nDatePicker', () => {
	it('should render a single date picker', async () => {
		const { container } = render(DatePicker);
		await openCalendarPopover(container);
	});

	it('should render single date input segments', async () => {
		const todayDate = today(getLocalTimeZone());
		const { container } = render(DatePicker, {
			props: {
				modelValue: todayDate as never,
			},
		});
		const calendar = await openCalendarPopover(container);

		// Single mode: 3 segments (month, day, year)
		expect(
			calendar.querySelectorAll('[data-reka-date-field-segment]:not([data-segment="literal"])')
				.length,
		).toBe(3);
	});

	describe('hideInputs prop', () => {
		it('should not render the input fields when hideInputs is true', async () => {
			const { container } = render(DatePicker, {
				props: { hideInputs: true },
			});
			const popover = await openCalendarPopover(container);

			expect(
				popover.querySelectorAll('[data-reka-date-field-segment]:not([data-segment="literal"])')
					.length,
			).toBe(0);
		});
	});

	describe('today button', () => {
		it('should render a Today button in the calendar header', async () => {
			const { container, getByText } = render(DatePicker);
			await openCalendarPopover(container);

			const todayButton = getByText('Today', { selector: 'button' });
			expect(todayButton).toBeVisible();
		});

		it('should emit update:modelValue with today when Today is clicked', async () => {
			const { container, emitted, getByText } = render(DatePicker);
			await openCalendarPopover(container);

			const todayButton = getByText('Today', { selector: 'button' });
			await userEvent.click(todayButton);

			const todayDate = today(getLocalTimeZone());
			const emittedValues = emitted('update:modelValue');
			expect(emittedValues).toBeDefined();
			expect(emittedValues.length).toBeGreaterThan(0);

			const lastEmittedEvent = emittedValues[emittedValues.length - 1] as unknown[];
			const lastEmitted = lastEmittedEvent[0] as { toString(): string };
			expect(lastEmitted.toString()).toBe(todayDate.toString());
		});
	});

	describe('clear button', () => {
		it('should render a Clear button', async () => {
			const { container, getByText } = render(DatePicker);
			await openCalendarPopover(container);

			const clearButton = getByText('Clear', { selector: 'button' });
			expect(clearButton).toBeVisible();
		});
	});

	describe('keyboard shortcuts', () => {
		it('should select today when T key is pressed on calendar grid', async () => {
			const { container, emitted } = render(DatePicker);
			const popover = await openCalendarPopover(container);

			const cellTrigger = popover.querySelector('[data-reka-calendar-cell-trigger]') as HTMLElement;
			cellTrigger.focus();

			await userEvent.keyboard('t');

			const todayDate = today(getLocalTimeZone());
			const emittedValues = emitted('update:modelValue');
			expect(emittedValues).toBeDefined();
			expect(emittedValues.length).toBeGreaterThan(0);

			const lastEmittedEvent = emittedValues[emittedValues.length - 1] as unknown[];
			const lastEmitted = lastEmittedEvent[0] as { toString(): string };
			expect(lastEmitted.toString()).toBe(todayDate.toString());
		});
	});

	describe('locale prop', () => {
		it('should format date segments according to the provided locale', async () => {
			const todayDate = today(getLocalTimeZone());
			const { container } = render(DatePicker, {
				props: {
					locale: 'en-GB',
					modelValue: todayDate as never,
				},
			});
			const calendar = await openCalendarPopover(container);

			const segments = calendar.querySelectorAll(
				'[data-reka-date-field-segment]:not([data-segment="literal"])',
			);
			// en-GB format: day/month/year - first non-literal segment should be 'day'
			expect(segments[0]?.getAttribute('data-reka-date-field-segment')).toBe('day');
		});
	});

	describe('presets slot', () => {
		it('should render preset buttons when provided via the presets slot', async () => {
			const { container, getByText } = render(DatePicker, {
				slots: {
					presets: '<button data-testid="preset-button">Preset 1</button>',
				},
			});
			await openCalendarPopover(container);

			const presetButton = getByText('Preset 1', { selector: 'button' });
			expect(presetButton).toBeVisible();
		});
	});
});
