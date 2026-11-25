<script setup lang="ts">
import type { AgentApprovalRoute, AgentConfigValidationIssue } from '@n8n/api-types';
import { createReusableTemplate } from '@vueuse/core';
import { N8nCallout, N8nSettingsRowGroup, N8nTabs, N8nText } from '@n8n/design-system';
import {
	RestrictedTypeCallout,
	useNodeTypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { extractFromAICalls, type INode } from 'n8n-workflow';
import {
	computed,
	effectScope,
	onBeforeUnmount,
	ref,
	toValue,
	watch,
	type MaybeRefOrGetter,
} from 'vue';

import { HTTP_REQUEST_NODE_TYPE, HTTP_REQUEST_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import {
	toolRefToNode,
	updateToolRefFromNode,
	updateWorkflowToolRef,
} from '../composables/useAgentToolRefAdapter';
import { nodeToMcpServer } from '../composables/useMcpServerAdapter';
import { isRestrictedByInlineTool } from '../utils/validationIssues';
import { hitlMcpServerKey, hitlToolKey } from '../utils/hitlConfiguration';
import type {
	AgentJsonMcpServerConfig,
	AgentJsonToolRef,
	CustomToolEntry,
	WorkflowToolRef,
} from '../types';
import AgentApprovalRouteSelect from './AgentApprovalRouteSelect.vue';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import AgentToolConfigCustomContent from './AgentToolConfigCustomContent.vue';
import AgentToolConfigMcpApprovalSetting from './AgentToolConfigMcpApprovalSetting.vue';
import AgentToolConfigNodeContent from './AgentToolConfigNodeContent.vue';
import AgentToolConfigWorkflowContent from './AgentToolConfigWorkflowContent.vue';
import AgentToolGuardrailsSection, {
	type ToolGuardrailsWiring,
	type OpenGuardrailRequest,
} from './AgentToolGuardrailsSection.vue';

interface ToolModalData {
	toolRef: AgentJsonToolRef;
	customTool?: CustomToolEntry;
	existingToolNames?: string[];
	projectId?: string;
	agentId?: string;
	/** A getter keeps the form current when the builder validates again while the modal is open. */
	validationIssues?: MaybeRefOrGetter<AgentConfigValidationIssue[]>;
	/** Inline agents pass false because approval needs suspend and resume. */
	supportsToolApproval?: boolean;
	approvalContext?: AgentHitlContext;
	onConfirm: (updatedRef: AgentJsonToolRef) => void;
	onRemove?: () => void;
	kind?: 'tool';
	initialTab?: ToolConfigTab;
	/**
	 * Tool-guardrails wiring. Present only on hosts whose agent supports
	 * guardrails, and only for existing node/workflow tools; commits are
	 * agent-level and immediate, independent of this form's Save.
	 */
	guardrails?: ToolGuardrailsWiring;
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
	approvalContext?: AgentHitlContext;
	onConfirm: (updatedServer: AgentJsonMcpServerConfig) => void;
	onRemove?: () => void;
}

export type AgentToolConfigModalData = ToolModalData | McpServerModalData;
export type ToolConfigTab = 'parameters' | 'guardrails';

const props = defineProps<{
	data: AgentToolConfigModalData;
}>();

const emit = defineEmits<{
	'update:title': [title: string];
	'credential-deleted': [];
	'update:restricted': [restricted: boolean];
	/** A guardrail edit/create that replaces the modal this form lives in. */
	'open-guardrail': [request: OpenGuardrailRequest];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const httpRequestUrlErrorKey =
	'agents.builder.validation.issue.httpRequestUrlFromAi' as BaseTextKey;

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
const toolValidationIssues = computed(() => toValue(toolModalData.value?.validationIssues) ?? []);
const isWorkflowTool = computed(() => toolModalData.value?.toolRef.type === 'workflow');
const isCustomTool = computed(() => toolModalData.value?.toolRef.type === 'custom');

/**
 * The Guardrails section shows for an existing node or workflow tool whose
 * host wired guardrails in. New tools, MCP servers, custom tools, and inline
 * agents have none: refs cannot target them yet, or the host carries no
 * agent-level config to commit to.
 */
const guardrailsSection = computed(() => {
	const data = toolModalData.value;
	if (!data?.guardrails || !data.onRemove) return null;
	if (data.toolRef.type !== 'node' && data.toolRef.type !== 'workflow') return null;
	return { toolRef: data.toolRef, wiring: data.guardrails };
});

const nodeContentRef = ref<InstanceType<typeof AgentToolConfigNodeContent> | null>(null);
const mcpContentRef = ref<InstanceType<typeof AgentToolConfigNodeContent> | null>(null);
const workflowContentRef = ref<InstanceType<typeof AgentToolConfigWorkflowContent> | null>(null);
const isValid = ref(false);
const submitCount = ref(0);
const approvalRequired = ref(false);
const approvalRoute = ref<AgentApprovalRoute>();
watch(
	() => props.data,
	(data) => {
		approvalRoute.value = isMcpServerModalData(data)
			? data.mcpServer.approvalRoute
			: data.toolRef.approvalRoute;
	},
	{ immediate: true },
);
const mcpPermissions = ref<AgentJsonMcpServerConfig['toolPermissions']>();
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

const { isRestricted, restriction } = useNodeTypeRestriction(() => initialNode.value?.type);
const restrictedToolName = computed(() =>
	initialNode.value
		? (nodeTypesStore.getNodeType(initialNode.value.type)?.displayName ?? initialNode.value.type)
		: '',
);

watch(isRestricted, (restricted) => emit('update:restricted', restricted), { immediate: true });

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
const approvalToolKey = computed(() =>
	isMcpServerModalData(props.data)
		? hitlMcpServerKey(props.data.mcpServer.name)
		: hitlToolKey(props.data.toolRef),
);
const hasReviewContext = computed(
	() => supportsApproval.value && !!props.data.approvalContext && !!props.data.projectId,
);
const [DefineParameters, ReuseParameters] = createReusableTemplate();
const activeTab = ref<ToolConfigTab>(toolModalData.value?.initialTab ?? 'parameters');
const tabs = computed(() => [
	{ value: 'parameters' as const, label: i18n.baseText('nodeSettings.parameters') },
	{ value: 'guardrails' as const, label: i18n.baseText('agents.builder.guardrails.title') },
]);
const showTabs = computed(
	() => !isMcpTool.value && (supportsApproval.value || guardrailsSection.value),
);

watch(
	() => toolModalData.value?.toolRef,
	(toolRef) => {
		approvalRequired.value = Boolean(toolRef?.requireApproval);
	},
	{ immediate: true },
);

watch(
	() => mcpModalData.value?.mcpServer.toolPermissions,
	(toolPermissions) => {
		mcpPermissions.value = toolPermissions ?? {
			categories: { read: 'always_allow', write: 'always_allow' },
		};
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

/**
 * The tool itself is allowed but the agent it embeds holds a denied node type. The form stays
 * editable on purpose: removing that embedded tool is the only fix, so locking it would strand
 * the agent.
 */
const embedsRestrictedTool = computed(() =>
	toolValidationIssues.value.some(isRestrictedByInlineTool),
);
const hasHttpRequestUrlIssue = computed(() => {
	const data = toolModalData.value;
	if (data?.toolRef.type !== 'node') return false;
	if (
		!toolValidationIssues.value.some(
			(issue) => issue.code === 'invalid_value' && issue.path.endsWith('.node.nodeParameters.url'),
		)
	) {
		return false;
	}
	return containsFromAiCall(currentNode.value?.parameters.url);
});

const canSave = computed(() => {
	if (isCustomTool.value) return true;
	if (isMcpTool.value) {
		return isValid.value && (!supportsApproval.value || mcpApprovalValid.value);
	}
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
	const updatedRef = {
		...ref,
		approvalRoute: approvalRequired.value ? approvalRoute.value : undefined,
	};
	if (approvalRequired.value) updatedRef.requireApproval = true;
	else delete updatedRef.requireApproval;
	return updatedRef;
}

function confirm(): boolean {
	submitCount.value += 1;
	if (!canSave.value) {
		activeTab.value = 'parameters';
		return false;
	}

	if (isCustomTool.value) {
		const toolData = toolModalData.value;
		if (!toolData) return false;
		toolData.onConfirm(withApprovalRequirement(toolData.toolRef));
		return true;
	}

	if (isMcpTool.value) {
		const currentMcpNode = mcpContentRef.value?.getNode();
		const mcpData = mcpModalData.value;
		if (!currentMcpNode || !mcpData || !mcpPermissions.value) return false;
		const updatedServer = nodeToMcpServer(currentMcpNode, mcpData.mcpServer);
		mcpData.onConfirm({
			...updatedServer,
			approvalRoute: supportsApproval.value ? approvalRoute.value : undefined,
			toolPermissions: supportsApproval.value
				? mcpPermissions.value
				: {
						categories: {
							read: 'always_allow',
							write: 'always_allow',
						},
					},
		});
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

const credentialListeners = effectScope(true);
credentialListeners.run(() => {
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialDeleted: (credentialId) => {
			const data = mcpModalData.value;
			if (!data || data.mcpServer.credential !== credentialId) return;
			data.onRemove?.();
			emit('credential-deleted');
		},
	});
});
onBeforeUnmount(() => credentialListeners.stop());

defineExpose({ canSave, confirm, remove, changeTitle });
</script>

<template>
	<div :class="$style.contentWrapper">
		<RestrictedTypeCallout
			v-if="isRestricted"
			surface="tool"
			:type-name="restrictedToolName"
			:restriction="restriction"
		/>
		<N8nCallout
			v-else-if="embedsRestrictedTool"
			theme="warning"
			data-test-id="inline-restricted-tool-callout"
		>
			{{ i18n.baseText('agents.toolConfig.restrictedInlineTool' as BaseTextKey) }}
		</N8nCallout>
		<N8nText
			v-if="submitCount && !canSave"
			size="small"
			color="danger"
			data-testid="agent-tool-config-validation-error"
		>
			{{ i18n.baseText('agents.toolConfig.validation.fixFields' as BaseTextKey) }}
		</N8nText>
		<DefineParameters>
			<AgentToolConfigCustomContent
				v-if="isCustomTool"
				:code="customToolCode"
				:class="$style.customToolViewer"
			/>
			<AgentToolConfigWorkflowContent
				v-else-if="workflowInitialRef"
				ref="workflowContentRef"
				:initial-ref="workflowInitialRef"
				:submit-count="submitCount"
				:project-id="data.projectId"
				@update:valid="isValid = $event"
				@update:node-name="handleNodeNameUpdate"
			/>
			<AgentToolConfigNodeContent
				v-else-if="initialNode && !isMcpTool"
				ref="nodeContentRef"
				:initial-node="initialNode"
				:existing-tool-names="data.existingToolNames"
				:project-id="data.projectId"
				:from-ai-disabled-parameters="fromAiDisabledParameters"
				:parameter-issues="nodeParameterIssues"
				:read-only="isRestricted"
				content-test-id="node-tool-settings-content"
				@update:valid="isValid = $event"
				@update:node-name="handleNodeNameUpdate"
				@update:node="draftNode = $event"
			/>
		</DefineParameters>

		<template v-if="isMcpTool">
			<div :class="$style.contentWrapper">
				<AgentToolConfigNodeContent
					v-if="initialNode"
					ref="mcpContentRef"
					:initial-node="initialNode"
					:existing-tool-names="data.existingToolNames"
					:project-id="data.projectId"
					:hidden-parameters="['include', 'includeTools', 'excludeTools']"
					:read-only="isRestricted"
					content-test-id="agent-tool-config-mcp-content"
					@update:valid="isValid = $event"
					@update:node-name="handleNodeNameUpdate"
					@update:node="draftNode = $event"
				/>
				<AgentToolConfigMcpApprovalSetting
					v-if="mcpPermissions && supportsApproval && currentNode"
					v-model="mcpPermissions"
					:node="currentNode"
					:disabled="isRestricted"
					:project-id="data.projectId"
					@update:valid="mcpApprovalValid = $event"
				/>
			</div>
			<AgentApprovalRouteSelect
				v-if="hasReviewContext && data.approvalContext && data.projectId"
				v-model="approvalRoute"
				:tool-key="approvalToolKey"
				:label="i18n.baseText('agents.hitl.mcpRoute')"
				:context="data.approvalContext"
				:project-id="data.projectId"
				:disabled="isRestricted"
			/>
		</template>
		<N8nTabs v-else-if="showTabs" v-model="activeTab" :options="tabs">
			<template #content>
				<div v-show="activeTab === 'parameters'" :class="$style.tabContent">
					<ReuseParameters />
				</div>
				<div
					v-show="activeTab === 'guardrails'"
					:class="[$style.contentWrapper, $style.tabContent]"
				>
					<AgentToolGuardrailsSection
						v-if="guardrailsSection"
						:tool-ref="guardrailsSection.toolRef"
						v-bind="guardrailsSection.wiring"
						@open-guardrail="emit('open-guardrail', $event)"
					/>
					<AgentApprovalRouteSelect
						v-if="hasReviewContext && data.approvalContext && data.projectId"
						v-model="approvalRoute"
						v-model:approval-required="approvalRequired"
						:tool-key="approvalToolKey"
						:context="data.approvalContext"
						:project-id="data.projectId"
						:disabled="isRestricted"
					/>
					<N8nSettingsRowGroup v-else-if="supportsApproval" :class="$style.approvalFallback">
						<AgentToolConfigApprovalSetting v-model="approvalRequired" :disabled="isRestricted" />
					</N8nSettingsRowGroup>
				</div>
			</template>
		</N8nTabs>
		<ReuseParameters v-else />
	</div>
</template>

<style lang="scss" module>
.contentWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow-x: clip;

	:global(.ndv-connection-hint-notice) {
		display: none;
	}
}

.tabContent {
	margin-block-start: var(--spacing--md);
}

.approvalFallback {
	background: transparent;
}

.customToolViewer {
	height: min(calc(var(--spacing--5xl) * 2), calc(70dvh - var(--spacing--5xl)));
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}
</style>
