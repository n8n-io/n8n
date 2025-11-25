<template>
	<div class="cron-advanced-mode">
		<N8nNotice type="info" :dismissible="false">
			Select specific values for each field. Empty selections default to "*" (any value).
		</N8nNotice>

		<div class="cron-advanced-mode__grid">
			<!-- Minutes Section -->
			<div class="cron-advanced-mode__section">
				<div class="cron-advanced-mode__section-header">
					<N8nText bold>Minutes</N8nText>
					<N8nButton
						v-if="localConfig.minutes.length > 0"
						type="tertiary"
						size="mini"
						@click="clearField('minutes')"
					>
						Clear
					</N8nButton>
				</div>
				<div class="cron-advanced-mode__quick-select">
					<N8nButton
						v-for="preset in minutePresets"
						:key="preset.label"
						:type="isPresetActive('minutes', preset.values) ? 'primary' : 'tertiary'"
						size="mini"
						@click="applyPreset('minutes', preset.values)"
					>
						{{ preset.label }}
					</N8nButton>
				</div>
				<N8nSelect
					v-model="localConfig.minutes"
					multiple
					:multiple-limit="0"
					placeholder="Any minute (*)"
					size="small"
					@update:model-value="handleUpdate"
				>
					<el-option
						v-for="minute in minuteOptions"
						:key="minute"
						:label="minute.toString().padStart(2, '0')"
						:value="minute"
					/>
				</N8nSelect>
				<N8nText v-if="localConfig.minutes.length > 0" size="small" color="text-light">
					{{ formatSelection(localConfig.minutes) }}
				</N8nText>
			</div>

			<!-- Hours Section -->
			<div class="cron-advanced-mode__section">
				<div class="cron-advanced-mode__section-header">
					<N8nText bold>Hours</N8nText>
					<N8nButton
						v-if="localConfig.hours.length > 0"
						type="tertiary"
						size="mini"
						@click="clearField('hours')"
					>
						Clear
					</N8nButton>
				</div>
				<div class="cron-advanced-mode__quick-select">
					<N8nButton
						v-for="preset in hourPresets"
						:key="preset.label"
						:type="isPresetActive('hours', preset.values) ? 'primary' : 'tertiary'"
						size="mini"
						@click="applyPreset('hours', preset.values)"
					>
						{{ preset.label }}
					</N8nButton>
				</div>
				<N8nSelect
					v-model="localConfig.hours"
					multiple
					:multiple-limit="0"
					placeholder="Any hour (*)"
					size="small"
					@update:model-value="handleUpdate"
				>
					<el-option
						v-for="hour in hourOptions"
						:key="hour"
						:label="formatHour(hour)"
						:value="hour"
					/>
				</N8nSelect>
				<N8nText v-if="localConfig.hours.length > 0" size="small" color="text-light">
					{{ formatHourSelection(localConfig.hours) }}
				</N8nText>
			</div>

			<!-- Days of Month Section -->
			<div class="cron-advanced-mode__section">
				<div class="cron-advanced-mode__section-header">
					<N8nText bold>Days of Month</N8nText>
					<N8nButton
						v-if="localConfig.daysOfMonth.length > 0"
						type="tertiary"
						size="mini"
						@click="clearField('daysOfMonth')"
					>
						Clear
					</N8nButton>
				</div>
				<div class="cron-advanced-mode__quick-select">
					<N8nButton
						v-for="preset in dayOfMonthPresets"
						:key="preset.label"
						:type="isPresetActive('daysOfMonth', preset.values) ? 'primary' : 'tertiary'"
						size="mini"
						@click="applyPreset('daysOfMonth', preset.values)"
					>
						{{ preset.label }}
					</N8nButton>
				</div>
				<N8nSelect
					v-model="localConfig.daysOfMonth"
					multiple
					:multiple-limit="0"
					placeholder="Any day (*)"
					size="small"
					@update:model-value="handleUpdate"
				>
					<el-option
						v-for="day in dayOfMonthOptions"
						:key="day"
						:label="day.toString()"
						:value="day"
					/>
				</N8nSelect>
				<N8nText v-if="localConfig.daysOfMonth.length > 0" size="small" color="text-light">
					{{ formatSelection(localConfig.daysOfMonth) }}
				</N8nText>
			</div>

			<!-- Months Section -->
			<div class="cron-advanced-mode__section">
				<div class="cron-advanced-mode__section-header">
					<N8nText bold>Months</N8nText>
					<N8nButton
						v-if="localConfig.months.length > 0"
						type="tertiary"
						size="mini"
						@click="clearField('months')"
					>
						Clear
					</N8nButton>
				</div>
				<div class="cron-advanced-mode__quick-select">
					<N8nButton
						v-for="preset in monthPresets"
						:key="preset.label"
						:type="isPresetActive('months', preset.values) ? 'primary' : 'tertiary'"
						size="mini"
						@click="applyPreset('months', preset.values)"
					>
						{{ preset.label }}
					</N8nButton>
				</div>
				<N8nSelect
					v-model="localConfig.months"
					multiple
					:multiple-limit="0"
					placeholder="Any month (*)"
					size="small"
					@update:model-value="handleUpdate"
				>
					<el-option
						v-for="(monthName, index) in monthNames"
						:key="index + 1"
						:label="monthName"
						:value="index + 1"
					/>
				</N8nSelect>
				<N8nText v-if="localConfig.months.length > 0" size="small" color="text-light">
					{{ formatMonthSelection(localConfig.months) }}
				</N8nText>
			</div>

			<!-- Days of Week Section -->
			<div class="cron-advanced-mode__section">
				<div class="cron-advanced-mode__section-header">
					<N8nText bold>Days of Week</N8nText>
					<N8nButton
						v-if="localConfig.daysOfWeek.length > 0"
						type="tertiary"
						size="mini"
						@click="clearField('daysOfWeek')"
					>
						Clear
					</N8nButton>
				</div>
				<div class="cron-advanced-mode__button-group">
					<N8nButton
						v-for="(dayName, index) in dayNames"
						:key="index"
						:type="localConfig.daysOfWeek.includes(index) ? 'primary' : 'secondary'"
						:outline="!localConfig.daysOfWeek.includes(index)"
						size="small"
						@click="toggleDay(index)"
					>
						{{ dayName.slice(0, 3) }}
					</N8nButton>
				</div>
				<N8nText v-if="localConfig.daysOfWeek.length > 0" size="small" color="text-light">
					{{ formatDayOfWeekSelection(localConfig.daysOfWeek) }}
				</N8nText>
			</div>
		</div>

		<div class="cron-advanced-mode__preview">
			<N8nText size="small" bold>Generated Expression:</N8nText>
			<div class="cron-advanced-mode__expression">
				<code>{{ generatedExpression }}</code>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElOption } from 'element-plus';
