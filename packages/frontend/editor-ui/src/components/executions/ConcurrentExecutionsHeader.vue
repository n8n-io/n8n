<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	runningExecutionsCount: number;
	concurrencyCap: number;
	isCloudDeployment?: boolean;
}>();

const emit = defineEmits<{
	goToUpgrade: [];
}>();

const i18n = useI18n();

const tooltipText = computed(() => {
	let text = i18n.baseText('executionsList.activeExecutions.tooltip', {
		interpolate: {
			running: props.runningExecutionsCount,
			cap: props.concurrencyCap,
		},
	});

	text += '\n' + i18n.baseText('executionsList.activeExecutions.evaluationNote');

	return text;
});

const headerText = computed(() => {
	if (props.runningExecutionsCount === 0) {
		return i18n.baseText('executionsList.activeExecutions.none');
	}
	return i18n.baseText('executionsList.activeExecutions.header', {
		interpolate: {
			running: props.runningExecutionsCount,
			cap: props.concurrencyCap,
		},
	});
});
</script>

<template>
	<div data-test-id="concurrent-executions-header">
		<n8n-text>{{ headerText }}</n8n-text>
		<n8n-tooltip>
			<template #content>
				<div :class="$style.tooltip">
					{{ tooltipText }}
					<N8nLink
						v-if="props.isCloudDeployment"
						bold
						size="small"
						:class="$style.link"
						@click="emit('goToUpgrade')"
					>
						{{ i18n.baseText('generic.upgradeNow') }}
					</N8nLink>
					<N8nLink
						v-else
						:class="$style.link"
						:href="i18n.baseText('executions.concurrency.docsLink')"
						target="_blank"
						>{{ i18n.baseText('generic.viewDocs') }}</N8nLink
					>
				</div>
			</template>
			<n8n-icon icon="info" class="ml-2xs" />
		</n8n-tooltip>
	</div>
</template>

<style lang="scss" module>
.tooltip {
	display: flex;
	flex-direction: column;
}
.link {
	margin-top: var(--spacing-xs);
}
</style>
