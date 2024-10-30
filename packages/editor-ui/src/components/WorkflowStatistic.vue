<script setup lang="ts">
import { type ExecutionStatistics } from '@/Interface';

const props = defineProps<{
	statistic?: ExecutionStatistics;
}>();

const total = props.statistic ? props.statistic.successes + props.statistic.errors : 0;

const tooltip = `
<p>${total} production executions since creation</p>
<p>${props.statistic?.successes || 0} successful</p>
<p>${props.statistic?.errors || 0} failed</p>
`;
</script>

<template>
	<n8n-tooltip v-if="statistic && total" placement="top">
		<div class="statusText">
			<span class="info-wrapper">
				<n8n-icon icon="tasks" color="info" />
				<n8n-text color="text-base" size="small" bold
					>{{ total }}<span class="separator">|</span></n8n-text
				>
			</span>
			<span v-if="statistic?.successes" class="info-wrapper">
				<n8n-icon icon="check-circle" color="success" />
				<n8n-text color="text-base" size="small" bold
					>{{ statistic.successes
					}}<span v-if="statistic?.errors" class="separator">|</span></n8n-text
				>
			</span>
			<span v-if="statistic?.errors" class="info-wrapper">
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
	padding-right: var(--spacing-s);
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
}

.separator {
	margin: 0 var(--spacing-3xs);
}
</style>
