<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElOption } from 'element-plus';
import { N8nInputLabel, N8nSelect, N8nInputNumber, N8nText, N8nCheckbox } from '@n8n/design-system';
import type { CronSimpleConfig } from './types';

interface Props {
	config: CronSimpleConfig;
}

interface Emits {
	(e: 'update:config', config: CronSimpleConfig): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const weekdays = [
	{ label: 'Sun', value: 0 },
	{ label: 'Mon', value: 1 },
	{ label: 'Tue', value: 2 },
	{ label: 'Wed', value: 3 },
	{ label: 'Thu', value: 4 },
	{ label: 'Fri', value: 5 },
	{ label: 'Sat', value: 6 },
];

const localConfig = ref<CronSimpleConfig>({ ...props.config });

watch(
	() => props.config,
	(newConfig) => {
		localConfig.value = { ...newConfig };
	},
	{ deep: true },
);

function isDaySelected(day: number): boolean {
	return localConfig.value.dayOfWeek?.includes(day) || false;
}

function handleDayToggle(day: number, checked: boolean) {
	if (!localConfig.value.dayOfWeek) {
		localConfig.value.dayOfWeek = [];
	}

	if (checked) {
		if (!localConfig.value.dayOfWeek.includes(day)) {
			localConfig.value.dayOfWeek.push(day);
		}
	} else {
		localConfig.value.dayOfWeek = localConfig.value.dayOfWeek.filter((d) => d !== day);
	}

	handleUpdate();
}

function getSelectedDaysText(): string {
	const days = localConfig.value.dayOfWeek || [];
	if (days.length === 0) return 'every day';
	if (days.length === 7) return 'every day';

	const dayNames = days
		.sort()
		.map((d) => weekdays.find((wd) => wd.value === d)?.label)
		.filter(Boolean);

	if (dayNames.length === 1) return `every ${dayNames[0]}`;
	if (dayNames.length === 2) return `every ${dayNames.join(' and ')}`;

	const last = dayNames.pop();
	return `every ${dayNames.join(', ')}, and ${last}`;
}

function formatTime(hour: number, minute: number): string {
	const h = hour % 12 || 12;
	const m = minute.toString().padStart(2, '0');
	const period = hour < 12 ? 'AM' : 'PM';
	return `${h}:${m} ${period}`;
}

function handleUpdate() {
	emit('update:config', { ...localConfig.value });
}
</script>

<template>
	<div class="cron-simple-mode">
		<div class="cron-simple-mode__field">
			<N8nInputLabel label="Frequency" />
			<N8nSelect v-model="localConfig.frequency" @update:model-value="handleUpdate">
				<ElOption label="Every minute" value="minute" />
				<ElOption label="Hourly" value="hourly" />
				<ElOption label="Daily" value="daily" />
				<ElOption label="Weekly" value="weekly" />
				<ElOption label="Monthly" value="monthly" />
			</N8nSelect>
		</div>

		<div v-if="localConfig.frequency === 'hourly'" class="cron-simple-mode__field">
			<N8nInputLabel label="At minute" />
			<N8nInputNumber
				v-model="localConfig.minute"
				:min="0"
				:max="59"
				:step="1"
				@update:model-value="handleUpdate"
			/>
			<N8nText size="small" color="text-light"
				>Runs at minute {{ localConfig.minute || 0 }} of every hour</N8nText
			>
		</div>

		<div v-if="localConfig.frequency === 'daily'" class="cron-simple-mode__fields-group">
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Hour" />
				<N8nInputNumber
					v-model="localConfig.hour"
					:min="0"
					:max="23"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Minute" />
				<N8nInputNumber
					v-model="localConfig.minute"
					:min="0"
					:max="59"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<N8nText size="small" color="text-light">
				Runs daily at {{ formatTime(localConfig.hour || 0, localConfig.minute || 0) }}
			</N8nText>
		</div>

		<div v-if="localConfig.frequency === 'weekly'" class="cron-simple-mode__fields-group">
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Days of Week" />
				<div class="cron-simple-mode__weekdays">
					<N8nCheckbox
						v-for="day in weekdays"
						:key="day.value"
						:model-value="isDaySelected(day.value)"
						:label="day.label"
						@update:model-value="(checked) => handleDayToggle(day.value, checked)"
					/>
				</div>
			</div>
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Hour" />
				<N8nInputNumber
					v-model="localConfig.hour"
					:min="0"
					:max="23"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Minute" />
				<N8nInputNumber
					v-model="localConfig.minute"
					:min="0"
					:max="59"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<N8nText size="small" color="text-light">
				Runs {{ getSelectedDaysText() }} at
				{{ formatTime(localConfig.hour || 0, localConfig.minute || 0) }}
			</N8nText>
		</div>

		<div v-if="localConfig.frequency === 'monthly'" class="cron-simple-mode__fields-group">
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Day of Month" />
				<N8nInputNumber
					v-model="localConfig.dayOfMonth"
					:min="1"
					:max="31"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Hour" />
				<N8nInputNumber
					v-model="localConfig.hour"
					:min="0"
					:max="23"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<div class="cron-simple-mode__field">
				<N8nInputLabel label="Minute" />
				<N8nInputNumber
					v-model="localConfig.minute"
					:min="0"
					:max="59"
					:step="1"
					@update:model-value="handleUpdate"
				/>
			</div>
			<N8nText size="small" color="text-light">
				Runs on day {{ localConfig.dayOfMonth || 1 }} of every month at
				{{ formatTime(localConfig.hour || 0, localConfig.minute || 0) }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.cron-simple-mode {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--s);

	&__field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
	}

	&__fields-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	&__weekdays {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing--xs);
		padding: var(--spacing--xs);
		background: var(--color--background-base);
		border: 1px solid var(--color--foreground-base);
		border-radius: var(--radius);
	}
}
</style>
