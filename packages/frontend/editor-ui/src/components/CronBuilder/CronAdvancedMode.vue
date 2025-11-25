<template>
	<div class="cron-advanced-mode">
		<N8nNotice type="info" :dismissible="false">
			Advanced mode allows you to select specific values for each cron field. Leave fields empty to
			use "*" (any value).
		</N8nNotice>

		<div class="cron-advanced-mode__fields">
			<div class="cron-advanced-mode__field">
				<N8nInputLabel label="Minutes (0-59)" />
				<N8nSelect
					v-model="localConfig.minutes"
					multiple
					:multiple-limit="0"
					placeholder="Any minute (*)"
					@update:model-value="handleUpdate"
				>
					<el-option
						v-for="minute in minuteOptions"
						:key="minute"
						:label="minute.toString()"
						:value="minute"
					/>
				</N8nSelect>
				<N8nText v-if="localConfig.minutes.length > 0" size="small" color="text-light">
					Selected: {{ formatSelection(localConfig.minutes) }}
				</N8nText>
			</div>

			<div class="cron-advanced-mode__field">
				<N8nInputLabel label="Hours (0-23)" />
				<N8nSelect
					v-model="localConfig.hours"
					multiple
					:multiple-limit="0"
					placeholder="Any hour (*)"
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
					Selected: {{ formatHourSelection(localConfig.hours) }}
				</N8nText>
			</div>

			<div class="cron-advanced-mode__field">
				<N8nInputLabel label="Days of Month (1-31)" />
				<N8nSelect
					v-model="localConfig.daysOfMonth"
					multiple
					:multiple-limit="0"
					placeholder="Any day (*)"
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
					Selected: {{ formatSelection(localConfig.daysOfMonth) }}
				</N8nText>
			</div>

			<div class="cron-advanced-mode__field">
				<N8nInputLabel label="Months (1-12)" />
				<N8nSelect
					v-model="localConfig.months"
					multiple
					:multiple-limit="0"
					placeholder="Any month (*)"
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
					Selected: {{ formatMonthSelection(localConfig.months) }}
				</N8nText>
			</div>

			<div class="cron-advanced-mode__field">
				<N8nInputLabel label="Days of Week (0-6, 0=Sunday)" />
				<N8nSelect
					v-model="localConfig.daysOfWeek"
					multiple
					:multiple-limit="0"
					placeholder="Any day (*)"
					@update:model-value="handleUpdate"
				>
					<el-option
						v-for="(dayName, index) in dayNames"
						:key="index"
						:label="dayName"
						:value="index"
					/>
				</N8nSelect>
				<N8nText v-if="localConfig.daysOfWeek.length > 0" size="small" color="text-light">
					Selected: {{ formatDayOfWeekSelection(localConfig.daysOfWeek) }}
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
import { N8nNotice, N8nInputLabel, N8nSelect, N8nText } from '@n8n/design-system';
import type { CronAdvancedConfig } from './types';
import { generateFromAdvancedMode } from './utils/cronExpressionGenerator';

interface Props {
	config: CronAdvancedConfig;
}

interface Emits {
	(e: 'update:config', config: CronAdvancedConfig): void;
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

function handleUpdate() {
	emit('update:config', { ...localConfig.value });
}
</script>

<style lang="scss" scoped>
.cron-advanced-mode {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--s);

	&__fields {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--s);
	}

	&__field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
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
