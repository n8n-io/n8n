<script lang="ts" setup>
import {
	N8nButton,
	N8nIcon,
	N8nLink,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nTabs,
	N8nText,
	N8nTooltip,
	N8nLoading,
} from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAsyncState } from '@vueuse/core';
import { computed, ref, useCssModule } from 'vue';
import { I18nT } from 'vue-i18n';
import orderBy from 'lodash/orderBy';
import ImpactTag from './components/ImpactTag.vue';
import EmptyTab from './components/EmptyTab.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useI18n } from '@n8n/i18n';
import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import type { BreakingChangeRuleImpact } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();

useDocumentTitle().set(i18n.baseText('settings.migrationReport'));

const currentTab = ref('workflow-issues');

const versionQuery = MIGRATION_REPORT_TARGET_VERSION
	? { version: MIGRATION_REPORT_TARGET_VERSION }
	: undefined;

const targetVersionMajor = MIGRATION_REPORT_TARGET_VERSION?.slice(1) ?? '2';
const targetVersionDisplay = `${targetVersionMajor}.0.0`;
const documentationUrl = `https://docs.n8n.io/${targetVersionMajor}-0-breaking-changes/`;

const { state, isLoading, execute } = useAsyncState(async (refresh: boolean = false) => {
	if (refresh) {
		const response = await breakingChangesApi.refreshReport(rootStore.restApiContext, versionQuery);
		// set tab based on available issues
		if (
			response.report.workflowResults.length === 0 &&
			response.report.instanceResults.length > 0
		) {
			currentTab.value = 'instance-issues';
		}

		return response;
	}
	return await breakingChangesApi.getReport(rootStore.restApiContext, versionQuery);
}, undefined);

async function refreshReport() {
	await execute(0, true);
}

const tabs = computed(() => {
	return [
		{
			label: i18n.baseText('settings.migrationReport.tabs.workflowIssues'),
			value: 'workflow-issues',
			tag: state.value?.report.workflowResults.length
				? String(state.value.report.workflowResults.length)
				: undefined,
		},
		{
			label: i18n.baseText('settings.migrationReport.tabs.instanceIssues'),
			value: 'instance-issues',
			tag: state.value?.report.instanceResults.length
				? String(state.value.report.instanceResults.length)
				: undefined,
		},
	];
});

const workflowTooltips = computed<Record<BreakingChangeRuleImpact, string>>(() => ({
	upgradeBlocked: i18n.baseText('settings.migrationReport.workflowTooltip.upgradeBlocked'),
	executionsFail: i18n.baseText('settings.migrationReport.workflowTooltip.executionsFail'),
	behaviorChanges: i18n.baseText('settings.migrationReport.workflowTooltip.behaviorChanges'),
	capabilityRemoved: i18n.baseText('settings.migrationReport.workflowTooltip.capabilityRemoved'),
}));

const instanceTooltips = computed<Record<BreakingChangeRuleImpact, string>>(() => ({
	upgradeBlocked: i18n.baseText('settings.migrationReport.instanceTooltip.upgradeBlocked'),
	executionsFail: i18n.baseText('settings.migrationReport.instanceTooltip.executionsFail'),
	behaviorChanges: i18n.baseText('settings.migrationReport.instanceTooltip.behaviorChanges'),
	capabilityRemoved: i18n.baseText('settings.migrationReport.instanceTooltip.capabilityRemoved'),
}));

const compatibleWorkflowsCount = computed(() => {
	if (!state.value) return 0;
	return state.value.totalWorkflows - state.value.totalAffectedWorkflows;
});

const compatiblePercentage = computed(() => {
	const total = state.value?.totalWorkflows ?? 0;
	if (total === 0) return 0;
	// Floor so the bar only fills once every workflow is compatible
	return Math.floor((compatibleWorkflowsCount.value / total) * 100);
});

