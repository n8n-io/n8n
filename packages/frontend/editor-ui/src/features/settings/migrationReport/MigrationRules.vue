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
	} as const;
});

const instanceTooltips = computed(() => {
	return {
		critical:
			'This issue will likely prevent the instance from starting or working correctly after the update. Must be fixed before proceeding.',
		medium:
			'This may affect performance, compatibility, or connected services. Review and fix if relevant to your setup.',
		low: 'Minor configuration change. Doesn’t block the update but may cause subtle changes in behavior.',
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
			Compatibility report for version 2.0.0
		</N8nText>
		<N8nText tag="p" color="text-base" class="mb-2xl">
			{{ compatibleWorkflowsCount }}
			of your {{ state?.totalWorkflows }} workflows are already compatible with version 2.0.0.
			Review the details below to understand and resolve any compatibility problems. Learn more
			about all breaking changes in our documentation
		</N8nText>

		<div :class="$style.ActionBar">
			<N8nTabs v-model="currentTab" :options="tabs" variant="modern" />
			<N8nButton
				v-if="state?.shouldCache"
				label="Refresh"
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
