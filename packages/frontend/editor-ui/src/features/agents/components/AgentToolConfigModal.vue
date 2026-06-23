<script setup lang="ts">
/**
 * Configure one agent tool entry (node/workflow/custom) or one MCP server.
 */
import { computed, ref, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nIcon, N8nRadioButtons } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';

import type {
	AgentJsonMcpServerConfig,
	AgentJsonToolRef,
	CustomToolEntry,
	WorkflowToolRef,
} from '../types';
import {
	toolRefToNode,
	updateToolRefFromNode,
	updateWorkflowToolRef,
} from '../composables/useAgentToolRefAdapter';
import { nodeToMcpServer } from '../composables/useMcpServerAdapter';
import AgentJsonEditor from './AgentJsonEditor.vue';
import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import AgentToolConfigCustomContent from './AgentToolConfigCustomContent.vue';
import AgentToolConfigMcpApprovalSetting from './AgentToolConfigMcpApprovalSetting.vue';
import AgentToolConfigModalHeader from './AgentToolConfigModalHeader.vue';
import AgentToolConfigNodeContent from './AgentToolConfigNodeContent.vue';
import AgentToolConfigWorkflowContent from './AgentToolConfigWorkflowContent.vue';

interface ToolModalData {
	toolRef: AgentJsonToolRef;
	customTool?: CustomToolEntry;
	existingToolNames?: string[];
	projectId?: string;
	agentId?: string;
	onConfirm: (updatedRef: AgentJsonToolRef) => void;
	onRemove?: () => void;
	kind?: 'tool';
}

interface McpServerModalData {
	kind: 'mcpServer';
	mcpServer: AgentJsonMcpServerConfig;
	initialNode: INode;
	existingToolNames?: string[];
	projectId?: string;
	agentId?: string;
	onConfirm: (updatedServer: AgentJsonMcpServerConfig) => void;
	onRemove?: () => void;
}

type AgentToolConfigModalData = ToolModalData | McpServerModalData;

