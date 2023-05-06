<template>
	<div :class="$style.container">
		<div v-if="!isTrialExpired() && trialHasExecutionsLeft()" :class="$style.usageText">
			<i18n path="executionUsage.currentUsage">
				<template #text>
					<n8n-text size="xsmall" color="text-dark">
						{{ locale.baseText('executionUsage.currentUsage.text') }}
					</n8n-text>
				</template>
				<template #count>
					<n8n-text size="xsmall" :bold="true" color="warning">
						{{
							locale.baseText('executionUsage.currentUsage.count', {
								interpolate: { days: daysLeftOnTrial().toString() },
							})
						}}
					</n8n-text>
				</template>
			</i18n>
		</div>
		<div v-if="isTrialExpired()" :class="$style.usageText">
			<n8n-text size="xsmall" color="danger">
				{{ locale.baseText('executionUsage.expired.text') }}
			</n8n-text>
		</div>
		<div v-if="!trialHasExecutionsLeft()" :class="$style.usageText">
			<n8n-text size="xsmall">
				{{ locale.baseText('executionUsage.ranOutOfExecutions.text') }}
			</n8n-text>
		</div>
		<div v-if="!isTrialExpired()" :class="$style.usageCounter">
			<div>
				<progress
					:class="[
						trialHasExecutionsLeft() ? $style.progressBarSuccess : $style.progressBarDanger,
						$style.progressBar,
					]"
					:value="currentExecutions()"
					:max="maxExecutions()"
				></progress>
			</div>
			<div :class="$style.executionsCountSection">
				<n8n-text size="xsmall" :color="trialHasExecutionsLeft() ? 'text-dark' : 'danger'">
					{{ currentExecutions() }}/{{ maxExecutions() }}
				</n8n-text>
				<n8n-text size="xsmall" :color="trialHasExecutionsLeft() ? 'text-dark' : 'danger'">{{
					locale.baseText('executionUsage.label.executions')
				}}</n8n-text>
			</div>
		</div>

		<div :class="$style.upgradeButtonSection">
			<n8n-button
				:label="locale.baseText('executionUsage.button.upgrade')"
				size="mini"
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
import type { Cloud } from '@/Interface';

type CloudPlanData = Cloud.PlanData & { metadata: Cloud.PlanMetadata; usage: Cloud.PlanUsage };

const props = defineProps<{ cloudPlanData: CloudPlanData }>();

const emit = defineEmits(['onUpgradePlanClicked']);

const now = DateTime.utc();

const daysLeftOnTrial = () => {
	const { days = 0 } = getPlanExpirationDate().diff(now, ['days']).toObject();
	return Math.ceil(days);
};

const isTrialExpired = () => {
	const trialEndsAt = DateTime.fromISO(props.cloudPlanData.expirationDate);
	return now.toMillis() > trialEndsAt.toMillis();
};

const getPlanExpirationDate = () => DateTime.fromISO(props.cloudPlanData.expirationDate);

const trialHasExecutionsLeft = () =>
	props.cloudPlanData.usage.executions < props.cloudPlanData.monthlyExecutionsLimit;

const currentExecutions = () => props.cloudPlanData.usage.executions;

const maxExecutions = () => props.cloudPlanData.monthlyExecutionsLimit;

const onUpgradeClicked = () => {
	emit('onUpgradePlanClicked');
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

.progressBar {
	width: 62.4px;
}

.progressBarSuccess {
	accent-color: var(--color-foreground-xdark);
}

.progressBarDanger {
	accent-color: var(--color-danger);
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
	margin-left: var(--spacing-s);
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
