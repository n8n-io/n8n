<script lang="ts" setup>
import BaseBanner from './BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { computed } from 'vue';
import type { CloudPlanAndUsageData } from '@/Interface';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { N8nBadge, N8nButton, N8nText } from '@n8n/design-system';
import { usePostHog } from '@/app/stores/posthog.store';
import { TRIAL_BANNER_PERMANENT_EXPERIMENT } from '@/app/constants';

const posthog = usePostHog();
const WITH_TRIAL_BANNER_PERMANENT = computed(() =>
	posthog.isVariantEnabled(
		TRIAL_BANNER_PERMANENT_EXPERIMENT.name,
		TRIAL_BANNER_PERMANENT_EXPERIMENT.variant,
	),
);

const PROGRESS_BAR_MINIMUM_THRESHOLD = 8;

const cloudPlanStore = useCloudPlanStore();

const pageRedirectionHelper = usePageRedirectionHelper();

const shouldShowTrialBanner = computed(() => cloudPlanStore.shouldShowDynamicTrialBanner);
const trialBannerText = computed(() => cloudPlanStore.dynamicTrialBannerText);

const trialTimeLeft = computed(() => cloudPlanStore.trialTimeLeft);
const trialDaysLeft = computed(() => cloudPlanStore.trialDaysLeft);
const trialTotalDays = computed(() => {
	return cloudPlanStore.currentPlanData?.metadata?.trial?.length;
});
const trialProgressValue = computed(() => {
	if (!trialTotalDays.value || !trialDaysLeft.value) return 0;

	const maxDays = trialTotalDays.value;
	return maxDays - trialDaysLeft.value;
});

const messageText = computed(() => {
	const { count, unit } = trialTimeLeft.value;
	return locale.baseText(`banners.trial.message.${unit}`, {
		adjustToNumber: count,
		interpolate: { count: String(count) },
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
	if (shouldShowTrialBanner.value) {
		cloudPlanStore.dismissDynamicTrialBanner();
	}

	void pageRedirectionHelper.goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
}
</script>

<template>
	<BaseBanner name="TRIAL" theme="custom" :dismissible="WITH_TRIAL_BANNER_PERMANENT ? false : true">
		<template #mainContent>
			<div :class="$style.content">
				<span v-if="!WITH_TRIAL_BANNER_PERMANENT">{{ messageText }}</span>
				<span v-if="!WITH_TRIAL_BANNER_PERMANENT" :class="$style.pipe"> | </span>
				<div
					v-if="WITH_TRIAL_BANNER_PERMANENT ? currentExecutions !== 0 : true"
					:class="$style.usageCounter"
				>
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
			<progress
				v-if="WITH_TRIAL_BANNER_PERMANENT && trialProgressValue > 0"
				:class="$style.trialProgressBar"
				:value="trialProgressValue"
				:max="trialTotalDays"
			></progress>
			<span v-if="WITH_TRIAL_BANNER_PERMANENT">{{
				messageText.replace('in your n8n trial', '')
			}}</span>
			<div :class="$style.trailingContentWrapper">
				<N8nBadge
					v-if="shouldShowTrialBanner"
					:class="$style.dynamicBanner"
					size="small"
					:show-border="false"
					:bold="true"
					>{{ trialBannerText }}</N8nBadge
				>
				<N8nButton
					:wiggle-icon="WITH_TRIAL_BANNER_PERMANENT ? true : false"
					type="success"
					icon="zap"
					:size="WITH_TRIAL_BANNER_PERMANENT ? 'medium' : 'small'"
					@click="onUpdatePlanClick"
					>{{ locale.baseText('generic.upgradeNow') }}</N8nButton
				>
			</div>
		</template>
	</BaseBanner>
</template>

<style module lang="scss">
.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.pipe {
	display: inline-block;
	font-size: var(--font-size--md);
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
	background-color: var(--color--foreground);
}
.progressBar::-webkit-progress-bar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color--foreground);
}
.progressBar::-moz-progress-bar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color--foreground);
}

.progressBarSuccess::-moz-progress-bar {
	background: var(--color--foreground--shade-2);
	border-radius: 20px;
}

.progressBarSuccess::-webkit-progress-value {
	background: var(--color--foreground--shade-2);
	border-radius: 20px;
}

.progressBarDanger::-webkit-progress-value {
	background: var(--color--danger);
	border-radius: 20px;
}

.progressBarDanger::-moz-progress-bar {
	background: var(--color--danger);
}

.usageText {
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--sm);
	margin-top: var(--spacing--xs);
	line-height: var(--spacing--xs);
}

.usageCounter {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--3xs);
}

.danger {
	color: var(--color--danger);
}

.executionsCountSection {
	margin-left: var(--spacing--xs);
}

.trailingContentWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.dynamicBanner {
	color: var(--color--foreground--tint-2);
	border: none;
	background: var(--color--foreground--shade-2);

	.trialProgressBar {
		width: 80px;
		height: 6px;
		border: 0;
		border-radius: 20px;
		background-color: var(--color--foreground);

		&::-webkit-progress-bar {
			border-radius: 20px;
			background-color: var(--color--foreground);
		}

		&::-webkit-progress-value {
			background: var(--color--success);
			border-radius: 20px;
		}

		&::-moz-progress-bar {
			background: var(--color--success);
			border-radius: 20px;
		}
	}
	border-radius: var(--radius);
	padding: var(--spacing--5xs) var(--spacing--3xs);
}
</style>
