import { CalendarDate } from '@internationalized/date';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import InsightsDataRangePicker from './InsightsDataRangePicker.vue';

const renderComponent = createComponentRenderer(InsightsDataRangePicker);

describe('InsightsDataRangePicker', () => {
	it('opens the real picker from the formatted date button and applies a preset', async () => {
		const end = new CalendarDate(2000, 12, 19);
		const { getByRole, queryByRole, findByRole, emitted } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				modelValue: { start: new CalendarDate(2000, 12, 12), end },
				minValue: new CalendarDate(2000, 1, 1),
				maxValue: end,
				presets: [{ value: 1, label: 'Last 24 hours' }],
			},
		});

		const trigger = getByRole('button', { name: '12 Dec - 19 Dec, 2000' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('button', { name: 'Last 24 hours' })).not.toBeInTheDocument();

		await userEvent.click(trigger);

		const preset = await findByRole('button', { name: 'Last 24 hours' });
		expect(preset).toBeVisible();
		expect(trigger).toHaveAttribute('aria-expanded', 'true');

		await userEvent.click(preset);

		expect(emitted('update:modelValue')).toEqual([
			[{ start: new CalendarDate(2000, 12, 18), end }],
		]);
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes the picker before the upgrade dialog opens for a locked preset', async () => {
		const end = new CalendarDate(2000, 12, 19);
		const { getByRole, queryByRole, findByRole } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				modelValue: { start: new CalendarDate(2000, 12, 12), end },
				minValue: new CalendarDate(2000, 1, 1),
				maxValue: end,
				presets: [{ value: 90, label: 'Last 90 days', disabled: true }],
			},
		});

		const trigger = getByRole('button', { name: '12 Dec - 19 Dec, 2000' });
		await userEvent.click(trigger);

		const preset = await findByRole('button', { name: /Last 90 days/ });
		await userEvent.click(preset);

		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(queryByRole('button', { name: /Last 90 days/ })).not.toBeInTheDocument();
		expect(getByRole('dialog', { name: 'Upgrade to Enterprise' })).toBeVisible();
	});

	it('does not apply an in-progress custom range when a locked preset opens the upgrade dialog', async () => {
		const end = new CalendarDate(2000, 12, 19);
		const { getByRole, findByRole, emitted } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				modelValue: { start: new CalendarDate(2000, 12, 12), end },
				minValue: new CalendarDate(2000, 1, 1),
				maxValue: end,
				presets: [{ value: 90, label: 'Last 90 days', disabled: true }],
			},
		});

		const trigger = getByRole('button', { name: '12 Dec - 19 Dec, 2000' });
		await userEvent.click(trigger);

		await userEvent.click(await findByRole('button', { name: 'Friday, December 1, 2000' }));
		await userEvent.click(getByRole('button', { name: 'Tuesday, December 5, 2000' }));
		await userEvent.click(getByRole('button', { name: /Last 90 days/ }));

		expect(emitted('update:modelValue')).toBeUndefined();
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		expect(trigger).toHaveTextContent('12 Dec - 19 Dec, 2000');
		expect(getByRole('dialog', { name: 'Upgrade to Enterprise' })).toBeVisible();
	});
});
