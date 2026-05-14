<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nPromptInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { NODE_CREATOR_OPEN_SOURCES } from '@/app/constants';
import { parseCanvasConnectionHandleString } from '@/features/workflows/canvas/canvas.utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useBuilderV2Store } from '../stores/builder-v2.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import type { BuilderV2ConnectionContext, BuilderV2InsertionPoint } from '../builder-v2.api';

const i18n = useI18n();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const builderStore = useBuilderV2Store();
const nodeCreatorStore = useNodeCreatorStore();
const chatPanelStore = useChatPanelStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const prompt = ref('');

const projectId = computed(() => projectsStore.currentProjectId ?? 'default-project-id');

const isVisible = computed(() =>
	[
		NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
		NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
		NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
		NODE_CREATOR_OPEN_SOURCES.ADD_INPUT_ENDPOINT,
	].includes(nodeCreatorStore.openSource),
);

function getWorkflowJson(): unknown {
	const snap = workflowDocumentStore.value.getSnapshot();
	return { nodes: snap.nodes ?? [], connections: snap.connections ?? {} };
}

function getBuilderContext(): {
	insertionPoint: BuilderV2InsertionPoint;
	connectionContext?: BuilderV2ConnectionContext;
} {
	const nodeId = uiStore.lastInteractedWithNodeId;
	const sourceHandle = uiStore.lastInteractedWithNodeHandle;

	if (!nodeId || !sourceHandle) {
		return { insertionPoint: { kind: 'fromStart' } };
	}

	const source = parseCanvasConnectionHandleString(sourceHandle);
	const connectionContext: BuilderV2ConnectionContext = {
		nodeId,
		mode: source.mode,
		type: source.type,
		index: source.index,
	};

	const existingConnection = uiStore.lastInteractedWithNodeConnection;
	if (existingConnection?.target && existingConnection.targetHandle) {
		const target = parseCanvasConnectionHandleString(existingConnection.targetHandle);
		connectionContext.targetNodeId = existingConnection.target;
		connectionContext.targetType = target.type;
		connectionContext.targetIndex = target.index;
	}

	return { insertionPoint: { kind: 'after', afterNodeId: nodeId }, connectionContext };
}

async function onSubmit() {
	const nextPrompt = prompt.value.trim();
	if (!nextPrompt || builderStore.isLoading || builderStore.hasGhosts) return;

	const context = getBuilderContext();
	await chatPanelStore.open({ mode: 'builder', showCoachmark: false });
	await builderStore.startNewSession(projectId.value, nextPrompt, getWorkflowJson(), context);
	prompt.value = '';
	nodeCreatorStore.isCreateNodeActive = false;
}
</script>

<template>
	<form
		v-if="isVisible"
		:class="$style.prompt"
		data-test-id="builder-v2-node-creator-prompt"
		@submit.prevent="onSubmit"
		@keydown.stop
	>
		<N8nPromptInput
			v-model="prompt"
			:placeholder="i18n.baseText('nodeCreator.builderPrompt.placeholder')"
			:disabled="builderStore.isLoading || builderStore.hasGhosts"
			:max-lines-before-scroll="4"
			autofocus
			data-test-id="builder-v2-node-creator-input"
			@submit="onSubmit"
		/>
	</form>
</template>

<style module lang="scss">
.prompt {
	padding: var(--spacing--sm) var(--spacing--sm) 0;

	:deep(.el-tooltip__trigger) {
		display: block;
		width: 100%;
	}
}
</style>
