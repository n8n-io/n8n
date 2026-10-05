<script setup lang="ts">
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { extractFromAICalls, type INode } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';

import { HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import {
	toolRefToNode,
	updateToolRefFromNode,
	updateWorkflowToolRef,
} from '../composables/useAgentToolRefAdapter';
import { nodeToMcpServer } from '../composables/useMcpServerAdapter';
import type {
	AgentJsonMcpServerConfig,
	AgentJsonToolRef,
	CustomToolEntry,
	WorkflowToolRef,
} from '../types';
import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import AgentToolConfigCustomContent from './AgentToolConfigCustomContent.vue';
import AgentToolConfigMcpApprovalSetting from './AgentToolConfigMcpApprovalSetting.vue';
import AgentToolConfigNodeContent from './AgentToolConfigNodeContent.vue';
import AgentToolConfigWorkflowContent from './AgentToolConfigWorkflowContent.vue';

interface ToolModalData {
	toolRef: AgentJsonToolRef;
	customTool?: CustomToolEntry;
	existingToolNames?: string[];
	projectId?: string;
	agentId?: string;
	validationIssues?: AgentConfigValidationIssue[];
	/** Inline agents pass false because approval needs suspend and resume. */
	supportsToolApproval?: boolean;
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
	/** Inline agents pass false because approval needs suspend and resume. */
	supportsToolApproval?: boolean;
	onConfirm: (updatedServer: AgentJsonMcpServerConfig) => void;
	onRemove?: () => void;
}

export type AgentToolConfigModalData = ToolModalData | McpServerModalData;

const props = defineProps<{
	data: AgentToolConfigModalData;
}>();

const emit = defineEmits<{
	'update:title': [title: string];
	'update:credentialModalOpen': [open: boolean];
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const httpRequestUrlErrorKey =
	'agents.builder.validation.issue.httpRequestUrlFromAi' as BaseTextKey;

const credentialModalOpen = computed(
	() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true,
);
watch(credentialModalOpen, (open) => emit('update:credentialModalOpen', open), { immediate: true });

function isMcpServerModalData(data: AgentToolConfigModalData): data is McpServerModalData {
	return data.kind === 'mcpServer';
}

function containsFromAiCall(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	try {
		return extractFromAICalls(value).length > 0;
	} catch {
		return false;
	}
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
const submitted = ref(false);
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
const title = computed(() => (isCustomTool.value ? customToolTitle.value : nodeName.value));

const supportsApproval = computed(() => props.data.supportsToolApproval !== false);
const showApprovalSetting = computed(
	() => supportsApproval.value && !isMcpTool.value && toolModalData.value !== null,
);

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

watch(title, (value) => emit('update:title', value), { immediate: true });

const currentNode = computed(() => draftNode.value ?? initialNode.value);
const hasHttpRequestUrlIssue = computed(() => {
	const data = toolModalData.value;
	if (data?.toolRef.type !== 'node') return false;
	if (
		!data.validationIssues?.some(
			(issue) => issue.code === 'invalid_value' && issue.path.endsWith('.node.nodeParameters.url'),
		)
	) {
		return false;
	}
	return containsFromAiCall(currentNode.value?.parameters.url);
});

const canSave = computed(() => {
	if (isCustomTool.value) return true;
	if (isMcpTool.value) return isValid.value && mcpApprovalValid.value;
	return isValid.value && !hasHttpRequestUrlIssue.value;
});

const fromAiDisabledParameters = computed(() => {
	const toolRef = toolModalData.value?.toolRef;
	if (
		toolRef?.type === 'node' &&
		(toolRef.node.nodeType === HTTP_REQUEST_NODE_TYPE ||
			toolRef.node.nodeType === HTTP_REQUEST_TOOL_NODE_TYPE)
	) {
		return ['url'];
	}
	return [];
});

const nodeParameterIssues = computed<Record<string, string[]>>(() => {
	const issues: Record<string, string[]> = {};
	if (hasHttpRequestUrlIssue.value) {
		issues.url = [i18n.baseText(httpRequestUrlErrorKey)];
	}
	return issues;
});

function withApprovalRequirement(ref: AgentJsonToolRef): AgentJsonToolRef {
	if (!supportsApproval.value) {
		const { requireApproval: _requireApproval, ...rest } = ref;
		return rest;
	}
	const updatedRef = { ...ref };
	if (approvalRequired.value) updatedRef.requireApproval = true;
	else delete updatedRef.requireApproval;
	return updatedRef;
}

function withMcpApproval(server: AgentJsonMcpServerConfig): AgentJsonMcpServerConfig {
	const updatedServer = { ...server };
	if (supportsApproval.value && mcpApproval.value) updatedServer.approval = mcpApproval.value;
	else delete updatedServer.approval;
	return updatedServer;
}

function confirm(): boolean {
	submitted.value = true;
	if (!canSave.value) return false;

	if (isCustomTool.value) {
		const toolData = toolModalData.value;
		if (!toolData) return false;
		toolData.onConfirm(withApprovalRequirement(toolData.toolRef));
		return true;
	}

	if (isMcpTool.value) {
		const currentMcpNode = mcpContentRef.value?.getNode();
		const mcpData = mcpModalData.value;
		if (!currentMcpNode || !mcpData) return false;
		const updatedServer = nodeToMcpServer(currentMcpNode, mcpData.mcpServer);
		mcpData.onConfirm(withMcpApproval(updatedServer));
		return true;
	}

	if (isWorkflowTool.value) {
		const content = workflowContentRef.value;
		const toolData = toolModalData.value;
		if (!toolData || !content) return false;
		const workflowId = content.getWorkflowId();
		const updatedRef = updateWorkflowToolRef(toolData.toolRef, {
			name: content.getName(),
			description: content.getDescription(),
			allOutputs: content.getAllOutputs(),
			workflow: content.getWorkflow(),
			...(workflowId !== undefined ? { workflowId } : {}),
			inputs: content.getInputs(),
		});
		toolData.onConfirm(withApprovalRequirement(updatedRef));
		return true;
	}

	const currentToolNode = nodeContentRef.value?.getNode();
	const toolData = toolModalData.value;
	if (!currentToolNode || !toolData) return false;
	const updatedRef = updateToolRefFromNode(toolData.toolRef, currentToolNode);
	toolData.onConfirm(withApprovalRequirement(updatedRef));
	return true;
}

function remove() {
	props.data.onRemove?.();
}

function changeTitle(name: string) {
	if (isCustomTool.value) return;
	if (isMcpTool.value) mcpContentRef.value?.handleChangeName(name);
	else if (isWorkflowTool.value) workflowContentRef.value?.handleChangeName(name);
	else nodeContentRef.value?.handleChangeName(name);
}

function handleNodeNameUpdate(name: string) {
	nodeName.value = name;
}

defineExpose({ canSave, confirm, remove, changeTitle, credentialModalOpen, title });
</script>

<template>
	<div :class="[$style.contentWrapper, isCustomTool && $style.codeContentWrapper]">
		<N8nText
			v-if="submitted && !canSave"
			size="small"
			color="danger"
			data-testid="agent-tool-config-validation-error"
		>
			{{ i18n.baseText('agents.toolConfig.validation.fixFields' as BaseTextKey) }}
		</N8nText>
		<AgentToolConfigCustomContent
			v-if="isCustomTool"
			:code="customToolCode"
			:class="$style.customToolViewer"
		/>
		<AgentToolConfigApprovalSetting
			v-if="isCustomTool && showApprovalSetting"
			v-model="approvalRequired"
		/>
		<div v-else :class="$style.configureTab">
			<AgentToolConfigWorkflowContent
				v-if="workflowInitialRef"
				ref="workflowContentRef"
				:initial-ref="workflowInitialRef"
				:project-id="data.projectId"
				:show-approval-setting="showApprovalSetting"
				:approval-required="approvalRequired"
				@update:valid="isValid = $event"
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
				@update:valid="isValid = $event"
				@update:node-name="handleNodeNameUpdate"
				@update:node="draftNode = $event"
			/>
			<AgentToolConfigNodeContent
				v-else-if="initialNode"
				ref="nodeContentRef"
				:initial-node="initialNode"
				:existing-tool-names="data.existingToolNames"
				:project-id="data.projectId"
				:from-ai-disabled-parameters="fromAiDisabledParameters"
				:parameter-issues="nodeParameterIssues"
				content-test-id="node-tool-settings-content"
				@update:valid="isValid = $event"
				@update:node-name="handleNodeNameUpdate"
				@update:node="draftNode = $event"
			/>
			<AgentToolConfigApprovalSetting
				v-if="!isMcpTool && initialNode && showApprovalSetting"
				v-model="approvalRequired"
			/>
			<AgentToolConfigMcpApprovalSetting
				v-if="isMcpTool && currentNode && supportsApproval"
				v-model="mcpApproval"
				:node="currentNode"
				:project-id="data.projectId"
				@update:valid="mcpApprovalValid = $event"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.contentWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	overflow-x: hidden;

	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.codeContentWrapper {
	height: min(calc(var(--spacing--5xl) * 2), calc(70dvh - var(--spacing--5xl)));
	overflow: hidden;
}

.configureTab {
	display: flex;
	min-height: 0;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.customToolViewer {
	flex: 1;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}
</style>
