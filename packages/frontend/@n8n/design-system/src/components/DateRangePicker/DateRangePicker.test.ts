import { CalendarDateTime } from '@internationalized/date';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

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

	it('should emit update:close when clicking the apply button', async () => {
		const { container, emitted, getByText } = render(DateRangePicker);
		await openCalendarPopover(container);

		getByText('Apply', { selector: 'button' }); // ensure the button is in the

		const applyButton = getByText('Apply', { selector: 'button' });
		expect(applyButton).toBeVisible();

		await userEvent.click(applyButton);

		expect(emitted('update:open')).toStrictEqual([
			[true], //opened
			[false], // closed by button interaction
		]);
	});

	it('should render date inline inputs', async () => {
		const { container } = render(DateRangePicker);
		const calendar = await openCalendarPopover(container);

		expect(
			calendar.querySelectorAll('[data-reka-date-field-segment]:not([data-segment="literal"])')
				.length,
		).toBe(6);
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

		expect(
			calendar.querySelectorAll('[data-reka-date-field-segment]:not([data-segment="literal"])')
				.length,
		).toBe(10);
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
});
