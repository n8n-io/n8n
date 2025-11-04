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

const $style = useCssModule();
const rootStore = useRootStore();

const mockWorkflowResults = [
	{
		ruleId: 'file-access-restriction-v2',
		ruleTitle: 'Removed nodes (service retired)',
		ruleSeverity: 'critical',
		ruleDescription:
			'Some workflows use nodes from third-party services that have been discontinued. These nodes will stop working after the update.',
		nbAffectedWorkflows: 120,
		recommendations: [],
	},
	{
		ruleId: 'disabled-execute-command-local-file-trigger-nodes',
		ruleTitle: 'Disabled ExecuteCommand and LocalFileTrigger nodes',
		ruleSeverity: 'high',
		ruleDescription:
			'These nodes are now disabled by default for security reasons. Any workflows depending on them will no longer run until re-enabled.',
		nbAffectedWorkflows: 90,
		recommendations: [],
	},
	{
		ruleId: 'updated-oauth2-authentication-flows',
		ruleTitle: 'Blocked environment access in Code nodes',
		ruleSeverity: 'medium',
		ruleDescription:
			'Direct access to process.env from Code or expression nodes is now restricted by default. Workflows reading env values this way may fail.',
		nbAffectedWorkflows: 60,
		recommendations: [],
	},
	{
		ruleId: 'restricted-file-access-paths',
		ruleTitle: 'Restricted file access paths',
		ruleSeverity: 'medium',
		ruleDescription:
			'File-related nodes (like Read/Write File) can now only operate inside paths defined by N8N_RESTRICT_FILE_ACCESS_TO. Workflows reading files outside these paths may break.',
		nbAffectedWorkflows: 75,
		recommendations: [],
	},
];

const mockInstanceResults = [
	{
		ruleId: 'dummy',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Dropped MySQL/MariaDB support',
		ruleSeverity: 'critical',
		ruleDescription:
			'Instances using MySQL or MariaDB are no longer supported. A database migration to PostgreSQL or SQLite is required.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-1',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Removed SQLite legacy driver',
		ruleSeverity: 'medium',
		ruleDescription:
			'SQLite now always uses WAL mode and extra .wal / .shm files. Certain network or read-only file systems may be incompatible.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-2',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Enforced settings file permissions',
		ruleSeverity: 'medium',
		ruleDescription:
			'Stricter permission checks are applied to .n8n config files and mounted volumes. Incorrect ownership or mode can block startup.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-3',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Enabled Task Runners by default',
		ruleSeverity: 'medium',
		ruleDescription:
			'Task Runners now handle executions in separate processes by default, which may change memory and latency behavior.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-4',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Removed QUEUE_WORKER_MAX_STALLED_COUNT variable',
		ruleSeverity: 'medium',
		ruleDescription:
			'This environment variable has been removed; any custom value will be ignored.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-5',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Disabled in-memory binary data mode',
		ruleSeverity: 'medium',
		ruleDescription:
			'Binary files are now stored on disk in ~/.n8n/binaryData/, increasing disk usage but removing file size limits.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-6',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Upgraded dotenv',
		ruleSeverity: 'low',
		ruleDescription:
			'The .env file parser has changed. Values containing # or line breaks must be quoted to load correctly.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-7',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Deprecated legacy webhook authentication',
		ruleSeverity: 'medium',
		ruleDescription:
			'Old-style webhook authentication tokens are no longer accepted. Migrate to the new OAuth-based system.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-8',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Improved logging system',
		ruleSeverity: 'low',
		ruleDescription:
			'Logs are now formatted in JSON by default, simplifying log ingestion in external monitoring systems.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-9',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Enhanced API rate limiting',
		ruleSeverity: 'medium',
		ruleDescription:
			'Rate limits for public API endpoints have been tightened to prevent abuse. Consider caching frequent requests.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-10',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Removed legacy cron format support',
		ruleSeverity: 'medium',
		ruleDescription:
			'Old cron expressions using deprecated syntax will no longer be parsed. Use the standard five-field format.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-11',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'New audit trail feature',
		ruleSeverity: 'low',
		ruleDescription:
			'All administrative actions are now logged with timestamps and user identifiers for compliance auditing.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-12',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Improved worker scaling logic',
		ruleSeverity: 'medium',
		ruleDescription:
			'Automatic scaling now considers memory pressure as well as CPU load when spawning new workers.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-13',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Updated default Node.js runtime version',
		ruleSeverity: 'critical',
		ruleDescription:
			'The platform now requires Node.js 20 or higher. Older runtimes will fail to start.',
		recommendations: [],
		instanceIssues: [],
	},
	{
		ruleId: 'dummy-14',
		ruleDocumentationUrl: 'https://docs.n8n.io/reference/breaking-changes/',
		ruleTitle: 'Deprecated manual retry on failed executions',
		ruleSeverity: 'low',
		ruleDescription:
			'Manual retries of failed executions are being phased out in favor of automatic retry policies.',
		recommendations: [],
		instanceIssues: [],
	},
];

