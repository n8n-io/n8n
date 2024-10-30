<script setup lang="ts">
import { type ExecutionStatistics } from '@/Interface';

const props = defineProps<{
	statistic?: ExecutionStatistics;
}>();

const total = props.statistic ? props.statistic.successes + props.statistic.errors : 0;

const tooltip = `
${total} production executions<br />
${props.statistic?.successes || 0} successful, ${props.statistic?.errors || 0} failed
`;
</script>

<template>
	<n8n-tooltip v-if="statistic && total" placement="top">
		<div class="statusText">
			<span class="info-wrapper info-wrapper__total">
				<n8n-icon icon="tasks" color="text-base" />
				<n8n-text color="text-base" size="small" bold>{{ total }}</n8n-text>
			</span>
			<span v-if="statistic?.successes" class="info-wrapper info-wrapper__success">
				<n8n-icon icon="check-circle" color="success" />
				<n8n-text color="text-base" size="small" bold>{{ statistic.successes }}</n8n-text>
			</span>
			<span v-if="statistic?.errors" class="info-wrapper info-wrapper__error">
				<n8n-icon icon="exclamation-triangle" color="danger" />
				<n8n-text color="text-base" size="small" bold> {{ statistic?.errors }} </n8n-text>
			</span>
		</div>
		<template #content>
			<n8n-text v-n8n-html="tooltip" size="small"></n8n-text>
		</template>
	</n8n-tooltip>
</template>

<style lang="scss" scoped>
.statusText {
	padding-right: var(--spacing-l);
	box-sizing: border-box;
	text-align: right;
	display: flex;
	align-items: center;
	justify-content: center;
}

.info-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-4xs);

	&__total .n8n-icon {
		color: var(--color-text-light);
	}

	&__success .n8n-icon {
		color: var(--execution-card-border-success);
	}

	&__error .n8n-icon {
		color: var(--execution-card-border-error);
	}

	&:not(:last-child) {
		margin-right: var(--spacing-2xs);
		padding-right: var(--spacing-2xs);
		border-right: 1px solid var(--color-foreground-base);
	}
}
</style>
