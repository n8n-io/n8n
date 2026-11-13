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
});