const currentTab = ref('workflow-issues');

const { state, isLoading, execute } = useAsyncState(async (refresh: boolean = false) => {
	if (refresh) {
		const response = await breakingChangesApi.refreshReport(rootStore.restApiContext);

		//mocking response until backend is ready
		response.report.workflowResults = mockWorkflowResults.slice(0, 2);
		// response.report.instanceResults = mockInstanceResults

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

	//mocking response until backend is ready
	response.report.workflowResults = mockWorkflowResults;
	response.report.instanceResults = mockInstanceResults;
	return response;
}, undefined);

async function refreshReport() {
	await execute(0, true);
}

const tabs = computed(() => {
	return [
		{
			label: 'Workflow issues',
			value: 'workflow-issues',
			tag: state.value?.report.workflowResults.length
				? String(state.value.report.workflowResults.length)
				: undefined,
		},
		{
			label: 'Instance issues',
			value: 'instance-issues',
			tag: state.value?.report.instanceResults.length
				? String(state.value.report.instanceResults.length)
				: undefined,
		},
	];
});

const workflowTooltips = computed(() => {
	return {
		critical:
			'Affected workflows will break after the update. You need to update or replace impacted nodes.',
		medium:
			'Workflows may still run but could produce incorrect results. Review and test before updating.',
		low: 'Behavior might change slightly in specific cases. Most workflows will keep working as expected.',
		high: 'TBD',
	} as const;
});

const instanceTooltips = computed(() => {
	return {
		critical:
			'This issue will likely prevent the instance from starting or working correctly after the update. Must be fixed before proceeding.',
		medium:
			'This may affect performance, compatibility, or connected services. Review and fix if relevant to your setup.',
		low: 'Minor configuration change. Doesn’t block the update but may cause subtle changes in behavior.',
		high: 'TBD',
	} as const;
});
</script>

<template>
	<div style="max-width: 700px; margin: 0 auto; padding-bottom: 40px">
		<N8nText tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
			Compatibility report for version 2.0.0
		</N8nText>
		<N8nText tag="p" color="text-base" class="mb-2xl">
			120 of your 560 workflows are already compatible with version 2.0.0. Review the details below
			to understand and resolve any compatibility problems. Learn more about all breaking changes in
			our documentation
		</N8nText>

		<div :class="$style.ActionBar">
			<N8nTabs v-model="currentTab" :options="tabs" variant="modern" />
			<N8nButton label="Refresh" icon="refresh-cw" type="secondary" @click="refreshReport" />
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
					<template #title>No workflow issues detected</template>
					<template #description>
						Your workflows are fully <br />compatible with version 2.0.0. You're good to go!
					</template>
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
							<N8nLink theme="text" underline href="#">
								<u :class="$style.NoLineBreak"> Documentation <N8nIcon icon="external-link" /></u>
							</N8nLink>
						</N8nText>
					</div>
					<N8nLink
						:class="$style.NoLineBreak"
						theme="text"
						:to="{ name: VIEWS.MIGRATION_RULE_REPORT, params: { migrationRuleId: issue.ruleId } }"
					>
						<span :class="$style.NoLineBreak">
							{{ issue.nbAffectedWorkflows }} Workflows
							<N8nIcon icon="chevron-right" :size="24" />
						</span>
					</N8nLink>
				</div>
			</div>
		</template>
		<template v-else-if="currentTab === 'instance-issues'">
			<template v-if="state?.report.instanceResults.length === 0">
				<EmptyTab>
					<template #title>No instance issues detected</template>
					<template #description>
						Your instance is fully compatible <br />with version 2.0.0. You're good to go!
					</template>
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
								<u :class="$style.NoLineBreak">Documentation <N8nIcon icon="external-link" /></u>
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
