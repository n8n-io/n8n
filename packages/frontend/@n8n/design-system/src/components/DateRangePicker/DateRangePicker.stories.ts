import { CalendarDateTime, today } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref, watch } from 'vue';

import N8nButton from '../N8nButton';
import DateRangePicker from './DateRangePicker.vue';
import { formatDateRangeValue, formatDateValue } from './datePicker.utils';
import type { DateRange } from './index';

const meta = {
	component: DateRangePicker,
	title: 'Experimental/DateRangePicker',
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function copyRange(range: DateRange | undefined): DateRange {
	return {
		start: range?.start?.copy(),
		end: range?.end?.copy(),
	};
}

export const Default: Story = {};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const todayDate = today('UTC');
			const lastWeek = {
				start: todayDate.subtract({ days: 7 }),
				end: todayDate.copy(),
			};
			const committed = ref<DateRange>(copyRange(lastWeek));
			const draft = ref<DateRange>(copyRange(lastWeek));
			const open = ref(false);

			watch(open, (isOpen) => {
				if (isOpen) {
					draft.value = copyRange(committed.value);
					return;
				}

				// Capture before the picker clears the draft on close.
				committed.value = copyRange(draft.value);
			});

			const presets = [
				{
					label: 'Last 7 days',
					range: lastWeek,
				},
				{
					label: 'Today',
					range: { start: todayDate.copy(), end: todayDate.copy() },
				},
				{
					label: 'Clear',
					range: { start: undefined, end: undefined },
				},
			];

			function setCommitted(range: DateRange) {
				committed.value = copyRange(range);
				draft.value = copyRange(range);
			}

			const uncontrolledDefault = {
				start: todayDate.subtract({ days: 3 }),
				end: todayDate.copy(),
			};

			return {
				committed,
				draft,
				open,
				presets,
				setCommitted,
				uncontrolledDefault,
				formatDateRangeValue,
			};
		},
		template: `
		<div style="padding: 40px; display: flex; flex-direction: column; gap: var(--spacing--xl); max-width: 420px;">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Controlled
				</h3>
				<DateRangePicker v-model="draft" v-model:open="open" locale="en-GB">
					<template #trigger>
						<N8nButton variant="subtle" icon="calendar">
							{{ formatDateRangeValue(committed, { locale: 'en-GB' }) || 'Select range' }}
						</N8nButton>
					</template>
				</DateRangePicker>
				<div style="display: flex; gap: var(--spacing--2xs); margin-top: var(--spacing--sm); flex-wrap: wrap;">
					<button
						v-for="preset in presets"
						:key="preset.label"
						type="button"
						style="
							padding: var(--spacing--3xs) var(--spacing--xs);
							border: var(--border);
							border-radius: var(--radius--2xs);
							background: var(--background--surface);
							color: var(--text-color);
							cursor: pointer;
							font: inherit;
							font-size: var(--font-size--xs);
						"
						@click="setCommitted(preset.range)"
					>
						{{ preset.label }}
					</button>
				</div>
				<p style="margin-top: var(--spacing--sm); font-size: var(--font-size--sm);">
					Selected:
					<strong>{{ formatDateRangeValue(committed, { locale: 'en-GB' }) || '(empty)' }}</strong>
				</p>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Uncontrolled
				</h3>
				<DateRangePicker
					:default-value="uncontrolledDefault"
					locale="en-GB"
				>
					<template #trigger>
						<N8nButton variant="subtle" icon="calendar">
							Uncontrolled (defaultValue)
						</N8nButton>
					</template>
				</DateRangePicker>
			</section>
		</div>
		`,
	}),
};

export const FormattedTrigger: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const initial = {
				start: today('UTC').subtract({ days: 7 }),
				end: today('UTC'),
			};
			const committed = ref<DateRange>(copyRange(initial));
			const draft = ref<DateRange>(copyRange(initial));
			const open = ref(false);

			watch(open, (isOpen) => {
				if (isOpen) {
					draft.value = copyRange(committed.value);
					return;
				}

				committed.value = copyRange(draft.value);
			});

			return { committed, draft, open, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="draft" v-model:open="open" locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(committed, { locale: 'en-GB' }) || 'Select range' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};

export const SingleDateSelection: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const initial = {
				start: today('UTC'),
				end: today('UTC'),
			};
			const committed = ref<DateRange>(copyRange(initial));
			const draft = ref<DateRange>(copyRange(initial));
			const open = ref(false);

			watch(open, (isOpen) => {
				if (isOpen) {
					draft.value = copyRange(committed.value);
					return;
				}

				committed.value = copyRange(draft.value);
			});

			return { committed, draft, open, formatDateValue };
		},
		template: `
			<DateRangePicker v-model="draft" v-model:open="open" single locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateValue(committed.start, { locale: 'en-GB' }) || 'Select date' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};

export const WithTimeSelection: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const now = today('UTC');
			const initial = {
				start: new CalendarDateTime(now.year, now.month, now.day, 9, 0, 0),
				end: new CalendarDateTime(now.year, now.month, now.day, 17, 0, 0),
			};
			const committed = ref<DateRange>(copyRange(initial));
			const draft = ref<DateRange>(copyRange(initial));
			const open = ref(false);

			watch(open, (isOpen) => {
				if (isOpen) {
					draft.value = copyRange(committed.value);
					return;
				}

				committed.value = copyRange(draft.value);
			});

			return { committed, draft, open, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="draft" v-model:open="open" show-time locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(committed, { locale: 'en-GB', includeTime: true }) || 'Select date and time' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};

export const WithTimeSelection12Hour: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const now = today('UTC');
			const initial = {
				start: new CalendarDateTime(now.year, now.month, now.day, 9, 0, 0),
				end: new CalendarDateTime(now.year, now.month, now.day, 17, 0, 0),
			};
			const committed = ref<DateRange>(copyRange(initial));
			const draft = ref<DateRange>(copyRange(initial));
			const open = ref(false);

			watch(open, (isOpen) => {
				if (isOpen) {
					draft.value = copyRange(committed.value);
					return;
				}

				committed.value = copyRange(draft.value);
			});

			return { committed, draft, open, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="draft" v-model:open="open" show-time :hour-cycle="12" locale="en-US">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(committed, { locale: 'en-US', includeTime: true, hourCycle: 12 }) || 'Select date and time' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};
