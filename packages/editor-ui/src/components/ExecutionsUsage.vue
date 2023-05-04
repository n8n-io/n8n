<template>
	<div :class="$style.container">
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
			<div>
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
				:block="true"
				@click="onUpgradeClicked"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { DateTime } from 'luxon';

export interface CloudPlanData {
	planSpec: PlanSpec;
	instance: Instance;
	usage: Usage;
}

export interface PlanSpec {
	planId: number;
	monthlyExecutionsLimit: number;
	activeWorkflowsLimit: number;
	credentialsLimit: number;
	isActive: boolean;
	displayName: string;
	expirationDate: string;
	metadata: PlanMetadata;
}
export interface PlanMetadata {
	version: 'v1';
	group: 'opt-out' | 'opt-in';
	slug: 'pro-1' | 'pro-2' | 'starter' | 'trial-1';
	trial?: Trial;
}
export interface Trial {
	length: number;
	gracePeriod: number;
}
export interface Instance {
	createdAt: string;
}
export interface Usage {
	executions: number;
	activeWorkflows: number;
}

const props = defineProps<{ cloudPlanData: CloudPlanData }>();

const now = DateTime.utc();

onMounted(async () => {
	console.log('monte');
});

const daysLeftOnTrial = computed(() => {
	const { days = 0 } = getPlanExpirationDate().diff(now, ['days']).toObject();
	return Math.ceil(days);
});

const isTrialExpired = computed(() => {
	const trialEndsAt = DateTime.fromISO(props.cloudPlanData.planSpec.expirationDate);
	return now.toMillis() > trialEndsAt.toMillis();
});

const getPlanExpirationDate = () => DateTime.fromISO(props.cloudPlanData.planSpec.expirationDate);

const trialHasExecutionsLeft = computed(
	() => props.cloudPlanData.usage.executions < props.cloudPlanData.planSpec.monthlyExecutionsLimit,
);

const currentExecutions = computed(() => props.cloudPlanData.usage.executions);

const maxExecutions = computed(() => props.cloudPlanData.planSpec.monthlyExecutionsLimit);

const onUpgradeClicked = () => {};
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
