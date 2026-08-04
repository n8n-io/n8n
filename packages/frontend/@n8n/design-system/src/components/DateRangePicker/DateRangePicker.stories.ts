import { CalendarDateTime, today } from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nButton from '../N8nButton';
import DateRangePicker from './DateRangePicker.vue';
import { formatDateRangeValue, formatDateValue } from './datePicker.utils';
import type { DateRange, N8nDateRangePickerPreset } from './index';

const meta = {
	component: DateRangePicker,
	title: 'Experimental/DateRangePicker',
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

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
			const value = ref<DateRange>({
				start: lastWeek.start.copy(),
				end: lastWeek.end.copy(),
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

			function setValue(range: DateRange) {
				value.value = {
					start: range.start?.copy(),
					end: range.end?.copy(),
				};
			}

			const uncontrolledDefault = {
				start: todayDate.subtract({ days: 3 }),
				end: todayDate.copy(),
			};

			return {
				value,
				presets,
				setValue,
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
				<DateRangePicker v-model="value" locale="en-GB">
					<template #trigger>
						<N8nButton variant="subtle" icon="calendar">
							{{ formatDateRangeValue(value, { locale: 'en-GB' }) || 'Select range' }}
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
						@click="setValue(preset.range)"
					>
						{{ preset.label }}
					</button>
				</div>
				<p style="margin-top: var(--spacing--sm); font-size: var(--font-size--sm);">
					Selected:
					<strong>{{ formatDateRangeValue(value, { locale: 'en-GB' }) || '(empty)' }}</strong>
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
			const range = ref({
				start: today('UTC').subtract({ days: 7 }),
				end: today('UTC'),
			});

			return { range, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="range" locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(range, { locale: 'en-GB' }) || 'Select range' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};

export const Presets: Story = {
	render: () => ({
		components: { DateRangePicker, N8nButton },
		setup() {
			const todayDate = today('UTC');
			const open = ref(false);
			const range = ref<DateRange>({
				start: todayDate.subtract({ days: 7 }),
				end: todayDate.copy(),
			});

			const presetRanges: Record<string, DateRange> = {
				today: { start: todayDate.copy(), end: todayDate.copy() },
				'7d': {
					start: todayDate.subtract({ days: 7 }),
					end: todayDate.copy(),
				},
				'30d': {
					start: todayDate.subtract({ days: 30 }),
					end: todayDate.copy(),
				},
				'90d': {
					start: todayDate.subtract({ days: 90 }),
					end: todayDate.copy(),
				},
			};

			function isActivePreset(presetRange: DateRange) {
				if (!range.value.start || !range.value.end || !presetRange.start || !presetRange.end) {
					return false;
				}

				return (
					range.value.start.compare(presetRange.start) === 0 &&
					range.value.end.compare(presetRange.end) === 0
				);
			}

			const presets = computed<N8nDateRangePickerPreset[]>(() => [
				{ value: 'today', label: 'Today', active: isActivePreset(presetRanges.today) },
				{ value: '7d', label: 'Last 7 days', active: isActivePreset(presetRanges['7d']) },
				{
					value: '30d',
					label: 'Last 30 days',
					active: isActivePreset(presetRanges['30d']),
					icon: 'lock',
				},
				{
					value: '90d',
					label: 'Last 90 days',
					active: isActivePreset(presetRanges['90d']),
					disabled: true,
				},
			]);

			function applyPreset(value: string | number) {
				const presetRange = presetRanges[String(value)];
				if (!presetRange) return;

				range.value = {
					start: presetRange.start?.copy(),
					end: presetRange.end?.copy(),
				};
				open.value = false;
			}

			return {
				open,
				range,
				presets,
				applyPreset,
				formatDateRangeValue,
			};
		},
		template: `
			<DateRangePicker
				v-model="range"
				v-model:open="open"
				:presets="presets"
				hide-today
				locale="en-GB"
				@select="applyPreset"
			>
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(range, { locale: 'en-GB' }) || 'Select range' }}
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
			const range = ref({
				start: today('UTC'),
				end: today('UTC'),
			});

			return { range, formatDateValue };
		},
		template: `
			<DateRangePicker v-model="range" single locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateValue(range.start, { locale: 'en-GB' }) || 'Select date' }}
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
			const range = ref({
				start: new CalendarDateTime(now.year, now.month, now.day, 9, 0, 0),
				end: new CalendarDateTime(now.year, now.month, now.day, 17, 0, 0),
			});

			return { range, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="range" show-time locale="en-GB">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(range, { locale: 'en-GB', includeTime: true }) || 'Select date and time' }}
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
			const range = ref({
				start: new CalendarDateTime(now.year, now.month, now.day, 9, 0, 0),
				end: new CalendarDateTime(now.year, now.month, now.day, 17, 0, 0),
			});

			return { range, formatDateRangeValue };
		},
		template: `
			<DateRangePicker v-model="range" show-time :hour-cycle="12" locale="en-US">
				<template #trigger>
					<N8nButton variant="subtle" icon="calendar">
						{{ formatDateRangeValue(range, { locale: 'en-US', includeTime: true, hourCycle: 12 }) || 'Select date and time' }}
					</N8nButton>
				</template>
			</DateRangePicker>
		`,
	}),
};
