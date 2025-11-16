<script lang="ts" setup>
import {
	N8nButton,
	N8nIcon,
	N8nLink,
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
import SeverityTag from './components/SeverityTag.vue';
import EmptyTab from './components/EmptyTab.vue';
import { useI18n } from '@n8n/i18n';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();

const currentTab = ref('workflow-issues');

const { state, isLoading, execute } = useAsyncState(async (refresh: boolean = false) => {
	if (refresh) {
		const response = await breakingChangesApi.refreshReport(rootStore.restApiContext);
		// set tab based on available issues
		if (
			response.report.workflowResults.length === 0 &&
			response.report.instanceResults.length > 0
		) {
			currentTab.value = 'instance-issues';
		}

		return response;
	}
	const response = await breakingChangesApi.getReport(rootStore.restApiContext);

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
</script>

<template>
	<div style="max-width: 700px; margin: 0 auto; padding-bottom: 40px">
		<N8nText tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
			{{ i18n.baseText('settings.migrationReport.title') }}
		</N8nText>
		<N8nText tag="p" color="text-base" class="mb-2xl">
			{{
				i18n.baseText('settings.migrationReport.description', {
					interpolate: {
						compatibleCount: String(compatibleWorkflowsCount),
						totalCount: String(state?.totalWorkflows ?? 0),
					},
				})
			}}
		</N8nText>

		<div :class="$style.ActionBar">
			<N8nTabs v-model="currentTab" :options="tabs" variant="modern" />
			<N8nButton
				v-if="state?.shouldCache"
				:label="i18n.baseText('settings.migrationReport.refreshButton')"
				icon="refresh-cw"
				type="secondary"
				@click="refreshReport"
			/>
		</div>

		<div v-if="isLoading" :class="$style.CardContainer">
			<div v-for="i in 4" :key="i" :class="$style.Card">
				<div>
					<N8nLoading variant="p" :rows="3" :class="$style.PLoading"></N8nLoading>
				</div>
				<N8nLoading variant="button"></N8nLoading>
			</div>
		</div>
		<template v-else-if="currentTab === 'workflow-issues'">
			<template v-if="state?.report.workflowResults.length === 0">
				<EmptyTab>
					<template #title>{{
						i18n.baseText('settings.migrationReport.emptyWorkflowIssues.title')
					}}</template>
					<template #description>{{
						i18n.baseText('settings.migrationReport.emptyWorkflowIssues.description')
					}}</template>
				</EmptyTab>
			</template>
			<div v-else :class="$style.CardContainer">
				<div
					v-for="issue in state?.report.workflowResults"
					:key="issue.ruleId"
					:class="$style.Card"
				>
					<div>
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
							{{ issue.ruleDescription }}
							<N8nLink
								v-if="issue.ruleDocumentationUrl"
								theme="text"
								underline
								:href="issue.ruleDocumentationUrl"
								target="_blank"
								rel="noopener noreferrer"
							>
								<u :class="$style.NoLineBreak">
									{{ i18n.baseText('settings.migrationReport.documentation') }}
									<N8nIcon icon="external-link" />
								</u>
							</N8nLink>
						</N8nText>
					</div>
					<N8nLink
						:class="$style.NoLineBreak"
						theme="text"
						:to="{ name: VIEWS.MIGRATION_RULE_REPORT, params: { migrationRuleId: issue.ruleId } }"
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
				</div>
			</div>
		</template>
		<template v-else-if="currentTab === 'instance-issues'">
			<template v-if="state?.report.instanceResults.length === 0">
				<EmptyTab>
					<template #title>{{
						i18n.baseText('settings.migrationReport.emptyInstanceIssues.title')
					}}</template>
					<template #description>{{
						i18n.baseText('settings.migrationReport.emptyInstanceIssues.description')
					}}</template>
				</EmptyTab>
			</template>
			<div v-else :class="$style.CardContainer">
				<div
					v-for="issue in state?.report.instanceResults"
					:key="issue.ruleId"
					:class="$style.Card"
				>
					<div>
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
							{{ issue.ruleDescription }}
							<N8nLink theme="text" underline href="#">
								<u :class="$style.NoLineBreak">
									{{ i18n.baseText('settings.migrationReport.documentation') }}
									<N8nIcon icon="external-link" />
								</u>
							</N8nLink>
						</N8nText>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style module>
.CardContainer {
	border: var(--border);
	border-radius: var(--radius);

	.Card {
		&:first-child {
			border-top-left-radius: inherit;
			border-top-right-radius: inherit;
		}

		&:last-child {
			border-bottom-left-radius: inherit;
			border-bottom-right-radius: inherit;
		}

		&:not(:last-child) {
			border-bottom: var(--border);
		}
	}
}

.Card {
	padding: var(--spacing--sm) var(--spacing--md);
	display: grid;
	grid-template-columns: 4fr 1fr;
	align-items: center;
	gap: var(--spacing--md);
	background-color: var(--color--background--light-3);
}

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

.NoIssuesContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: var(--spacing--4xl) 0;
}

.PLoading {
	:global(.el-skeleton__p) {
		margin-top: 0;
	}
}
</style>
