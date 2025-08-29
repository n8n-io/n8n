<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { computed } from 'vue';
import type { CloudPlanAndUsageData } from '@/Interface';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const PROGRESS_BAR_MINIMUM_THRESHOLD = 8;

const cloudPlanStore = useCloudPlanStore();

const pageRedirectionHelper = usePageRedirectionHelper();

const trialDaysLeft = computed(() => -1 * cloudPlanStore.trialDaysLeft);
const messageText = computed(() => {
	return locale.baseText('banners.trial.message', {
		adjustToNumber: trialDaysLeft.value,
		interpolate: { count: String(trialDaysLeft.value) },
	});
});
const cloudPlanData = computed<CloudPlanAndUsageData | null>(() => {
	const planData = cloudPlanStore.currentPlanData;
	const usage = cloudPlanStore.currentUsageData;
	if (!planData || !usage) return null;
	return {
		...planData,
		usage,
	};
});
const trialHasExecutionsLeft = computed(() => {
	if (!cloudPlanData.value?.usage) return 0;
	return cloudPlanData.value.usage.executions < cloudPlanData.value.monthlyExecutionsLimit;
});
const currentExecutionsWithThreshold = computed(() => {
	if (!cloudPlanData.value?.usage) return 0;
	const usedExecutions = cloudPlanData.value.usage.executions;
	const executionsQuota = cloudPlanData.value.monthlyExecutionsLimit;
	const threshold = (PROGRESS_BAR_MINIMUM_THRESHOLD * executionsQuota) / 100;
	return usedExecutions < threshold ? threshold : usedExecutions;
});
const maxExecutions = computed(() => {
	if (!cloudPlanData.value?.monthlyExecutionsLimit) return 0;
	return cloudPlanData.value.monthlyExecutionsLimit;
});
const currentExecutions = computed(() => {
	if (!cloudPlanData.value?.usage) return 0;
	const usedExecutions = cloudPlanData.value.usage.executions;
	const executionsQuota = cloudPlanData.value.monthlyExecutionsLimit;
	return usedExecutions > executionsQuota ? executionsQuota : usedExecutions;
});

function onUpdatePlanClick() {
	void pageRedirectionHelper.goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
}
</script>

<template>
	<BaseBanner name="TRIAL" theme="custom">
		<template #mainContent>
			<div :class="$style.content">
				<span>{{ messageText }}</span>
				<span :class="$style.pipe"> | </span>
				<div :class="$style.usageCounter">
					<div :class="$style.progressBarDiv">
						<progress
							:class="[
								trialHasExecutionsLeft ? $style.progressBarSuccess : $style.progressBarDanger,
								$style.progressBar,
							]"
							:value="currentExecutionsWithThreshold"
							:max="maxExecutions"
						></progress>
					</div>
					<div :class="$style.executionsCountSection">
						<N8nText size="xsmall" :color="trialHasExecutionsLeft ? 'text-dark' : 'danger'">
							{{ currentExecutions }}/{{ maxExecutions }} </N8nText
						>&nbsp;<N8nText
							size="xsmall"
							:color="trialHasExecutionsLeft ? 'text-dark' : 'danger'"
							>{{ locale.baseText('executionUsage.label.executions') }}</N8nText
						>
					</div>
				</div>
			</div>
		</template>
		<template #trailingContent>
			<n8n-button type="success" icon="gem" size="small" @click="onUpdatePlanClick">{{
				locale.baseText('generic.upgradeNow')
			}}</n8n-button>
		</template>
	</BaseBanner>
</template>

<style module lang="scss">
.content {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.pipe {
	display: inline-block;
	font-size: var(--font-size-m);
	padding: 0 0 2px;
}

.progressBarDiv {
	display: flex;
	align-items: center;
}

.progressBar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color-foreground-base);
}
.progressBar::-webkit-progress-bar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color-foreground-base);
}
.progressBar::-moz-progress-bar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color-foreground-base);
}

.progressBarSuccess::-moz-progress-bar {
	background: var(--color-foreground-xdark);
	border-radius: 20px;
}

.progressBarSuccess::-webkit-progress-value {
	background: var(--color-foreground-xdark);
	border-radius: 20px;
}

.progressBarDanger::-webkit-progress-value {
	background: var(--color-danger);
	border-radius: 20px;
}

.progressBarDanger::-moz-progress-bar {
	background: var(--color-danger);
}

.usageText {
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-s);
	margin-top: var(--spacing-xs);
	line-height: var(--spacing-xs);
}

.usageCounter {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size-3xs);
}

.danger {
	color: var(--color-danger);
}

.executionsCountSection {
	margin-left: var(--spacing-xs);
}
</style>
