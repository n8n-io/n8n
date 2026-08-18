<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES } from '@n8n/api-types';
import { NodeConnectionTypes, isCommunityPackageName } from 'n8n-workflow';
import type { INode, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { useRouter } from 'vue-router';

import { getWorkflow } from '@/app/api/workflows';
import { VIEWS } from '@/app/constants';
import {
	SAMPLE_SUBWORKFLOW_TRIGGER_ID,
	SAMPLE_SUBWORKFLOW_WORKFLOW,
} from '@/app/constants/samples';
import { DEFAULT_NEW_WORKFLOW_NAME } from '@/app/constants/workflows';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useToast } from '@n8n/composables/useToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { stripToolSuffix } from '@/app/stores/aiGateway.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useInstallNode } from '@/features/settings/communityNodes/composables/useInstallNode';
import { useUsersStore } from '@n8n/stores/users.store';
import {
	filterAndSearchNodes,
	isNodePreviewKey,
	removePreviewToken,
} from '@/features/shared/nodeCreator/nodeCreator.utils';
import type { IWorkflowDb } from '@/Interface';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import {
	hasToolConnection,
	type NodeConnectionItem,
	type ToolCategoryKey,
	type ToolConnectionItem,
	type ToolCredentialRef,
	type WorkflowConnectionItem,
} from '@/features/shared/toolsConnection/types';

import { AGENT_TOOL_CONFIG_MODAL_KEY } from '../constants';
import {
	getExistingToolNames,
	nodeTypeToNewToolRef,
	toolRefToNode,
	workflowToNewToolRef,
} from '../composables/useAgentToolRefAdapter';
import {
	hasInputs,
	toolCategoryForNodeType,
	useAgentToolCatalog,
} from '../composables/useAgentToolCatalog';
import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';
import {
	isMcpRelatedNodeType,
	mcpServerToNode,
	nodeTypeToNewMcpServer,
} from '../composables/useMcpServerAdapter';
import type { AgentJsonMcpServerConfig, AgentJsonToolRef, WorkflowToolRef } from '../types';
import { toToolIconSource } from '../utils/toolIconSource';

const CATEGORIES: ToolCategoryKey[] = ['all', 'mcp', 'n8n', 'app-action', 'workflows'];
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
const router = useRouter();
const toast = useToast();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const toolTelemetry = useAgentToolTelemetry(props.data.agentId);
const { availableToolTypes, availableWorkflows, loadWorkflows, resolveToolNodeType } =
	useAgentToolCatalog();
const { installNode: installCommunityNode } = useInstallNode();
const usersStore = useUsersStore();

const searchQuery = ref('');
const installingToolName = ref<string | null>(null);
const isCreatingWorkflow = ref(false);

const canCreateWorkflow = computed(() => {
	if (!props.data.projectId || sourceControlStore.preferences.branchReadOnly) return false;

	const projectScopes = projectsStore.myProjects.find(
		(project) => project.id === props.data.projectId,
	)?.scopes;
	const projectPermission = getResourcePermissions(projectScopes).workflow.create;
	const globalPermission = getResourcePermissions(usersStore.currentUser?.globalScopes).workflow
		.create;

	return Boolean(globalPermission ?? projectPermission);
});

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

/**
 * The two dialogs are sequential rather than stacked: connecting a tool hands
 * over to the config modal, and this one steps aside. It stays open in the
 * store rather than closing, so cancelling the config brings the list back with
 * its search and scroll position intact.
 */
