<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nText, N8nIcon, N8nSpinner } from '@n8n/design-system';
import type { NextRun } from './types';
import {
	calculateNextRuns,
	getTimeUntilNextRun,
	checkExecutionFrequency,
	getExecutionFrequencyDescription,
} from './utils/nextRunsCalculator';

interface Props {
	expression: string;
	timezone?: string;
}

const props = defineProps<Props>();

const isLoading = ref(false);
const error = ref<string | null>(null);
const nextRuns = ref<NextRun[]>([]);
const timeUntilNext = ref<string | null>(null);
const frequencyWarning = ref<string | null>(null);
const executionFrequency = ref<string | null>(null);

const calculateRuns = () => {
	if (!props.expression || props.expression.trim() === '') {
		nextRuns.value = [];
		error.value = null;
		timeUntilNext.value = null;
		frequencyWarning.value = null;
		executionFrequency.value = null;
		return;
	}

	isLoading.value = true;
	error.value = null;
	frequencyWarning.value = null;
	executionFrequency.value = null;

	try {
		const runs = calculateNextRuns(props.expression, 5, props.timezone);
		nextRuns.value = runs;

		if (runs.length > 0) {
			timeUntilNext.value = getTimeUntilNextRun(props.expression);

			const frequencyCheck = checkExecutionFrequency(props.expression);
			if (!frequencyCheck.isReasonable && frequencyCheck.warning) {
				frequencyWarning.value = frequencyCheck.warning;
			}

			executionFrequency.value = getExecutionFrequencyDescription(props.expression);
		}

		error.value = null;
	} catch (err) {
		error.value = err instanceof Error ? err.message : 'Failed to calculate next runs';
		nextRuns.value = [];
	} finally {
		isLoading.value = false;
	}
};

watch(
	() => [props.expression, props.timezone],
	() => {
		calculateRuns();
	},
	{ immediate: true },
);
</script>

<template>
	<div class="cron-next-runs-preview">
		<div class="cron-next-runs-preview__header">
			<N8nText bold>Next Scheduled Runs</N8nText>
			<N8nIcon icon="clock" size="small" />
		</div>

		<div v-if="isLoading" class="cron-next-runs-preview__loading">
			<N8nSpinner size="small" />
			<N8nText size="small" color="text-light">Calculating next runs...</N8nText>
		</div>

		<div v-else-if="error" class="cron-next-runs-preview__error">
			<N8nIcon icon="exclamation-triangle" color="danger" />
			<N8nText size="small" color="danger">{{ error }}</N8nText>
		</div>

		<div v-else-if="nextRuns.length === 0" class="cron-next-runs-preview__empty">
			<N8nText size="small" color="text-light">
				No upcoming runs could be calculated. Please check your cron expression.
			</N8nText>
		</div>

		<div v-else class="cron-next-runs-preview__list">
			<div
				v-for="(run, index) in nextRuns"
				:key="run.timestamp"
				class="cron-next-runs-preview__item"
			>
				<div class="cron-next-runs-preview__item-number">
					<N8nText size="small" color="text-light">#{{ index + 1 }}</N8nText>
				</div>
				<div class="cron-next-runs-preview__item-details">
					<N8nText size="small" bold>{{ run.readable }}</N8nText>
					<N8nText v-if="index === 0 && timeUntilNext" size="xsmall" color="text-light">
						{{ timeUntilNext }}
					</N8nText>
				</div>
			</div>
		</div>

		<div v-if="frequencyWarning" class="cron-next-runs-preview__warning">
			<N8nIcon icon="exclamation-circle" color="warning" size="small" />
			<N8nText size="small" color="warning">{{ frequencyWarning }}</N8nText>
		</div>

		<div v-if="executionFrequency" class="cron-next-runs-preview__frequency">
			<N8nText size="small" color="text-light">
				<strong>Frequency:</strong> {{ executionFrequency }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.cron-next-runs-preview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	&__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: var(--spacing--2xs);
		border-bottom: 1px solid var(--color--foreground-base);
	}

	&__loading,
	&__empty,
	&__error {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing--2xs);
		padding: var(--spacing--s);
		background: var(--color--background-light);
		border-radius: var(--radius);
	}

	&__error {
		background: var(--color--danger-tint-2);
	}

	&__list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
	}

	&__item {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing--xs);
		padding: var(--spacing--2xs) var(--spacing--xs);
		background: var(--color--background-base);
		border: 1px solid var(--color--foreground-base);
		border-radius: var(--radius);
		transition: background 0.2s ease;

		&:hover {
			background: var(--color--background-light);
		}

		&:first-child {
			border-color: var(--color--success);
			background: var(--color--success-tint-2);
		}
	}

	&__item-number {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 24px;
		background: var(--color--background-dark);
		border-radius: 50%;
	}

	&__item-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--4xs);
		flex: 1;
	}

	&__warning {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);
		padding: var(--spacing--2xs) var(--spacing--xs);
		background: var(--color--warning-tint-2);
		border: 1px solid var(--color--warning);
		border-radius: var(--radius);
	}

	&__frequency {
		padding: var(--spacing--2xs) var(--spacing--xs);
		background: var(--color--background-light);
		border-radius: var(--radius);
		text-align: center;
	}
}
</style>
