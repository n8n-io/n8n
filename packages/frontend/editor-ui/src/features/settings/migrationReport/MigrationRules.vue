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
import orderBy from 'lodash/orderBy';
import SeverityTag from './components/SeverityTag.vue';
import EmptyTab from './components/EmptyTab.vue';
import { useI18n } from '@n8n/i18n';
import { MIGRATION_REPORT_TARGET_VERSION } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();

useDocumentTitle().set(i18n.baseText('settings.migrationReport'));

const currentTab = ref('workflow-issues');
const shouldShowRefreshButton = ref(false);

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
		shouldShowRefreshButton.value = response.shouldCache;

		return response;
	}
	const response = await breakingChangesApi.getReport(rootStore.restApiContext, versionQuery);
	shouldShowRefreshButton.value = response.shouldCache;

	return response;
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

const workflowTooltips = computed(() => {
	return {
		critical: i18n.baseText('settings.migrationReport.workflowTooltip.critical'),
		medium: i18n.baseText('settings.migrationReport.workflowTooltip.medium'),
		low: i18n.baseText('settings.migrationReport.workflowTooltip.low'),
	} as const;
});

const instanceTooltips = computed(() => {
	return {
		critical: i18n.baseText('settings.migrationReport.instanceTooltip.critical'),
		medium: i18n.baseText('settings.migrationReport.instanceTooltip.medium'),
		low: i18n.baseText('settings.migrationReport.instanceTooltip.low'),
	} as const;
});

const compatibleWorkflowsCount = computed(() => {
	if (!state.value) return 0;
	return (
		state.value.totalWorkflows -
		state.value.report.workflowResults.reduce((acc, issue) => acc + issue.nbAffectedWorkflows, 0)
	);
});

// Severity order: critical (highest) -> medium -> low (lowest)
const severityOrder = { critical: 0, medium: 1, low: 2 };

const sortedWorkflowResults = computed(() => {
	if (!state.value?.report.workflowResults) return [];
	return orderBy(
		state.value.report.workflowResults,
		[(issue) => severityOrder[issue.ruleSeverity]],
		['asc'],
	);
});

const sortedInstanceResults = computed(() => {
	if (!state.value?.report.instanceResults) return [];
	return orderBy(
		state.value.report.instanceResults,
		[(issue) => severityOrder[issue.ruleSeverity]],
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
						compatibleCount: String(compatibleWorkflowsCount),
						totalCount: String(state?.totalWorkflows ?? 0),
						version: targetVersionDisplay,
					},
				})
			"
			:docs-url="documentationUrl"
			:docs-label="i18n.baseText('settings.migrationReport.documentationLink')"
			docs-leading-text=""
		/>
		<div>
			<div :class="$style.ActionBar">
				<N8nTabs v-model="currentTab" :options="tabs" variant="modern" />
				<N8nButton
					variant="subtle"
					v-if="shouldShowRefreshButton"
					:label="i18n.baseText('settings.migrationReport.refreshButton')"
					icon="refresh-cw"
					:loading="isLoading"
					:disabled="isLoading"
					@click="refreshReport"
				/>
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
									:content="workflowTooltips[issue.ruleSeverity]"
									placement="top"
									:enterable="false"
								>
									<SeverityTag :severity="issue.ruleSeverity" />
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
									:content="instanceTooltips[issue.ruleSeverity]"
									placement="top"
									:enterable="false"
								>
									<SeverityTag :severity="issue.ruleSeverity" />
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

.ActionBar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--sm);
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
