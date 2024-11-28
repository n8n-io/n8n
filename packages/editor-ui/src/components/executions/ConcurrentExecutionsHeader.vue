<script lang="ts" setup>
import { computed, defineProps } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const props = defineProps<{
	runningExecutionsCount: number;
	concurrencyCap: number;
}>();

const i18n = useI18n();
const pageRedirectionHelper = usePageRedirectionHelper();

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

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('concurrency', 'upgrade-concurrency');
};
</script>

<template>
	<div data-test-id="concurrent-executions-header">
		<n8n-tooltip>
			<template #content>
				<div :class="$style.tooltip">
					{{ tooltipText }}
					<n8n-link bold size="small" :class="$style.upgrade" @click="goToUpgrade">
						{{ i18n.baseText('generic.upgradeNow') }}
					</n8n-link>
				</div>
			</template>
			<font-awesome-icon icon="info-circle" class="mr-2xs" />
		</n8n-tooltip>
		<n8n-text>{{ headerText }}</n8n-text>
	</div>
</template>

<style module scoped>
.tooltip {
	display: flex;
	flex-direction: column;
}
.upgrade {
	margin-top: var(--spacing-xs);
}
</style>
