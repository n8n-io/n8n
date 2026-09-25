<script setup lang="ts">
import { computed, onMounted, provide, ref, shallowRef, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES } from '@n8n/api-types';
import {
	NodeConnectionTypes,
	isCommunityPackageName,
	resolveSupportedCredentialActivation,
} from 'n8n-workflow';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
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
import { stripToolSuffix, useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useInstallNode } from '@/features/settings/communityNodes/composables/useInstallNode';
import { useUsersStore } from '@n8n/stores/users.store';
import {
	filterAndSearchNodes,
	isAiGatewayEligibleNode,
	isNodePreviewKey,
	removePreviewToken,
} from '@/features/shared/nodeCreator/nodeCreator.utils';
import type { IWorkflowDb } from '@/Interface';
import ToolsConnectionModal from '@/features/shared/toolsConnection/ToolsConnectionModal.vue';
import McpRegistrySuggestionFooter from '@/app/components/McpRegistrySuggestionFooter.vue';
import {
	hasToolConnection,
	TOOL_CONNECTION_CREDITS_LABEL_KEY,
	type NodeConnectionItem,
	type ToolCategoryKey,
	type ToolConnectionItem,
	type ToolCredentialRef,
	type WorkflowConnectionItem,
} from '@/features/shared/toolsConnection/types';

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
import type { AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';
import type { ToolPickerMode } from './AgentCapabilitiesSection.types';
import type { WorkflowToolIncompatibilityReason } from '@n8n/api-types';
import { toToolIconSource } from '../utils/toolIconSource';
import { workflowToolTriggerLabel } from '../utils/workflowToolTriggers';
import AgentToolConfigForm, { type AgentToolConfigModalData } from './AgentToolConfigForm.vue';
import AgentModalMultiStep from './modals/AgentModalMultiStep.vue';

const BASE_CATEGORIES: ToolCategoryKey[] = ['all', 'mcp', 'app-action', 'workflows'];
/** Prefix for the synthetic ids of gateway-backed rows in the n8n Connect section. */
const N8N_CONNECT_ID_PREFIX = 'n8n-connect:';
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
		mode: ToolPickerMode;
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
const settingsStore = useSettingsStore();
const aiGatewayStore = useAiGatewayStore();
// The shared modal/rows read the credits pill copy through injection so they
// stay free of editor-ui stores (see toolsConnection/types.ts).
provide(
	TOOL_CONNECTION_CREDITS_LABEL_KEY,
	computed(() => aiGatewayStore.creditsLabelKey),
);
const router = useRouter();
const toast = useToast();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const toolTelemetry = useAgentToolTelemetry(props.data.agentId);
const {
	availableToolTypes,
	availableWorkflows,
	incompatibleWorkflows,
	loadWorkflows,
	resolveToolNodeType,
} = useAgentToolCatalog();
const { installNode: installCommunityNode } = useInstallNode();
const usersStore = useUsersStore();

const searchQuery = ref('');
const installingToolName = ref<string | null>(null);
const isWorkflow = computed(() => props.data.mode === 'workflows');
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
const configData = shallowRef<AgentToolConfigModalData | null>(null);
const configForm = ref<InstanceType<typeof AgentToolConfigForm> | null>(null);
const configTitle = ref('');
const configSession = ref(0);
const isCredentialModalOpen = ref(false);

const isOpen = computed({
	get: () => uiStore.modalsById[props.modalName]?.open === true,
	set: (value: boolean) => {
		if (!value) uiStore.closeModal(props.modalName);
	},
});

const currentStep = computed(() => (configData.value ? 'configure' : 'select'));
const pickerTitle = computed(() =>
	isWorkflow.value ? i18n.baseText('workflows.add') : i18n.baseText('agents.builder.tools.add'),
);
const modalTitle = computed(() => (configData.value ? configTitle.value : pickerTitle.value));
const configIsCustom = computed(
	() => configData.value?.kind !== 'mcpServer' && configData.value?.toolRef.type === 'custom',
);
const removeLabel = computed(() => {
	const data = configData.value;
	if (data?.kind === 'mcpServer') {
		return i18n.baseText('agents.builder.tools.mcp.remove' as BaseTextKey);
	}
	if (data?.toolRef.type === 'workflow') {
		return i18n.baseText('agents.builder.tools.workflow.remove' as BaseTextKey);
	}
	return i18n.baseText('agents.builder.tools.remove');
});

function initialConfigTitle(data: AgentToolConfigModalData): string {
	if (data.kind === 'mcpServer') return data.mcpServer.name;
	if (data.toolRef.type === 'custom') {
		return data.customTool?.descriptor.name ?? data.toolRef.id;
	}
	return data.toolRef.name ?? '';
}

function openConfigModal(data: AgentToolConfigModalData) {
	configData.value = data;
	configTitle.value = initialConfigTitle(data);
	configSession.value += 1;
}

function closeModal() {
	uiStore.closeModal(props.modalName);
	configData.value = null;
}

function backToPicker() {
	configData.value = null;
	isCredentialModalOpen.value = false;
	configTitle.value = '';
}

function updateConfigTitle(value: string) {
	configTitle.value = value;
	configForm.value?.changeTitle(value);
}

function saveConfig() {
	if (configForm.value?.confirm()) closeModal();
}

function removeConfig() {
	configForm.value?.remove();
	closeModal();
}

function handleInteractOutside(event: Event) {
	if (isCredentialModalOpen.value) event.preventDefault();
}

onMounted(() => {
	if (isWorkflow.value) void loadWorkflows(props.data.projectId);
	// Same catalog load the canvas uses for verified community previews.
	void nodeTypesStore.fetchCommunityNodePreviews();
	// Config gates which tools are eligible for the n8n Connect section; the
	// wallet drives the credits pill copy (Free credits vs n8n credits). Fetch
	// both here so the section is correct without relying on a sibling (sidebar
	// or model selector) having loaded them first.
	if (settingsStore.isAiGatewayEnabled) {
		void aiGatewayStore.fetchConfig();
		void aiGatewayStore.fetchWallet();
	}
});

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
}

