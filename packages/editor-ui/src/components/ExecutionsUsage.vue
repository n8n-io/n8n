<template>
	<div :class="$style.container">
		<div v-if="isTrialExpired" :class="$style.usageText">
			<n8n-text size="small" color="danger">
				{{ locale.baseText('executionUsage.expired.text') }}
			</n8n-text>
		</div>
		<div v-else-if="!isTrialExpired && trialHasExecutionsLeft" :class="$style.usageText">
			<i18n path="executionUsage.currentUsage">
				<template #text>
					<n8n-text size="small" color="text-dark">
						{{ locale.baseText('executionUsage.currentUsage.text') }}
					</n8n-text>
				</template>
				<template #count>
					<n8n-text size="small" :bold="true" color="warning">
						{{
							locale.baseText('executionUsage.currentUsage.count', {
								adjustToNumber: daysLeftOnTrial || 0,
							})
						}}
					</n8n-text>
				</template>
			</i18n>
		</div>
		<div v-else-if="!trialHasExecutionsLeft" :class="$style.usageText">
			<n8n-text size="small">
				{{ locale.baseText('executionUsage.ranOutOfExecutions.text') }}
			</n8n-text>
		</div>
		<div v-if="!isTrialExpired" :class="$style.usageCounter">
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
				<n8n-text size="xsmall" :color="trialHasExecutionsLeft ? 'text-dark' : 'danger'">
					{{ currentExecutions }}/{{ maxExecutions }}
				</n8n-text>
				<n8n-text size="xsmall" :color="trialHasExecutionsLeft ? 'text-dark' : 'danger'">{{
					locale.baseText('executionUsage.label.executions')
				}}</n8n-text>
			</div>
		</div>

		<div :class="$style.upgradeButtonSection">
			<n8n-button
				:label="locale.baseText('executionUsage.button.upgrade')"
				size="xmini"
				icon="gem"
				type="success"
				:block="true"
				@click="onUpgradeClicked"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { i18n as locale } from '@/plugins/i18n';
import { DateTime } from 'luxon';
import type { CloudPlanAndUsageData } from '@/Interface';
import { computed } from 'vue';
import { useUIStore } from '@/stores';

const PROGRESS_BAR_MINIMUM_THRESHOLD = 8;

const props = defineProps<{ cloudPlanData: CloudPlanAndUsageData | null }>();

const now = DateTime.utc();

const daysLeftOnTrial = computed(() => {
	const { days = 0 } = getPlanExpirationDate().diff(now, ['days']).toObject();
	return Math.ceil(days);
});

const isTrialExpired = computed(() => {
	if (!props.cloudPlanData?.expirationDate) return false;
	const trialEndsAt = DateTime.fromISO(props.cloudPlanData.expirationDate);
	return now.toMillis() > trialEndsAt.toMillis();
});

const getPlanExpirationDate = () => DateTime.fromISO(props?.cloudPlanData?.expirationDate ?? '');

const trialHasExecutionsLeft = computed(() => {
	if (!props.cloudPlanData?.usage) return 0;
	return props.cloudPlanData.usage.executions < props.cloudPlanData.monthlyExecutionsLimit;
});

const currentExecutions = computed(() => {
	if (!props.cloudPlanData?.usage) return 0;
	const usedExecutions = props.cloudPlanData.usage.executions;
	const executionsQuota = props.cloudPlanData.monthlyExecutionsLimit;
	return usedExecutions > executionsQuota ? executionsQuota : usedExecutions;
});

const currentExecutionsWithThreshold = computed(() => {
	if (!props.cloudPlanData?.usage) return 0;
	const usedExecutions = props.cloudPlanData.usage.executions;
	const executionsQuota = props.cloudPlanData.monthlyExecutionsLimit;
	const threshold = (PROGRESS_BAR_MINIMUM_THRESHOLD * executionsQuota) / 100;
	return usedExecutions < threshold ? threshold : usedExecutions;
});

const maxExecutions = computed(() => {
	if (!props.cloudPlanData?.monthlyExecutionsLimit) return 0;
	return props.cloudPlanData.monthlyExecutionsLimit;
});

const onUpgradeClicked = () => {
	useUIStore().goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
};
</script>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-right: 0;
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
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-3xs);
}

.danger {
	color: var(--color-danger);
}

.executionsCountSection {
	margin-left: var(--spacing-xs);
}

.upgradeButtonSection {
	margin: var(--spacing-s);
}
</style>
