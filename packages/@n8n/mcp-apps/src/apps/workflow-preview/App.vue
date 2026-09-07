<script setup lang="ts">
import { N8nSpinner } from '@n8n/design-system';

import McpAppContainer from '@mcp-apps/components/mcp-app-container.vue';
import McpFallbackCard from '@mcp-apps/components/mcp-fallback-card.vue';
import OpenInN8nButton from '@mcp-apps/components/open-in-n8n-button.vue';
import WorkflowPreviewCard from '@mcp-apps/components/workflow-preview/workflow-preview-card.vue';
import { useMcpAppCrashTelemetry } from '@mcp-apps/composables/use-mcp-app-crash-telemetry';
import { useMcpAppTelemetry } from '@mcp-apps/composables/use-mcp-app-telemetry';
import { useMcpHostApp } from '@mcp-apps/composables/use-mcp-host-app';
import { useMcpHostContextStyles } from '@mcp-apps/composables/use-mcp-host-context-styles';
import { useI18n } from '@mcp-apps/i18n';

import { useWorkflowPreview } from './composables/use-workflow-preview';
import {
	WORKFLOW_PREVIEW_APP_SLUG,
	WORKFLOW_PREVIEW_CRASH_SOURCES,
	WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES,
	WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS,
	WORKFLOW_PREVIEW_TELEMETRY_EVENTS,
} from './constants';

const { t } = useI18n();

const { app, connectionError, connectionStatus, hostContext, hostVersion, toolResult } =
	useMcpHostApp({
		name: 'n8n Workflow Preview',
		version: '0.1.0',
	});

useMcpAppTelemetry({
	app: WORKFLOW_PREVIEW_APP_SLUG,
	connectionError,
	connectionStatus,
	events: {
		renderFailed: WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_RENDER_FAILED,
	},
	hostVersion,
	renderFailedReason: WORKFLOW_PREVIEW_RENDER_FAILURE_REASONS.HOST_CONNECTION_FAILED,
});

useMcpAppCrashTelemetry({
	app: WORKFLOW_PREVIEW_APP_SLUG,
	event: WORKFLOW_PREVIEW_TELEMETRY_EVENTS.PREVIEW_CRASHED,
	hostVersion,
	sources: {
		appError: WORKFLOW_PREVIEW_CRASH_SOURCES.APP_ERROR,
		appUnhandledRejection: WORKFLOW_PREVIEW_CRASH_SOURCES.APP_UNHANDLED_REJECTION,
	},
});

useMcpHostContextStyles(hostContext);

const {
	workflowUrl,
	workflowName,
	previewUrl,
	previewWorkflow,
	previewError,
	previewLoading,
	previewSent,
	previewTheme,
	ariaLabel,
	isPreviewVisible,
	nodeCountLabel,
	handlePreviewCrash,
	handlePreviewError,
	handleOpenWorkflow,
} = useWorkflowPreview({
	app,
	appSlug: WORKFLOW_PREVIEW_APP_SLUG,
	hostContext,
	hostVersion,
	toolResult,
});
</script>

<template>
	<McpAppContainer
		:busy="!workflowUrl || previewLoading || (isPreviewVisible && !previewSent)"
		:label="ariaLabel"
	>
		<WorkflowPreviewCard
			v-if="isPreviewVisible && workflowUrl && previewUrl && previewWorkflow"
			:workflow="previewWorkflow"
			:workflow-url="workflowUrl"
			:workflow-name="workflowName"
			:node-count-label="nodeCountLabel"
			:preview-url="previewUrl"
			:preview-sent="previewSent"
			:preview-theme="previewTheme"
			@open="handleOpenWorkflow(WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES.PREVIEW_HEADER)"
			@preview-crash="handlePreviewCrash"
			@preview-error="handlePreviewError"
			@preview-sent-change="previewSent = $event"
		/>

		<McpFallbackCard
			v-else-if="workflowUrl && !previewError && (previewLoading || previewUrl)"
			:description="t('workflowPreview.loadingPreview')"
			loading
		>
			<OpenInN8nButton
				:label="t('workflowPreview.openButtonShort')"
				@click="handleOpenWorkflow(WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES.FALLBACK_CARD)"
			/>
		</McpFallbackCard>

		<McpFallbackCard
			v-else-if="workflowUrl"
			:description="t('workflowPreview.fallbackDescription')"
			icon="workflow"
		>
			<OpenInN8nButton
				class="open-button"
				:label="t('workflowPreview.openButtonShort')"
				variant="solid"
				size="medium"
				@click="handleOpenWorkflow(WORKFLOW_PREVIEW_OPEN_IN_N8N_SOURCES.FALLBACK_CARD)"
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
