<template>
	<div v-if="userIsTrialing" :class="$style.container">
		<div v-if="!isTrialExpired && trialHasExecutionsLeft" :class="$style.usageText">
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
								interpolate: { days: daysLeftOnTrial.toString() },
							})
						}}
					</n8n-text>
				</template>
			</i18n>
		</div>
		<div v-if="isTrialExpired" :class="$style.usageText">
			<n8n-text size="xsmall" color="danger">
				{{ locale.baseText('executionUsage.expired.text') }}
			</n8n-text>
		</div>
		<div v-if="!trialHasExecutionsLeft" :class="$style.usageText">
			<n8n-text size="xsmall">
				{{ locale.baseText('executionUsage.ranOutOfExecutions.text') }}
			</n8n-text>
		</div>
		<div v-if="!isTrialExpired" :class="$style.usageCounter">
			<div :class="$style.progressBarSection">
				<progress
					:class="[
						trialHasExecutionsLeft ? $style.progressBarSuccess : $style.progressBarDanger,
						$style.progressBar,
					]"
					:value="currentExecutions"
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
				size="mini"
				icon="gem"
				type="success"
				@click="onUpgradeClicked"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import type { PlanData } from '@/Interface';
import { DateTime } from 'luxon';

const currentPlan = ref<PlanData>({
	planSpec: {
		planId: 43039,
		monthlyExecutionsLimit: 200,
		activeWorkflowsLimit: 10,
		credentialsLimit: 100,
		isActive: false,
		displayName: 'Trial',
		metadata: {
			version: 'v1',
			group: 'trial',
			slug: 'trial-1',
			trial: {
				length: 7,
				gracePeriod: 3,
			},
		},
	},
	instance: {
		createdAt: '2023-05-01T01:47:47Z',
	},
	usage: {
		executions: 100,
		activeWorkflows: 10,
	},
});

const now = DateTime.utc();

onMounted(async () => {});

const daysLeftOnTrial = computed(() => {
	const { days = 0 } = now.diff(getPlanStartingDate(), ['days']).toObject();
	return Math.trunc(days);
});

const isTrialExpired = computed(() => {
	const trialEndsAt = getPlanStartingDate()
		.plus({ days: currentPlan.value.planSpec.metadata.trial.length })
		.endOf('day');
	return now.toMillis() > trialEndsAt.toMillis();
});

const getPlanStartingDate = () =>
	DateTime.fromISO(currentPlan.value.instance.createdAt).startOf('day');

const trialHasExecutionsLeft = computed(
	() => currentPlan.value.usage.executions < currentPlan.value.planSpec.monthlyExecutionsLimit,
);

const userIsTrialing = computed(() => currentPlan.value.planSpec.metadata.group === 'trial');

const currentExecutions = computed(() => currentPlan.value.usage.executions);

const maxExecutions = computed(() => currentPlan.value.planSpec.monthlyExecutionsLimit);

const onUpgradeClicked = () => {};
</script>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	background-color: var(--color-background-light);
	border-radius: 0px;
	margin: 0;
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
	line-height: 12.5px;
}

.usageCounter {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-left: var(--spacing-s);
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-3xs);
}
.progressBarSection {
	width: 62.4px;
	justify-content: center;
	margin-right: 0px;
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

.upgradeButtonSection > * {
	width: 100%;
}
</style>
