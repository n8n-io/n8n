<script setup lang="ts">
import { N8nSpinner } from '@n8n/design-system';

import McpAppContainer from '@mcp-apps/components/mcp-app-container.vue';
import McpFallbackCard from '@mcp-apps/components/mcp-fallback-card.vue';
import OpenInN8nButton from '@mcp-apps/components/open-in-n8n-button.vue';
import WorkflowDiffCard from '@mcp-apps/components/workflow-diff/workflow-diff-card.vue';
import { useMcpAppCrashTelemetry } from '@mcp-apps/composables/use-mcp-app-crash-telemetry';
import { useMcpAppTelemetry } from '@mcp-apps/composables/use-mcp-app-telemetry';
import { useMcpHostApp } from '@mcp-apps/composables/use-mcp-host-app';
import { useMcpHostContextStyles } from '@mcp-apps/composables/use-mcp-host-context-styles';
import { useI18n } from '@mcp-apps/i18n';

import { useWorkflowDiffPreview } from './composables/use-workflow-diff-preview';
import {
	WORKFLOW_DIFF_APP_SLUG,
	WORKFLOW_DIFF_CRASH_SOURCES,
	WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES,
	WORKFLOW_DIFF_RENDER_FAILURE_REASONS,
	WORKFLOW_DIFF_TELEMETRY_EVENTS,
} from './constants';

const { t } = useI18n();

const { app, connectionError, connectionStatus, hostContext, hostVersion, toolResult } =
	useMcpHostApp({
		name: 'n8n Workflow Diff',
		version: '0.1.0',
	});

useMcpAppTelemetry({
	app: WORKFLOW_DIFF_APP_SLUG,
	connectionError,
	connectionStatus,
	events: {
		renderFailed: WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_RENDER_FAILED,
	},
	hostVersion,
	renderFailedReason: WORKFLOW_DIFF_RENDER_FAILURE_REASONS.HOST_CONNECTION_FAILED,
});

useMcpAppCrashTelemetry({
	app: WORKFLOW_DIFF_APP_SLUG,
	event: WORKFLOW_DIFF_TELEMETRY_EVENTS.DIFF_CRASHED,
	hostVersion,
	sources: {
		appError: WORKFLOW_DIFF_CRASH_SOURCES.APP_ERROR,
		appUnhandledRejection: WORKFLOW_DIFF_CRASH_SOURCES.APP_UNHANDLED_REJECTION,
	},
});

useMcpHostContextStyles(hostContext);

const {
	workflowUrl,
	workflowName,
	sourceWorkflow,
	targetWorkflow,
	diffNodeTypes,
	diffError,
	diffLoading,
	diffRendered,
	hasNoVisualChanges,
	isDiffVisible,
	ariaLabel,
	handleDiffCrash,
	handleOpenWorkflow,
} = useWorkflowDiffPreview({
	app,
	appSlug: WORKFLOW_DIFF_APP_SLUG,
	hostVersion,
	toolResult,
});
</script>

<template>
	<McpAppContainer
		:busy="!workflowUrl || diffLoading || (isDiffVisible && !diffRendered)"
		:label="ariaLabel"
	>
		<WorkflowDiffCard
			v-if="isDiffVisible && workflowUrl && sourceWorkflow && targetWorkflow"
			:source-workflow="sourceWorkflow"
			:target-workflow="targetWorkflow"
			:node-types="diffNodeTypes"
			:workflow-url="workflowUrl"
			:workflow-name="workflowName"
			:diff-rendered="diffRendered"
			@open="handleOpenWorkflow(WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES.DIFF_HEADER)"
			@diff-crash="handleDiffCrash"
			@diff-rendered-change="diffRendered = $event"
		/>

		<McpFallbackCard
			v-else-if="workflowUrl && hasNoVisualChanges"
			:description="t('workflowDiff.noVisualChanges')"
			icon="workflow"
		>
			<OpenInN8nButton
				:label="t('workflowDiff.openButtonShort')"
				@click="handleOpenWorkflow(WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES.FALLBACK_CARD)"
			/>
		</McpFallbackCard>

		<McpFallbackCard
			v-else-if="workflowUrl && !diffError && diffLoading"
			:description="t('workflowDiff.loadingDiff')"
			loading
		>
			<OpenInN8nButton
				:label="t('workflowDiff.openButtonShort')"
				@click="handleOpenWorkflow(WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES.FALLBACK_CARD)"
			/>
		</McpFallbackCard>

		<McpFallbackCard
			v-else-if="workflowUrl"
			:description="t('workflowDiff.fallbackDescription')"
			icon="workflow"
		>
			<OpenInN8nButton
				class="open-button"
				:label="t('workflowDiff.openButtonShort')"
				variant="solid"
				size="medium"
				@click="handleOpenWorkflow(WORKFLOW_DIFF_OPEN_IN_N8N_SOURCES.FALLBACK_CARD)"
			/>
		</McpFallbackCard>

		<N8nSpinner v-else type="ring" />
	</McpAppContainer>
</template>

<style scoped lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.open-button {
	@include motion.fade-in-up;
}
</style>