const props = defineProps<{
	modalName: string;
	data: AgentToolConfigModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();

function isMcpServerModalData(data: AgentToolConfigModalData): data is McpServerModalData {
	return data.kind === 'mcpServer';
}

const isMcpTool = computed(() => isMcpServerModalData(props.data));
const mcpModalData = computed(() => (isMcpServerModalData(props.data) ? props.data : null));
const toolModalData = computed(() => (isMcpServerModalData(props.data) ? null : props.data));
const isWorkflowTool = computed(() => toolModalData.value?.toolRef.type === 'workflow');
const isCustomTool = computed(() => toolModalData.value?.toolRef.type === 'custom');

const nodeContentRef = ref<InstanceType<typeof AgentToolConfigNodeContent> | null>(null);
const mcpContentRef = ref<InstanceType<typeof AgentToolConfigNodeContent> | null>(null);
const workflowContentRef = ref<InstanceType<typeof AgentToolConfigWorkflowContent> | null>(null);
const isValid = ref(false);
const activeView = ref<'config' | 'raw'>('config');
const approvalRequired = ref(false);
const mcpApproval = ref<AgentJsonMcpServerConfig['approval']>();
const mcpApprovalValid = ref(true);
const draftNode = ref<INode | null>(null);

const initialNode = computed<INode | null>(() =>
	isMcpTool.value
		? (mcpModalData.value?.initialNode ?? null)
		: isWorkflowTool.value || isCustomTool.value
			? null
			: toolModalData.value
				? toolRefToNode(toolModalData.value.toolRef)
				: null,
);

const workflowInitialRef = computed<WorkflowToolRef | null>(() =>
	isWorkflowTool.value && toolModalData.value?.toolRef.type === 'workflow'
		? toolModalData.value.toolRef
		: null,
);

const initialName = computed(() => {
	if (isMcpTool.value) return mcpModalData.value?.mcpServer.name ?? '';
	const toolName =
		toolModalData.value?.toolRef.type === 'node' ? toolModalData.value.toolRef.name : undefined;
	return toolName ?? initialNode.value?.name ?? '';
});
const nodeName = ref(initialName.value);
const customToolCode = computed(() =>
	!isMcpTool.value ? (toolModalData.value?.customTool?.code ?? '') : '',
);
const customToolTitle = computed(() => {
	const toolRef = toolModalData.value?.toolRef;
	const fallbackName =
		toolRef?.type === 'custom'
			? toolRef.id
			: toolRef?.type === 'workflow' || toolRef?.type === 'node'
				? toolRef.name
				: undefined;
	return (
		toolModalData.value?.customTool?.descriptor.name ??
		fallbackName ??
		i18n.baseText('agents.builder.tree.customBadge')
	);
});

const viewOptions = computed(() => [
	{ label: 'Config', value: 'config' as const },
	{ label: 'Raw', value: 'raw' as const },
]);

const canRender = computed(
	() => isCustomTool.value || isWorkflowTool.value || initialNode.value !== null,
);
const canSave = computed(() => {
	if (isCustomTool.value) return true;
	if (isMcpTool.value) return isValid.value && mcpApprovalValid.value;
	return isValid.value;
});
const showApprovalSetting = computed(() => !isMcpTool.value && toolModalData.value !== null);

watch(
	() => toolModalData.value?.toolRef,
	(toolRef) => {
		approvalRequired.value = Boolean(toolRef?.requireApproval);
	},
	{ immediate: true },
);

watch(
	() => mcpModalData.value?.mcpServer.approval,
	(approval) => {
		mcpApproval.value = approval;
	},
	{ immediate: true },
);

watch(
	initialNode,
	(node) => {
		draftNode.value = node;
	},
	{ immediate: true },
);

const currentNode = computed(() => draftNode.value ?? initialNode.value);

const headerKind = computed<'node' | 'workflow' | 'custom' | 'mcp'>(() => {
	if (isCustomTool.value) return 'custom';
	if (isWorkflowTool.value) return 'workflow';
	if (isMcpTool.value) return 'mcp';
	return 'node';
});

const headerNodeTypeDescription = computed(() => {
	if (isMcpTool.value) {
		return mcpContentRef.value?.getNodeTypeDescription() ?? null;
	}

	if (isWorkflowTool.value || isCustomTool.value) {
		return null;
	}

	return nodeContentRef.value?.getNodeTypeDescription() ?? null;
});

const draftRawEditorValue = computed(() => {
	try {
		if (isMcpTool.value) {
			const mcpData = mcpModalData.value;
			if (!mcpData || !currentNode.value) return mcpData?.mcpServer ?? {};
			return withMcpApproval(nodeToMcpServer(currentNode.value, mcpData.mcpServer));
		}

		const toolData = toolModalData.value;
		if (!toolData) return {};

		if (toolData.toolRef.type === 'node' && draftNode.value) {
			return withApprovalRequirement(updateToolRefFromNode(toolData.toolRef, draftNode.value));
		}

		return withApprovalRequirement(toolData.toolRef);
	} catch {
		return null;
	}
});

const rawEditorValue = computed(() => {
	if (draftRawEditorValue.value) {
		return draftRawEditorValue.value;
	}
	const lastValidValue = isMcpTool.value
		? (mcpModalData.value?.mcpServer ?? {})
		: (toolModalData.value?.toolRef ?? {});
	return lastValidValue;
});

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function withApprovalRequirement(ref: AgentJsonToolRef): AgentJsonToolRef {
	const updatedRef = { ...ref };
	if (approvalRequired.value) {
		updatedRef.requireApproval = true;
	} else {
		delete updatedRef.requireApproval;
	}
	return updatedRef;
}

function withMcpApproval(server: AgentJsonMcpServerConfig): AgentJsonMcpServerConfig {
	const updatedServer = { ...server };
	if (mcpApproval.value) {
		updatedServer.approval = mcpApproval.value;
	} else {
		delete updatedServer.approval;
	}
	return updatedServer;
}

function handleConfirm() {
	if (isCustomTool.value) {
		const toolData = toolModalData.value;
		if (!toolData) return;
		toolData.onConfirm(withApprovalRequirement(toolData.toolRef));
		closeDialog();
		return;
	}

	if (isMcpTool.value) {
		const currentNode = mcpContentRef.value?.getNode();
		const mcpData = mcpModalData.value;
		if (!currentNode) return;
		if (!mcpData) return;
		const updatedServer = nodeToMcpServer(currentNode, mcpData.mcpServer);
		mcpData.onConfirm(withMcpApproval(updatedServer));
		closeDialog();
		return;
	}

	if (isWorkflowTool.value) {
		const wc = workflowContentRef.value;
		const toolData = toolModalData.value;
		if (!toolData) return;
		if (!wc) return;
		const updatedRef = updateWorkflowToolRef(toolData.toolRef, {
			name: wc.getName(),
			description: wc.getDescription(),
			allOutputs: wc.getAllOutputs(),
		});
		toolData.onConfirm(withApprovalRequirement(updatedRef));
		closeDialog();
		return;
	}

	const currentNode = nodeContentRef.value?.getNode();
	const toolData = toolModalData.value;
	if (!currentNode) return;
	if (!toolData) return;
	const updatedRef = updateToolRefFromNode(toolData.toolRef, currentNode);
	toolData.onConfirm(withApprovalRequirement(updatedRef));
	closeDialog();
}

function handleCancel() {
	closeDialog();
}

function handleRemove() {
	props.data.onRemove?.();
	closeDialog();
}

function handleChangeName(name: string) {
	if (isCustomTool.value) return;

	if (isMcpTool.value) {
		mcpContentRef.value?.handleChangeName(name);
	} else if (isWorkflowTool.value) {
		workflowContentRef.value?.handleChangeName(name);
	} else {
		nodeContentRef.value?.handleChangeName(name);
	}
}

function handleValidUpdate(valid: boolean) {
	isValid.value = valid;
}

function handleNodeNameUpdate(name: string) {
	nodeName.value = name;
}

function handleNodeUpdate(node: INode) {
	draftNode.value = node;
}
</script>

<template>
	<Modal
		v-if="canRender"
		:name="modalName"
		width="780px"
		max-height="85vh"
		data-test-id="agent-tool-config-modal"
	>
		<template #header>
			<AgentToolConfigModalHeader
				:kind="headerKind"
				:title="isCustomTool ? customToolTitle : nodeName"
				:node-type-description="headerNodeTypeDescription"
				@update:title="handleChangeName"
			/>
		</template>
		<template #content>
			<div
				:class="[
					$style.contentWrapper,
					(isCustomTool || activeView === 'raw') && $style.codeContentWrapper,
				]"
			>
				<AgentToolConfigCustomContent
					v-if="isCustomTool"
					:code="customToolCode"
					:class="$style.customToolViewer"
				/>
				<AgentToolConfigApprovalSetting
					v-if="isCustomTool && showApprovalSetting"
					v-model="approvalRequired"
				/>
				<template v-else>
					<N8nRadioButtons
						:model-value="activeView"
						:options="viewOptions"
						:class="$style.viewToggle"
						@update:model-value="activeView = $event"
					/>
					<AgentJsonEditor
						v-show="activeView === 'raw'"
						:value="rawEditorValue"
						read-only
						:show-read-only-overlay="false"
						:class="$style.rawEditor"
						copy-button-test-id="agent-tool-json-copy"
					/>
					<div v-show="activeView === 'config'" :class="$style.configureTab">
						<AgentToolConfigWorkflowContent
							v-if="workflowInitialRef"
							ref="workflowContentRef"
							:initial-ref="workflowInitialRef"
							:show-approval-setting="showApprovalSetting"
							:approval-required="approvalRequired"
							@update:valid="handleValidUpdate"
							@update:node-name="handleNodeNameUpdate"
							@update:approval-required="approvalRequired = $event"
						/>
						<AgentToolConfigNodeContent
							v-else-if="isMcpTool && initialNode"
							ref="mcpContentRef"
							:initial-node="initialNode"
							:existing-tool-names="data.existingToolNames"
							:project-id="data.projectId"
							content-test-id="agent-tool-config-mcp-content"
							@update:valid="handleValidUpdate"
							@update:node-name="handleNodeNameUpdate"
							@update:node="handleNodeUpdate"
						/>
						<AgentToolConfigNodeContent
							v-else-if="initialNode"
							ref="nodeContentRef"
							:initial-node="initialNode"
							:existing-tool-names="data.existingToolNames"
							:project-id="data.projectId"
							content-test-id="node-tool-settings-content"
							@update:valid="handleValidUpdate"
							@update:node-name="handleNodeNameUpdate"
							@update:node="handleNodeUpdate"
						/>
						<AgentToolConfigApprovalSetting
							v-if="!isMcpTool && initialNode && showApprovalSetting"
							v-model="approvalRequired"
						/>
						<AgentToolConfigMcpApprovalSetting
							v-if="isMcpTool && currentNode"
							v-model="mcpApproval"
							:node="currentNode"
							:project-id="data.projectId"
							@update:valid="mcpApprovalValid = $event"
						/>
					</div>
				</template>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="data.onRemove"
					variant="subtle"
					data-test-id="agent-tool-config-remove"
					@click="handleRemove"
				>
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.builder.tools.remove') }}
				</N8nButton>
				<div :class="$style.footerActions">
					<N8nButton variant="subtle" @click="handleCancel">
						{{ i18n.baseText('agents.toolConfig.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canSave"
						data-test-id="agent-tool-config-save"
						@click="handleConfirm"
					>
						{{ i18n.baseText('agents.toolConfig.save') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.contentWrapper {
	--agent-tool-config-content-max-height: min(
		calc(var(--spacing--5xl) * 2),
		calc(var(--dialog--max-height) - var(--spacing--5xl))
	);

	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: var(--agent-tool-config-content-max-height);
	overflow-x: hidden;
	overflow-y: auto;
	margin-right: 0;
	padding: var(--spacing--md) 0;

	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.codeContentWrapper {
	height: var(--agent-tool-config-content-max-height);
	margin-right: 0;
	padding-bottom: 0;
	overflow: hidden;
}

.configureTab {
	display: flex;
	min-height: 0;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.viewToggle {
	align-self: flex-start;
}

.rawEditor {
	flex: 1;
	width: 100%;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}

.customToolViewer {
	flex: 1;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}
</style>