const isOpen = computed({
	get: () => uiStore.modalsById[props.modalName]?.open === true && !isConfigModalOpen.value,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

function openConfigModal(data: Record<string, unknown>) {
	uiStore.openModalWithData({ name: AGENT_TOOL_CONFIG_MODAL_KEY, data });
}

onMounted(() => {
	void loadWorkflows(props.data.projectId);
	// Same catalog load the canvas uses for verified community previews.
	void nodeTypesStore.fetchCommunityNodePreviews();
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

function isCommunityPreviewTool(nodeType: INodeTypeDescription): boolean {
	if (!isNodePreviewKey(nodeType.name)) return false;
	return !!nodeTypesStore.communityNodeType(stripToolSuffix(nodeType.name));
}

/** Reviewed and approved by n8n, whether or not it is installed yet. */
function isVerifiedCommunityTool(nodeType: INodeTypeDescription): boolean {
	return (
		isCommunityPackageName(nodeType.name) &&
		!!nodeTypesStore.communityNodeType(stripToolSuffix(nodeType.name))?.isOfficialNode
	);
}

function communityPackageNameFor(nodeType: INodeTypeDescription): string {
	const baseName = stripToolSuffix(nodeType.name);
	return (
		nodeTypesStore.communityNodeType(baseName)?.packageName ??
		removePreviewToken(nodeType.name.split('.')[0] ?? nodeType.name)
	);
}

async function installAndAddCommunityPreview(nodeType: INodeTypeDescription) {
	installingToolName.value = nodeType.name;
	try {
		const result = await installCommunityNode({
			type: 'verified',
			packageName: communityPackageNameFor(nodeType),
			nodeType: stripToolSuffix(nodeType.name),
			telemetry: { source: 'agent builder tools', hasQuickConnect: false },
		});
		if (!result.success) return;

		const installedName = removePreviewToken(nodeType.name);
		const installed = nodeTypesStore.getNodeType(installedName);
		if (!installed) {
			toast.showError(
				new Error(i18n.baseText('agents.tools.install.unresolved.message')),
				i18n.baseText('agents.tools.install.unresolved.title'),
			);
			return;
		}
		addNodeTool(installed);
	} finally {
		installingToolName.value = null;
	}
}

async function handleAddTool(nodeType: INodeTypeDescription) {
	if (isMcpRelatedNodeType(nodeType.name)) {
		handleAddMcpServer(nodeType);
		return;
	}

	if (isCommunityPreviewTool(nodeType)) {
		await installAndAddCommunityPreview(nodeType);
		return;
	}

	addNodeTool(nodeType);
}

function addNodeTool(nodeType: INodeTypeDescription) {
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

async function handleCreateWorkflow() {
	const projectId = props.data.projectId;
	if (!projectId || !canCreateWorkflow.value || isCreatingWorkflow.value) return;

	isCreatingWorkflow.value = true;
	toolTelemetry.trackAddStarted('workflow');

	try {
		const sampleName = DEFAULT_NEW_WORKFLOW_NAME;
		const matchingWorkflows = availableWorkflows.value.filter((workflow) =>
			workflow.name?.startsWith(sampleName),
		);
		const newWorkflow = await workflowsStore.createNewWorkflow({
			...SAMPLE_SUBWORKFLOW_WORKFLOW,
			name: `${sampleName} ${matchingWorkflows.length + 1}`,
			projectId,
		});
		const newRef = workflowToNewToolRef(newWorkflow);

		openConfigForNewRef({
			...newRef,
			name: makeUniqueName(
				newRef.name ?? newWorkflow.name,
				getExistingToolNames(workingTools.value),
			),
		});

		const { href } = router.resolve({
			name: VIEWS.WORKFLOW,
			params: {
				workflowId: newWorkflow.id,
				nodeId: SAMPLE_SUBWORKFLOW_TRIGGER_ID,
			},
		});
		window.open(href, '_blank');
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.tools.workflow.createFailed.title'), {
			message: i18n.baseText('agents.tools.workflow.createFailed.message'),
		});
	} finally {
		isCreatingWorkflow.value = false;
	}
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
			uiStore.closeModal(props.modalName);
		},
		onRemove: () => {
			workingToolEntries.value = workingToolEntries.value.filter(
				(e) => e.localId !== entry.localId,
			);
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
			uiStore.closeModal(props.modalName);
		},
		onRemove: () => {
			workingMcpServerEntries.value = workingMcpServerEntries.value.filter(
				(e) => e.localId !== entry.localId,
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
			category: 'workflows',
			workflowId: workflowRef.workflowId ?? workflowRef.workflow,
			title: workflowRef.name ?? workflowRef.workflow,
			description: workflowRef.description,
			status: 'connected',
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
		category: toolCategoryForNodeType(nodeType),
		nodeTypeName: nodeType.name,
		title: node.name,
		description: credentialSubtitle(node) ?? nodeType.description,
		longDescription: nodeType.description,
		status: 'connected',
		iconSource: toToolIconSource(nodeType),
		credentials: credentialsFromNode(node),
		verified: isVerifiedCommunityTool(nodeType),
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
		category: 'mcp',
		nodeTypeName: nodeType.name,
		title: entry.server.name,
		description: credentialSubtitle(node) ?? nodeType.description,
		longDescription: nodeType.description,
		status: 'connected',
		iconSource: toToolIconSource(nodeType),
		credentials: credentialsFromNode(node),
	};
	return item;
}

function availableNodeItem(nodeType: INodeTypeDescription): NodeConnectionItem {
	const communityPreview = isCommunityPreviewTool(nodeType);
	return {
		id: `nodeType:${nodeType.name}`,
		kind: 'node',
		category: toolCategoryForNodeType(nodeType),
		nodeTypeName: nodeType.name,
		title: nodeType.displayName.replace(/ Tool$/, ''),
		description: nodeType.description,
		longDescription: nodeType.description,
		status: 'none',
		iconSource: toToolIconSource(nodeType),
		credentials: [],
		verified: isVerifiedCommunityTool(nodeType),
		communityPreview,
		installing: installingToolName.value === nodeType.name,
		installDisabled: communityPreview && !usersStore.isAdminOrOwner,
	};
}

function availableWorkflowItem(workflow: IWorkflowDb): WorkflowConnectionItem {
	return {
		id: `workflow:${workflow.id}`,
		kind: 'workflow',
		category: 'workflows',
		workflowId: workflow.id,
		title: workflow.name,
		description: workflow.description ?? undefined,
		status: 'none',
		credentials: [],
	};
}

/**
 * Canvas parity: unofficial verified community tools are not in the AiTool name
 * index, so they surface only while searching, via the same path NodesMode uses
 * for "More from community".
 */
const communitySearchToolTypes = computed<INodeTypeDescription[]>(() => {
	if (!searchQuery.value) return [];

	const hits = filterAndSearchNodes(
		nodeTypesStore.communityNodesAndActions.mergedNodes,
		searchQuery.value,
		{ isAiSubcategory: true, aiConnectionType: NodeConnectionTypes.AiTool },
	);

	const seen = new Set(availableToolTypes.value.map((nodeType) => nodeType.name));
	const previews: INodeTypeDescription[] = [];
	for (const hit of hits) {
		if (hit.type !== 'node') continue;
		// Some hits only resolve by their properties name, not their key.
		const resolved = resolveToolNodeType(hit.key) ?? resolveToolNodeType(hit.properties.name);
		if (!resolved || seen.has(resolved.name) || resolved.hidden || hasInputs(resolved)) continue;
		seen.add(resolved.name);
		previews.push(resolved);
	}
	return previews;
});

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
	for (const nodeType of communitySearchToolTypes.value) {
		out.push(availableNodeItem(nodeType));
	}
	for (const workflow of availableWorkflows.value) {
		out.push(availableWorkflowItem(workflow));
	}

	return out;
});

function handleRowActivate(item: ToolConnectionItem) {
	if (item.status === 'connecting') return;
	if (hasToolConnection(item.status)) {
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

	// The row body activates the same action as the Install button, so a disabled
	// (non-admin) or in-flight install must not be reachable through it.
	if (item.installDisabled || item.installing) return;

	if (item.kind === 'workflow' && item.id.startsWith('workflow:')) {
		const workflowId = item.id.slice('workflow:'.length);
		const workflow = availableWorkflows.value.find((wf) => wf.id === workflowId);
		if (workflow) void handleAddWorkflow(workflow);
		return;
	}

	if (item.kind === 'node' && item.id.startsWith('nodeType:')) {
		const nodeTypeName = item.id.slice('nodeType:'.length);
		const nodeType = [...availableToolTypes.value, ...communitySearchToolTypes.value].find(
			(nt) => nt.name === nodeTypeName,
		);
		if (nodeType) void handleAddTool(nodeType);
	}
}
</script>

<template>
	<ToolsConnectionModal
		v-model:open="isOpen"
		:items="items"
		:categories="CATEGORIES"
		:detail-item="null"
		:allow-workflow-creation="canCreateWorkflow"
		:workflow-creation-loading="isCreatingWorkflow"
		@update:search-query="searchQuery = $event"
		@connect="handleRowActivate"
		@open-detail="handleRowActivate"
		@create-workflow="handleCreateWorkflow"
	/>
</template>
