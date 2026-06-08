<script setup lang="ts">
import { N8nSpinner } from '@n8n/design-system';

import McpAppContainer from '@mcp-apps/components/mcp-app-container.vue';
import McpFallbackCard from '@mcp-apps/components/mcp-fallback-card.vue';
import OpenInN8nButton from '@mcp-apps/components/open-in-n8n-button.vue';
import WorkflowPreviewCard from '@mcp-apps/components/workflow-preview/workflow-preview-card.vue';
import { useMcpHostApp } from '@mcp-apps/composables/use-mcp-host-app';
import { useMcpHostContextStyles } from '@mcp-apps/composables/use-mcp-host-context-styles';
import { useI18n } from '@mcp-apps/i18n';

import { useWorkflowPreview } from './composables/use-workflow-preview';

const { t } = useI18n();

const { app, hostContext, toolResult } = useMcpHostApp({
	name: 'n8n Workflow Preview',
	version: '0.1.0',
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
	handleOpenWorkflow,
} = useWorkflowPreview({ app, hostContext, toolResult });
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
			@open="handleOpenWorkflow"
			@preview-error="previewError = $event"
			@preview-sent-change="previewSent = $event"
		/>

		<McpFallbackCard
			v-else-if="workflowUrl && !previewError && (previewLoading || previewUrl)"
			:title="t('workflowPreview.fallbackTitle')"
			:description="t('workflowPreview.loadingPreview')"
			loading
		>
			<OpenInN8nButton @click="handleOpenWorkflow" />
		</McpFallbackCard>

		<McpFallbackCard
			v-else-if="workflowUrl"
			:title="t('workflowPreview.fallbackTitle')"
			:description="previewError ?? t('workflowPreview.fallbackDescription')"
			icon="workflow"
		>
			<OpenInN8nButton
				class="open-button"
				variant="solid"
				size="medium"
				@click="handleOpenWorkflow"
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