function addMcpServer(savedServer: AgentJsonMcpServerConfig) {
	workingMcpServerEntries.value = [
		...workingMcpServerEntries.value,
		{ localId: uuidv4(), server: savedServer },
	];
	commit();
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
	if (newRef.type === 'node') {
		openConfigForNewRef({
			...newRef,
			name: makeUniqueName(
				newRef.name ?? nodeType.displayName,
				getExistingToolNames(workingTools.value),
			),
		});
	} else {
		openConfigForNewRef({
			...newRef,
		});
	}
}

/**
 * Add a gateway-backed tool. Same flow as any other node tool — the config
 * modal opens so the user can pick the operation — the only difference being
 * the n8n Connect managed credential is pre-selected, so no credential setup.
 */
function addManagedNodeTool(nodeType: INodeTypeDescription) {
	toolTelemetry.trackAddStarted('node');
	const newRef = nodeTypeToNewToolRef(nodeType);

	const activation = resolveSupportedCredentialActivation(
		nodeType,
		{ typeVersion: newRef.node.nodeTypeVersion, parameters: {} },
		aiGatewayStore.isCredentialTypeSupported,
	);
	if (activation) {
		newRef.node.nodeParameters = activation.parameters;
		newRef.node.credentials = {
			[activation.credentialType]: { id: null, name: '', __aiGatewayManaged: true },
		};
	}

	openConfigForNewRef(newRef);
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

/**
 * Same node, presented in the n8n Connect section: credentials are managed, so
 * it carries the "Free credits" pill and adds without a Connect step. The node
 * still appears under n8n nodes for users who want their own credential.
 */
function n8nConnectNodeItem(nodeType: INodeTypeDescription): NodeConnectionItem {
	return {
		...availableNodeItem(nodeType),
		id: `${N8N_CONNECT_ID_PREFIX}${nodeType.name}`,
		category: 'n8n-connect',
		freeCredits: true,
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
		// An unpublished workflow stays selectable; the warning tells the user the
		// published agent cannot call it until they publish it.
		warning:
			workflow.activeVersionId === null
				? i18n.baseText('agents.tools.workflow.notPublished')
				: undefined,
		status: 'none',
		credentials: [],
	};
}

function disabledWorkflowItem(
	workflow: IWorkflowDb,
	reason: WorkflowToolIncompatibilityReason,
): WorkflowConnectionItem {
	return {
		id: `workflow-disabled:${workflow.id}`,
		kind: 'workflow',
		category: 'workflows',
		workflowId: workflow.id,
		title: workflow.name,
		description: workflow.description ?? undefined,
		status: 'none',
		credentials: [],
		disabled: true,
		disabledReason: disabledWorkflowReasonText(reason),
	};
}

function disabledWorkflowReasonText(reason: WorkflowToolIncompatibilityReason): string {
	if (reason.reason === 'incompatible_nodes') {
		return i18n.baseText('agents.tools.workflow.disabled.incompatibleNodes');
	}
	return i18n.baseText('agents.tools.workflow.disabled.noSupportedTrigger', {
		interpolate: { trigger: workflowToolTriggerLabel() },
	});
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

/** Gateway-backed subset of the available tools, surfaced in the n8n Connect section. */
const n8nConnectItems = computed<NodeConnectionItem[]>(() =>
	availableToolTypes.value
		.filter((nodeType) => isAiGatewayEligibleNode(nodeType.name))
		.map(n8nConnectNodeItem),
);

/**
 * Keep "All" first (the default tab), and slot the n8n Connect tab right after
 * it — only when the gateway actually offers something to show.
 */
const categories = computed<ToolCategoryKey[]>(() => {
	if (isWorkflow.value) return ['workflows'];

	const baseCategories = BASE_CATEGORIES.filter((category) => category !== 'workflows');
	if (n8nConnectItems.value.length === 0) return baseCategories;
	const [all, ...rest] = baseCategories;
	return [all, 'n8n-connect', ...rest];
});

const items = computed<ToolConnectionItem[]>(() => {
	if (isWorkflow.value) {
		return [
			...availableWorkflows.value.map(availableWorkflowItem),
			...incompatibleWorkflows.value.map(({ workflow, reason }) =>
				disabledWorkflowItem(workflow, reason),
			),
		];
	}

	const out: ToolConnectionItem[] = [];

	for (const item of n8nConnectItems.value) {
		out.push(item);
	}
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
	return out;
});

function addActionLabel(item: ToolConnectionItem): string {
	if (item.category === 'mcp') {
		return i18n.baseText('agents.builder.tools.mcp.add' as BaseTextKey);
	}
	if (item.kind === 'workflow') return i18n.baseText('workflows.add');
	return i18n.baseText('node.addNode');
}

function handleRowActivate(item: ToolConnectionItem) {
	// Disabled rows (e.g. incompatible workflows) are visible-but-not-selectable;
	// the row's own tooltip already explains why, so activating does nothing.
	if (item.disabled) return;
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
			if (!entry) return;
			// Adding another instance of the same service: editing happens via the
			// capabilities chips, so activating a connected node-tool row adds a
			// new instance instead of overwriting the existing tool. A connected
			// n8n Connect managed tool must keep its managed-credential
			// preselection, so route it through the same managed add path.
			const { ref } = entry;
			if (ref.type === 'node') {
				const nodeType =
					[...availableToolTypes.value, ...communitySearchToolTypes.value].find(
						(nt) => nt.name === ref.node.nodeType,
					) ?? nodeTypesStore.getNodeType(ref.node.nodeType);
				if (nodeType) {
					const isManaged = Object.values(ref.node.credentials ?? {}).some(
						(credential) => '__aiGatewayManaged' in credential && credential.__aiGatewayManaged,
					);
					void (isManaged ? addManagedNodeTool(nodeType) : handleAddTool(nodeType));
				}
				return;
			}
			openConfigForToolEntry(entry);
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

	if (item.kind === 'node' && item.id.startsWith(N8N_CONNECT_ID_PREFIX)) {
		const nodeTypeName = item.id.slice(N8N_CONNECT_ID_PREFIX.length);
		const nodeType = availableToolTypes.value.find((nt) => nt.name === nodeTypeName);
		if (nodeType) addManagedNodeTool(nodeType);
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
	<AgentModalMultiStep
		:open="isOpen"
		:step="currentStep"
		:title="modalTitle"
		:editable-title="Boolean(configData) && !configIsCustom"
		:show-back="Boolean(configData)"
		:show-footer="Boolean(configData)"
		:busy="isCredentialModalOpen || isCreatingWorkflow"
		:trap-focus="!isCredentialModalOpen"
		:disable-outside-pointer-events="!isCredentialModalOpen"
		data-testid="agent-tools-connection-modal"
		@interact-outside="handleInteractOutside"
		@update:open="isOpen = $event"
		@update:title="updateConfigTitle"
		@back="backToPicker"
	>
		<ToolsConnectionModal
			v-show="!configData"
			:open="isOpen"
			:items="items"
			:categories="categories"
			:title="pickerTitle"
			:search-placeholder="
				isWorkflow ? i18n.baseText('agents.tools.workflow.search.placeholder') : undefined
			"
			:detail-item="null"
			:create-action="
				isWorkflow && canCreateWorkflow
					? {
							category: 'workflows',
							label: i18n.baseText('generic.create.workflow'),
							description: i18n.baseText('projectRoles.workflow:create.tooltip'),
							testId: 'tools-connection-create-workflow',
						}
					: undefined
			"
			:create-action-loading="isCreatingWorkflow"
			:empty-message="isWorkflow ? i18n.baseText('agents.tools.workflow.empty.title') : undefined"
			:no-results-message="
				isWorkflow ? i18n.baseText('agents.tools.workflow.empty.noResults') : undefined
			"
			:connect-label="addActionLabel"
			embedded
			show-connect-actions
			persistent-scrollbar
			@update:search-query="searchQuery = $event"
			@connect="handleRowActivate"
			@open-detail="handleRowActivate"
			@create="handleCreateWorkflow"
		>
			<template #suggestion-footer>
				<McpRegistrySuggestionFooter
					:prompt="i18n.baseText('agents.tools.suggestion.prompt')"
					:action="i18n.baseText('agents.tools.suggestion.action')"
				/>
			</template>
		</ToolsConnectionModal>

		<AgentToolConfigForm
			v-if="configData"
			:key="configSession"
			ref="configForm"
			:data="configData"
			@update:title="configTitle = $event"
			@update:credential-modal-open="isCredentialModalOpen = $event"
		/>

		<template v-if="configData?.onRemove" #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-tool-config-remove" @click="removeConfig">
				<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
				{{ removeLabel }}
			</N8nButton>
		</template>
		<template v-if="configData" #footerActions>
			<N8nButton
				variant="solid"
				:disabled="isCredentialModalOpen"
				data-testid="agent-tool-config-save"
				@click="saveConfig"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModalMultiStep>
</template>
