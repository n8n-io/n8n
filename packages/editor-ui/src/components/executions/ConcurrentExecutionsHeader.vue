<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	runningExecutionsCount: number;
	concurrencyCap: number;
}>();

const i18n = useI18n();

const tooltipText = computed(() =>
	i18n.baseText('executionsList.activeExecutions.tooltip', {
		interpolate: {
			running: props.runningExecutionsCount,
			cap: props.concurrencyCap,
		},
	}),
);

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
	<div data-test-id="concurrent-executions-header" class="mr-s">
		<n8n-tooltip>
			<template #content>
				<div :class="$style.tooltip">
					{{ tooltipText }}
					<slot>
						<N8nLink
							:class="$style.link"
							:href="i18n.baseText('executions.concurrency.docsLink')"
							target="_blank"
							>{{ i18n.baseText('generic.viewDocs') }}</N8nLink
						>
					</slot>
				</div>
			</template>
			<font-awesome-icon icon="info-circle" class="mr-2xs" />
		</n8n-tooltip>
		<n8n-text>{{ headerText }}</n8n-text>
	</div>
</template>

<style lang="scss" module>
.tooltip {
	display: flex;
	flex-direction: column;
}
.link {
	display: inline-block;
	margin-top: var(--spacing-xs);
}
</style>