const progressLabel = computed(() =>
	i18n.baseText('settings.migrationReport.progress.label', {
		interpolate: {
			compatibleCount: compatibleWorkflowsCount.value.toLocaleString(),
			totalCount: (state.value?.totalWorkflows ?? 0).toLocaleString(),
		},
	}),
);

// Impact order: the impact that blocks the update comes first, the one with no
// runtime effect comes last.
const impactOrder: Record<BreakingChangeRuleImpact, number> = {
	upgradeBlocked: 0,
	executionsFail: 1,
	behaviorChanges: 2,
	capabilityRemoved: 3,
};

const sortedWorkflowResults = computed(() => {
	if (!state.value?.report.workflowResults) return [];
	return orderBy(
		state.value.report.workflowResults,
		[(issue) => impactOrder[issue.ruleImpact]],
		['asc'],
	);
});

const sortedInstanceResults = computed(() => {
	if (!state.value?.report.instanceResults) return [];
	return orderBy(
		state.value.report.instanceResults,
		[(issue) => impactOrder[issue.ruleImpact]],
		['asc'],
	);
});
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.migrationReport')"
			:description="
				i18n.baseText('settings.migrationReport.description', {
					interpolate: {
						compatibleCount: compatibleWorkflowsCount.toLocaleString(),
						totalCount: (state?.totalWorkflows ?? 0).toLocaleString(),
						version: targetVersionDisplay,
					},
				})
			"
			:docs-url="documentationUrl"
			:docs-label="i18n.baseText('settings.migrationReport.documentationLink')"
			docs-leading-text=""
		/>
		<div>
			<div v-if="state" :class="$style.Progress">
				<div
					:class="$style.ProgressTrack"
					role="progressbar"
					:aria-valuenow="compatiblePercentage"
					aria-valuemin="0"
					aria-valuemax="100"
					:aria-label="progressLabel"
					data-test-id="migration-report-progress"
				>
					<div :class="$style.ProgressFill" :style="{ width: `${compatiblePercentage}%` }" />
				</div>
				<N8nText size="medium" color="text-base" :class="$style.NoLineBreak">
					{{ progressLabel }}
				</N8nText>
			</div>
			<div :class="$style.ActionBar">
				<N8nTabs v-model="currentTab" :options="tabs" variant="modern" />
				<div :class="$style.RefreshGroup">
					<N8nText
						v-if="state?.report.generatedAt"
						size="small"
						color="text-light"
						data-test-id="migration-report-last-synced"
					>
						<I18nT keypath="settings.migrationReport.lastSynced" tag="span" scope="global">
							<template #time>
								<TimeAgo :date="state.report.generatedAt.toString()" />
							</template>
						</I18nT>
					</N8nText>
					<N8nButton
						variant="subtle"
						:label="i18n.baseText('settings.migrationReport.refreshButton')"
						icon="refresh-cw"
						:loading="isLoading"
						:disabled="isLoading"
						@click="refreshReport"
					/>
				</div>
			</div>

			<N8nSettingsRowGroup v-if="isLoading">
				<N8nSettingsRow v-for="i in 4" :key="i">
					<template #info>
						<N8nLoading variant="p" :rows="3" :class="$style.PLoading"></N8nLoading>
					</template>
					<template #action>
						<N8nLoading variant="button"></N8nLoading>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
			<template v-else-if="currentTab === 'workflow-issues'">
				<template v-if="state?.report.workflowResults.length === 0">
					<EmptyTab>
						<template #title>{{
							i18n.baseText('settings.migrationReport.emptyWorkflowIssues.title')
						}}</template>
						<template #description>{{
							i18n.baseText('settings.migrationReport.emptyWorkflowIssues.description', {
								interpolate: { version: targetVersionDisplay },
							})
						}}</template>
					</EmptyTab>
				</template>
				<N8nSettingsRowGroup v-else>
					<N8nSettingsRow v-for="issue in sortedWorkflowResults" :key="issue.ruleId">
						<template #info>
							<div :class="$style.CardTitleContainer">
								<N8nText tag="h3" size="medium" color="text-dark">{{ issue.ruleTitle }}</N8nText>
								<N8nTooltip
									:content="workflowTooltips[issue.ruleImpact]"
									placement="top"
									:enterable="false"
								>
									<ImpactTag :impact="issue.ruleImpact" />
								</N8nTooltip>
							</div>
							<N8nText tag="p" color="text-base">
								{{ issue.ruleDescription }}{{ issue.ruleDescription.endsWith('.') ? '' : '.' }}
								<N8nLink
									v-if="issue.ruleDocumentationUrl"
									theme="text"
									:href="issue.ruleDocumentationUrl"
									target="_blank"
									rel="noopener noreferrer"
									:class="$style.NoLineBreak"
								>
									<span :class="$style.UnderlinedText">{{
										i18n.baseText('settings.migrationReport.documentation')
									}}</span>
									↗
								</N8nLink>
							</N8nText>
						</template>
						<template #action>
							<N8nLink
								:class="$style.NoLineBreak"
								theme="text"
								:to="{
									name: VIEWS.MIGRATION_RULE_REPORT,
									params: { migrationRuleId: issue.ruleId },
								}"
							>
								<span :class="$style.NoLineBreak">
									{{
										i18n.baseText('settings.migrationReport.workflowsCount', {
											interpolate: { count: issue.nbAffectedWorkflows },
										})
									}}
									<N8nIcon icon="chevron-right" :size="24" />
								</span>
							</N8nLink>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</template>
			<template v-else-if="currentTab === 'instance-issues'">
				<template v-if="state?.report.instanceResults.length === 0">
					<EmptyTab>
						<template #title>{{
							i18n.baseText('settings.migrationReport.emptyInstanceIssues.title')
						}}</template>
						<template #description>{{
							i18n.baseText('settings.migrationReport.emptyInstanceIssues.description', {
								interpolate: { version: targetVersionDisplay },
							})
						}}</template>
					</EmptyTab>
				</template>
				<N8nSettingsRowGroup v-else>
					<N8nSettingsRow v-for="issue in sortedInstanceResults" :key="issue.ruleId">
						<template #info>
							<div :class="$style.CardTitleContainer">
								<N8nText tag="h3">{{ issue.ruleTitle }}</N8nText>
								<N8nTooltip
									:content="instanceTooltips[issue.ruleImpact]"
									placement="top"
									:enterable="false"
								>
									<ImpactTag :impact="issue.ruleImpact" />
								</N8nTooltip>
							</div>
							<N8nText tag="p" color="text-base">
								{{ issue.ruleDescription }}{{ issue.ruleDescription.endsWith('.') ? '' : '.' }}
								<N8nLink
									v-if="issue.ruleDocumentationUrl"
									theme="text"
									:href="issue.ruleDocumentationUrl"
									target="_blank"
									rel="noopener noreferrer"
									:class="$style.NoLineBreak"
								>
									<span :class="$style.UnderlinedText">{{
										i18n.baseText('settings.migrationReport.documentation')
									}}</span>
									↗
								</N8nLink>
							</N8nText>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</template>
		</div>
	</N8nSettingsLayout>
</template>

<style module>
.CardTitleContainer {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing--2xs);
	gap: var(--spacing--2xs);
}

.NoLineBreak {
	white-space: nowrap;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.Progress {
	display: flex;
	align-items: center;
	gap: var(--spacing--lg);
	margin-bottom: var(--spacing--xl);
}

.ProgressTrack {
	flex: 1;
	height: var(--height--5xs);
	border-radius: var(--radius--3xs);
	background-color: var(--color--foreground--tint-1);
	overflow: hidden;
}

.ProgressFill {
	height: 100%;
	border-radius: inherit;
	background-color: var(--color--primary);
}

.ActionBar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--sm);
}

.RefreshGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.PLoading {
	:global(.el-skeleton__p) {
		margin-top: 0;
	}
}

.UnderlinedText {
	text-decoration: underline;
}
</style>
