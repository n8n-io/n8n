<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES } from '@n8n/api-types';
import type { INode, INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import { getWorkflow } from '@/app/api/workflows';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useToast } from '@/app/composables/useToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { IWorkflowDb } from '@/Interface';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import type {
	NodeConnectionItem,
	SectionKey,
	ToolConnectionItem,
	ToolCredentialRef,
	WorkflowConnectionItem,
} from '@/features/shared/toolsConnection/types';

import { AGENT_TOOL_CONFIG_MODAL_KEY } from '../constants';
import {
	getExistingToolNames,
	nodeTypeToNewToolRef,
	toolRefToNode,
	workflowToNewToolRef,
} from '../composables/useAgentToolRefAdapter';
import { useAgentToolCatalog } from '../composables/useAgentToolCatalog';
import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';
import {
	isMcpRelatedNodeType,
	mcpServerToNode,
	nodeTypeToNewMcpServer,
} from '../composables/useMcpServerAdapter';
import type { AgentJsonMcpServerConfig, AgentJsonToolRef, WorkflowToolRef } from '../types';
import { toToolIconSource } from '../utils/toolIconSource';

const SECTIONS: SectionKey[] = ['connected', 'nodes', 'workflows'];
const incompatibleWorkflowToolBodyNodeTypes = new Set<string>(
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
);

// DynamicModalLoader passes `open`/`active`/`mode`/`activeId` alongside the
// props we declare. Without this they fall through onto ToolsConnectionModal,
// and the inherited `open` (always true while mounted) wins over our own
// binding via mergeProps — pinning the dialog open.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data: {
		tools: AgentJsonToolRef[];
		mcpServers?: AgentJsonMcpServerConfig[];
		projectId?: string;
		agentId?: string;
		supportsToolApproval?: boolean;
		onConfirm: (payload: {
			tools?: AgentJsonToolRef[];
			mcpServers?: AgentJsonMcpServerConfig[];
		}) => void;
	};
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const rootStore = useRootStore();
const toast = useToast();
const toolTelemetry = useAgentToolTelemetry(props.data.agentId);
const { availableToolTypes, availableWorkflows, loadWorkflows } = useAgentToolCatalog();

interface WorkingToolEntry {
	localId: string;
	ref: AgentJsonToolRef;
}

interface WorkingMcpServerEntry {
	localId: string;
	server: AgentJsonMcpServerConfig;
}

function toWorkingToolEntries(
	tools: AgentJsonToolRef[],
	existingEntries: WorkingToolEntry[] = [],
): WorkingToolEntry[] {
	return tools.map((ref, index) => ({
		localId: existingEntries[index]?.localId ?? uuidv4(),
		ref,
	}));
}

function toWorkingMcpServerEntries(
	servers: AgentJsonMcpServerConfig[],
	existingEntries: WorkingMcpServerEntry[] = [],
): WorkingMcpServerEntry[] {
	return servers.map((server, index) => ({
		localId: existingEntries[index]?.localId ?? uuidv4(),
		server,
	}));
}

const workingToolEntries = ref<WorkingToolEntry[]>(toWorkingToolEntries(props.data.tools));
watch(
	() => props.data.tools,
	(tools) => {
		workingToolEntries.value = toWorkingToolEntries(tools, workingToolEntries.value);
	},
);

const workingMcpServerEntries = ref<WorkingMcpServerEntry[]>(
	toWorkingMcpServerEntries(props.data.mcpServers ?? []),
);
watch(
	() => props.data.mcpServers ?? [],
	(servers) => {
		workingMcpServerEntries.value = toWorkingMcpServerEntries(
			servers,
			workingMcpServerEntries.value,
		);
	},
);

const workingTools = computed(() => workingToolEntries.value.map(({ ref }) => ref));
const workingMcpServers = computed(() => workingMcpServerEntries.value.map(({ server }) => server));

const isConfigModalOpen = computed(
	() => uiStore.modalsById[AGENT_TOOL_CONFIG_MODAL_KEY]?.open === true,
);