import { N8nNotice, N8nButton, N8nSelect, N8nText } from '@n8n/design-system';
import type { CronAdvancedConfig } from './types';
import { generateFromAdvancedMode } from './utils/cronExpressionGenerator';

interface Props {
	config: CronAdvancedConfig;
}

interface Emits {
	(e: 'update:config', config: CronAdvancedConfig): void;
}

interface Preset {
	label: string;
	values: number[];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const minuteOptions = Array.from({ length: 60 }, (_, i) => i);
const hourOptions = Array.from({ length: 24 }, (_, i) => i);
const dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => i + 1);

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const minutePresets: Preset[] = [
	{ label: 'Every 15m', values: [0, 15, 30, 45] },
	{ label: 'Every 30m', values: [0, 30] },
	{ label: 'Top of hour', values: [0] },
];

const hourPresets: Preset[] = [
	{ label: 'Business (9-5)', values: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
	{ label: 'Morning (6-12)', values: [6, 7, 8, 9, 10, 11, 12] },
	{ label: 'Evening (18-23)', values: [18, 19, 20, 21, 22, 23] },
];

const dayOfMonthPresets: Preset[] = [
	{ label: 'Start', values: [1] },
	{ label: 'Mid', values: [15] },
	{ label: 'End', values: [28, 29, 30, 31] },
];

const monthPresets: Preset[] = [
	{ label: 'Q1', values: [1, 2, 3] },
	{ label: 'Q2', values: [4, 5, 6] },
	{ label: 'Q3', values: [7, 8, 9] },
	{ label: 'Q4', values: [10, 11, 12] },
];

const localConfig = ref<CronAdvancedConfig>({ ...props.config });

const generatedExpression = computed(() => {
	return generateFromAdvancedMode(localConfig.value);
});

watch(
	() => props.config,
	(newConfig) => {
		localConfig.value = { ...newConfig };
	},
	{ deep: true },
);

function formatHour(hour: number): string {
	const h = hour % 12 || 12;
	const period = hour < 12 ? 'AM' : 'PM';
	return `${hour} (${h} ${period})`;
}

function formatSelection(values: number[]): string {
	if (values.length === 0) return '';
	if (values.length <= 5) return values.sort((a, b) => a - b).join(', ');
	const sorted = [...values].sort((a, b) => a - b);
	return `${sorted.slice(0, 5).join(', ')}... (${values.length} selected)`;
}

function formatHourSelection(hours: number[]): string {
	if (hours.length === 0) return '';
	if (hours.length <= 3) {
		return hours
			.sort((a, b) => a - b)
			.map((h) => formatHour(h))
			.join(', ');
	}
	const sorted = [...hours].sort((a, b) => a - b);
	return `${sorted
		.slice(0, 3)
		.map((h) => formatHour(h))
		.join(', ')}... (${hours.length} selected)`;
}

function formatMonthSelection(months: number[]): string {
	if (months.length === 0) return '';
	if (months.length <= 3) {
		return months
			.sort((a, b) => a - b)
			.map((m) => monthNames[m - 1])
			.join(', ');
	}
	const sorted = [...months].sort((a, b) => a - b);
	return `${sorted
		.slice(0, 3)
		.map((m) => monthNames[m - 1])
		.join(', ')}... (${months.length} selected)`;
}

function formatDayOfWeekSelection(days: number[]): string {
	if (days.length === 0) return '';
	if (days.length === 7) return 'Every day';
	return days
		.sort((a, b) => a - b)
		.map((d) => dayNames[d])
		.join(', ');
}

function clearField(field: keyof CronAdvancedConfig) {
	localConfig.value[field] = [];
	handleUpdate();
}

function applyPreset(field: keyof CronAdvancedConfig, values: number[]) {
	const currentValues = localConfig.value[field] as number[];
	const allSelected = values.every((v) => currentValues.includes(v));

	if (allSelected) {
		// Deselect all preset values
		localConfig.value[field] = currentValues.filter((v) => !values.includes(v)) as never;
	} else {
		// Select all preset values
		const newValues = [...new Set([...currentValues, ...values])];
		localConfig.value[field] = newValues as never;
	}
	handleUpdate();
}

function isPresetActive(field: keyof CronAdvancedConfig, values: number[]): boolean {
	const currentValues = localConfig.value[field] as number[];
	return values.length > 0 && values.every((v) => currentValues.includes(v));
}

function toggleDay(index: number) {
	const days = localConfig.value.daysOfWeek;
	const dayIndex = days.indexOf(index);

	if (dayIndex > -1) {
		days.splice(dayIndex, 1);
	} else {
		days.push(index);
	}
	handleUpdate();
}

function handleUpdate() {
	emit('update:config', { ...localConfig.value });
}
</script>

<style lang="scss" scoped>
.cron-advanced-mode {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--s);

	&__grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing--s);

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	&__section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
		padding: var(--spacing--xs);
		background: var(--color--background-base);
		border: 1px solid var(--color--foreground-base);
		border-radius: var(--radius);
	}

	&__section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: var(--spacing--2xs);
		border-bottom: 1px solid var(--color--foreground-base);
	}

	&__quick-select {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing--3xs);
	}

	&__button-group {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing--3xs);
	}

	&__preview {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
		padding: var(--spacing--xs);
		background: var(--color--background-light);
		border: 1px solid var(--color--foreground-base);
		border-radius: var(--radius);
	}

	&__expression {
		padding: var(--spacing--xs);
		background: var(--color--background-dark);
		border-radius: var(--radius--sm);
		font-family: var(--font-family--monospace);

		code {
			font-size: var(--font-size--s);
			color: var(--color--text-dark);
		}
	}
}
</style>