// A legacy `Modal` (el-dialog, appended to #app-modals) cannot paint above
// N8nDialog's body-level portal, so the shared dialog is hidden while the
// config modal is up — same workaround Instance AI uses for the credential
// modal.
const isOpen = computed({
	get: () => !isConfigModalOpen.value,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

function openConfigModal(data: Record<string, unknown>) {
	uiStore.openModalWithData({ name: AGENT_TOOL_CONFIG_MODAL_KEY, data });
}

onMounted(() => {
	void loadWorkflows(props.data.projectId);
});

function hasRequiredCredentials(nodeType: INodeTypeDescription): boolean {
	return (nodeType.credentials ?? []).some((credential) => credential.required !== false);
}

function isConfigurableParameter(parameter: INodeProperties): boolean {
	return parameter.type !== 'notice' && parameter.type !== 'hidden';
}

function needsSetup(nodeType: INodeTypeDescription): boolean {
	return (
		hasRequiredCredentials(nodeType) || (nodeType.properties ?? []).some(isConfigurableParameter)
	);
}

function makeUniqueName(
	baseName: string,
	existingNames: string[],
	format?: (name: string, counter: number) => string,
): string {
	const defaultFormat = (name: string, counter: number) => `${name} (${counter})`;
	const formatFn = format ?? defaultFormat;
	if (!existingNames.includes(baseName)) return baseName;
	let counter = 1;
	while (existingNames.includes(formatFn(baseName, counter))) {
		counter++;
	}
	return formatFn(baseName, counter);
}

function resolveMcpNodeType(server: AgentJsonMcpServerConfig): INodeTypeDescription | null {
	const preferredTypeName = server.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE;
	return (
		nodeTypesStore.getNodeType(preferredTypeName) ??
		nodeTypesStore.getNodeType(AI_MCP_TOOL_NODE_TYPE)
	);
}

function getExistingMcpServerNames(
	servers: AgentJsonMcpServerConfig[],
	exclude?: AgentJsonMcpServerConfig,
): string[] {
	return servers.filter((server) => server !== exclude).map((server) => server.name);
}

function commit() {
	props.data.onConfirm({
		tools: workingTools.value,
		mcpServers: workingMcpServers.value,
	});
}

function addToolRef(savedRef: AgentJsonToolRef) {
	workingToolEntries.value = [...workingToolEntries.value, { localId: uuidv4(), ref: savedRef }];
	toolTelemetry.trackAdded(savedRef);
	commit();
	uiStore.closeModal(props.modalName);
	toast.showMessage({
		title: i18n.baseText('agents.tools.added'),
		type: 'success',
	});
}

function addMcpServer(savedServer: AgentJsonMcpServerConfig) {
	workingMcpServerEntries.value = [
		...workingMcpServerEntries.value,
		{ localId: uuidv4(), server: savedServer },
	];
	toolTelemetry.trackAddedMcpServer(savedServer);
	commit();
	uiStore.closeModal(props.modalName);
	toast.showMessage({
		title: i18n.baseText('agents.tools.mcp.added'),
		type: 'success',
	});
}

function openConfigForNewRef(newRef: AgentJsonToolRef) {
	openConfigModal({
		toolRef: newRef,
		projectId: props.data.projectId,
		agentId: props.data.agentId,
		supportsToolApproval: props.data.supportsToolApproval,
		existingToolNames: getExistingToolNames(workingTools.value),
		onConfirm: (savedRef: AgentJsonToolRef) => {
			addToolRef(savedRef);
		},
	});
}

function openConfigForNewMcpServer(
	server: AgentJsonMcpServerConfig,
	nodeType: INodeTypeDescription,
) {
	openConfigModal({
		kind: 'mcpServer',
		mcpServer: server,
		initialNode: mcpServerToNode(server, nodeType),
		projectId: props.data.projectId,
		agentId: props.data.agentId,
		supportsToolApproval: props.data.supportsToolApproval,
		existingToolNames: getExistingMcpServerNames(workingMcpServers.value),
		onConfirm: (savedServer: AgentJsonMcpServerConfig) => {
			addMcpServer(savedServer);
		},
	});
}

function handleAddMcpServer(nodeType: INodeTypeDescription) {
	const newServer = nodeTypeToNewMcpServer(nodeType);
	newServer.name = makeUniqueName(
		newServer.name,
		getExistingMcpServerNames(workingMcpServers.value),
		(name, counter) => `${name}-${counter}`,
	);
	openConfigForNewMcpServer(newServer, nodeType);
}

function handleAddTool(nodeType: INodeTypeDescription) {
	if (isMcpRelatedNodeType(nodeType.name)) {
		handleAddMcpServer(nodeType);
		return;
	}

	toolTelemetry.trackAddStarted('node');
	const newRef = nodeTypeToNewToolRef(nodeType);

	if (needsSetup(nodeType)) {
		openConfigForNewRef(newRef);
		return;
	}

	if (newRef.type === 'node') {
		addToolRef({
			...newRef,
			name: makeUniqueName(
				newRef.name ?? nodeType.displayName,
				getExistingToolNames(workingTools.value),
			),
		});
	} else {
		addToolRef({
			...newRef,
		});
	}
}

async function handleAddWorkflow(workflow: IWorkflowDb) {
	toolTelemetry.trackAddStarted('workflow');

	let full: IWorkflowDb;
	try {
		full = await getWorkflow(rootStore.restApiContext, workflow.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.tools.workflow.fetchFailed.title'), {
			message: i18n.baseText('agents.tools.workflow.fetchFailed.message'),
		});
		return;
	}

	const incompatible = (full.nodes ?? []).filter((node) =>
		incompatibleWorkflowToolBodyNodeTypes.has(node.type),
	);
	if (incompatible.length > 0) {
		const nodeNames = incompatible.map((n) => n.name).join(', ');
		toast.showError(
			new Error(
				i18n.baseText('agents.tools.workflow.incompatible.message', {
					interpolate: { name: workflow.name, nodes: nodeNames },
				}),
			),
			i18n.baseText('agents.tools.workflow.incompatible.title'),
		);
		return;
	}

	openConfigForNewRef(workflowToNewToolRef(workflow));
}

function openConfigForToolEntry(entry: WorkingToolEntry) {
	const toolRef = entry.ref;
	openConfigModal({
		toolRef,
		projectId: props.data.projectId,
		agentId: props.data.agentId,
		supportsToolApproval: props.data.supportsToolApproval,
		existingToolNames: getExistingToolNames(workingTools.value, toolRef),
		onConfirm: (updatedRef: AgentJsonToolRef) => {
			workingToolEntries.value = workingToolEntries.value.map((e) =>
				e.localId === entry.localId ? { ...e, ref: updatedRef } : e,
			);
			toolTelemetry.trackEdited(updatedRef);
			commit();
		},
	});
}

function openConfigForMcpEntry(entry: WorkingMcpServerEntry) {
	const nodeType = resolveMcpNodeType(entry.server);
	if (!nodeType) return;

	openConfigModal({
		kind: 'mcpServer',
		mcpServer: entry.server,
		initialNode: mcpServerToNode(entry.server, nodeType),
		projectId: props.data.projectId,
		agentId: props.data.agentId,
		supportsToolApproval: props.data.supportsToolApproval,
		existingToolNames: getExistingMcpServerNames(workingMcpServers.value, entry.server),
		onConfirm: (updatedServer: AgentJsonMcpServerConfig) => {
			workingMcpServerEntries.value = workingMcpServerEntries.value.map((e) =>
				e.localId === entry.localId ? { ...e, server: updatedServer } : e,
			);
			commit();
		},
	});
}

function credentialsFromNode(node: INode): ToolCredentialRef[] {
	return Object.entries(node.credentials ?? {}).flatMap(([authType, cred]) =>
		cred.id ? [{ authType, credentialId: cred.id }] : [],
	);
}

function credentialSubtitle(node: INode): string | undefined {
	const creds = node.credentials ?? {};
	const firstCred = Object.values(creds)[0];
	return firstCred?.name;
}

function connectedToolItem(entry: WorkingToolEntry): ToolConnectionItem | null {
	const { localId, ref } = entry;
	if (ref.type === 'workflow') {
		const workflowRef = ref as WorkflowToolRef;
		const item: WorkflowConnectionItem = {
			id: `tool:${localId}`,
			kind: 'workflow',
			workflowId: workflowRef.workflow,
			title: workflowRef.name ?? workflowRef.workflow,
			description: workflowRef.description,
			isConnected: true,
			credentials: [],
		};
		return item;
	}

	if (ref.type !== 'node') return null;

	const node = toolRefToNode(ref);
	if (!node) return null;
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	if (!nodeType) return null;

	const item: NodeConnectionItem = {
		id: `tool:${localId}`,
		kind: 'node',
		nodeTypeName: nodeType.name,
		title: node.name,
		description: credentialSubtitle(node) ?? nodeType.description,
		longDescription: nodeType.description,
		isConnected: true,
		iconSource: toToolIconSource(nodeType),
		credentials: credentialsFromNode(node),
	};
	return item;
}

function connectedMcpItem(entry: WorkingMcpServerEntry): ToolConnectionItem | null {
	const nodeType = resolveMcpNodeType(entry.server);
	if (!nodeType) return null;
	const node = mcpServerToNode(entry.server, nodeType);
	const item: NodeConnectionItem = {
		id: `mcp:${entry.localId}`,
		kind: 'node',
		nodeTypeName: nodeType.name,
		title: entry.server.name,
		description: credentialSubtitle(node) ?? nodeType.description,
		longDescription: nodeType.description,
		isConnected: true,
		iconSource: toToolIconSource(nodeType),
		credentials: credentialsFromNode(node),
	};
	return item;
}

function availableNodeItem(nodeType: INodeTypeDescription): NodeConnectionItem {
	return {
		id: `nodeType:${nodeType.name}`,
		kind: 'node',
		nodeTypeName: nodeType.name,
		title: nodeType.displayName.replace(/ Tool$/, ''),
		description: nodeType.description,
		longDescription: nodeType.description,
		isConnected: false,
		iconSource: toToolIconSource(nodeType),
		credentials: [],
	};
}

function availableWorkflowItem(workflow: IWorkflowDb): WorkflowConnectionItem {
	return {
		id: `workflow:${workflow.id}`,
		kind: 'workflow',
		workflowId: workflow.id,
		title: workflow.name,
		description: workflow.description,
		isConnected: false,
		credentials: [],
	};
}

const items = computed<ToolConnectionItem[]>(() => {
	const out: ToolConnectionItem[] = [];

	for (const entry of workingMcpServerEntries.value) {
		const item = connectedMcpItem(entry);
		if (item) out.push(item);
	}
	for (const entry of workingToolEntries.value) {
		const item = connectedToolItem(entry);
		if (item) out.push(item);
	}
	for (const nodeType of availableToolTypes.value) {
		out.push(availableNodeItem(nodeType));
	}
	for (const workflow of availableWorkflows.value) {
		out.push(availableWorkflowItem(workflow));
	}

	return out;
});

function handleRowActivate(item: ToolConnectionItem) {
	if (item.isConnected) {
		if (item.id.startsWith('mcp:')) {
			const localId = item.id.slice('mcp:'.length);
			const entry = workingMcpServerEntries.value.find((e) => e.localId === localId);
			if (entry) openConfigForMcpEntry(entry);
			return;
		}
		if (item.id.startsWith('tool:')) {
			const localId = item.id.slice('tool:'.length);
			const entry = workingToolEntries.value.find((e) => e.localId === localId);
			if (entry) openConfigForToolEntry(entry);
		}
		return;
	}

	if (item.kind === 'workflow' && item.id.startsWith('workflow:')) {
		const workflowId = item.id.slice('workflow:'.length);
		const workflow = availableWorkflows.value.find((wf) => wf.id === workflowId);
		if (workflow) void handleAddWorkflow(workflow);
		return;
	}

	if (item.kind === 'node' && item.id.startsWith('nodeType:')) {
		const nodeTypeName = item.id.slice('nodeType:'.length);
		const nodeType = availableToolTypes.value.find((nt) => nt.name === nodeTypeName);
		if (nodeType) handleAddTool(nodeType);
	}
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:sections="SECTIONS"
		:detail-item="null"
		@connect="handleRowActivate"
		@open-detail="handleRowActivate"
	/>
</template>
