import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nf as init_reactivity_esm_bundler, Oa as v4, Of as withDirectives, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Xo as useRouter, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, jf as effectScope, lf as onMounted, of as onBeforeUnmount, pf as provide } from "./vendor-Hx42-oQF.js";
import { Dy as DEFAULT_NEW_WORKFLOW_NAME, Ef as removePreviewToken, Ek as resolveSupportedCredentialActivation, Jg as useUIStore, Jn as SAMPLE_SUBWORKFLOW_TRIGGER_ID, Lk as isCommunityPackageName, Mp as useCredentialsStore, Od as useWorkflowsStore, Op as stripToolSuffix, Sf as isAiGatewayEligibleNode, Yn as SAMPLE_SUBWORKFLOW_WORKFLOW, ZE as INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES, _C as useUsersStore, _f as filterAndSearchNodes, al as useRestrictedNodeWarning, bC as useRootStore, bf as getNodeItemRestriction, bm as useSourceControlStore, dC as useToast, fC as VIEWS, hC as useTelemetry, hb as AI_MCP_TOOL_NODE_TYPE, hp as useTypeAvailabilityPoliciesStore, jN as useI18n, jk as NodeConnectionTypes, jp as listenForCredentialChanges, kp as useAiGatewayStore, nD as getResourcePermissions, ny as CREDENTIAL_EDIT_MODAL_KEY, oy as getWorkflow, tp as useTypeAvailability, uf as useNodeTypesStore, vm as useProjectsStore, vu as getNodeIconSource, wf as isNodePreviewKey, wy as TELEMETRY_EVENT, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { c as nodeTypeToNewToolRef, f as workflowToNewToolRef, i as mcpServerToNode, l as toolRefToNode, n as isMcpRegistryNodeType, o as nodeTypeToNewMcpServer, r as isMcpRelatedNodeType, s as getExistingToolNames, t as defaultAgentMcpToolPermissions } from "./useMcpServerAdapter-xfJVDU-E.js";
import { t as useInstallNode } from "./useInstallNode-8BEUfP2t.js";
import { i as TOOL_CONNECTION_CREDITS_LABEL_KEY, o as hasToolConnection, r as TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY } from "./ToolCredentialPicker-Clmo6S9M.js";
import { t as ToolsConnectionModal_default } from "./ToolsConnectionModal-Cq-bWNJX.js";
import { t as AgentModalMultiStep_default } from "./AgentModalMultiStep-83xh6J77.js";
import { t as iconForMcpRegistryServer } from "./mcpRegistryIcon-BDkbIdlc.js";
import { a as toolCategoryForNodeType, c as isAiGatewayMcpEntry, d as useAgentMcpDiscovery, i as hasInputs, l as toMcpEntryAuth, n as AgentToolConfigCredentialPicker_default, o as useAgentToolCatalog, r as AgentToolConfigContent_default, s as DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS, t as AgentToolConfigTitleIcon_default, u as toMcpRegistryCredentialRefs } from "./AgentToolConfigTitleIcon-WTbZnqgT.js";
import { t as McpRegistrySuggestionFooter_default } from "./McpRegistrySuggestionFooter-CgPpYIFt.js";
//#region src/features/agents/composables/useAgentToolTelemetry.ts
init_reactivity_esm_bundler();
/** Send stable node and custom-tool identifiers. */
function identityProps(ref) {
	if (ref.type === "node") return { node_type: ref.node?.nodeType };
	if (ref.type === "workflow") return {};
	return { custom_id: ref.id };
}
function useAgentToolTelemetry(agentId) {
	const telemetry = useTelemetry();
	function agentProps() {
		const resolvedAgentId = toValue(agentId);
		return resolvedAgentId ? { agent_id: resolvedAgentId } : {};
	}
	/** Fired when the user clicks Connect on an Available row — a new-ref flow begins. */
	function trackAddStarted(toolType) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_STARTED_ADDING_AGENT_TOOL, {
			tool_type: toolType,
			source: "manual",
			...agentProps()
		});
	}
	/** Fired when an existing tool's config is saved. */
	function trackEdited(ref) {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_EDITED_AGENT_TOOL, {
			tool_type: ref.type,
			...identityProps(ref),
			...agentProps()
		});
	}
	return {
		trackAddStarted,
		trackEdited
	};
}
//#endregion
//#region src/features/agents/utils/toolIconSource.ts
/** Map a node type description to the shared tools-connection icon shape. */
function toToolIconSource(nodeType) {
	const source = getNodeIconSource(nodeType, null, null);
	if (!source) return void 0;
	const { badge: _badge, ...rest } = source;
	return rest;
}
//#endregion
//#region src/features/agents/components/AgentToolsConnectionModalWrapper.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var N8N_CONNECT_ID_PREFIX = "n8n-connect:";
//#endregion
//#region src/features/agents/components/AgentToolsConnectionModalWrapper.vue
var AgentToolsConnectionModalWrapper_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AgentToolsConnectionModalWrapper",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const BASE_CATEGORIES = [
			"all",
			"mcp",
			"app-action",
			"workflows"
		];
		/** Prefix for the synthetic ids of gateway-backed rows in the n8n Connect section. */
		const incompatibleWorkflowToolBodyNodeTypes = new Set(INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES);
		const props = __props;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const aiGatewayStore = useAiGatewayStore();
		provide(TOOL_CONNECTION_CREDITS_LABEL_KEY, computed(() => aiGatewayStore.creditsLabelKey));
		const router = useRouter();
		const toast = useToast();
		const credentialsStore = useCredentialsStore();
		const workflowsStore = useWorkflowsStore();
		const projectsStore = useProjectsStore();
		const sourceControlStore = useSourceControlStore();
		const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
		useTypeAvailability(() => props.data.projectId);
		const toolTelemetry = useAgentToolTelemetry(props.data.agentId);
		const { createCredentialAdapter, fetchCatalog, preloadCredentials } = useAgentMcpDiscovery(() => props.data.projectId);
		const { availableToolTypes, availableWorkflows, loadWorkflows, resolveToolNodeType } = useAgentToolCatalog();
		const { installNode: installCommunityNode } = useInstallNode();
		const { warnIfRestricted } = useRestrictedNodeWarning();
		const usersStore = useUsersStore();
		const searchQuery = ref("");
		const installingToolName = ref(null);
		const isWorkflow = computed(() => props.data.mode === "workflows");
		const isCreatingWorkflow = ref(false);
		const canCreateWorkflow = computed(() => {
			if (!props.data.projectId || sourceControlStore.preferences.branchReadOnly) return false;
			const projectScopes = projectsStore.myProjects.find((project) => project.id === props.data.projectId)?.scopes;
			const projectPermission = getResourcePermissions(projectScopes).workflow.create;
			const globalPermission = getResourcePermissions(usersStore.currentUser?.globalScopes).workflow.create;
			return Boolean(globalPermission ?? projectPermission);
		});
		function toWorkingToolEntries(tools, existingEntries = []) {
			return tools.map((ref, index) => ({
				localId: existingEntries[index]?.localId ?? v4(),
				ref
			}));
		}
		function toWorkingMcpServerEntries(servers, existingEntries = []) {
			return servers.map((server, index) => ({
				localId: existingEntries[index]?.localId ?? v4(),
				server
			}));
		}
		const workingToolEntries = ref(toWorkingToolEntries(props.data.tools));
		watch(() => props.data.tools, (tools) => {
			workingToolEntries.value = toWorkingToolEntries(tools, workingToolEntries.value);
		});
		const workingMcpServerEntries = ref(toWorkingMcpServerEntries(props.data.mcpServers ?? []));
		watch(() => props.data.mcpServers ?? [], (servers) => {
			workingMcpServerEntries.value = toWorkingMcpServerEntries(servers, workingMcpServerEntries.value);
		});
		const workingTools = computed(() => workingToolEntries.value.map(({ ref }) => ref));
		const workingMcpServers = computed(() => workingMcpServerEntries.value.map(({ server }) => server));
		const configData = shallowRef(null);
		const configContent = ref(null);
		const configTitle = ref("");
		const configSession = ref(0);
		const mcpCatalog = ref([]);
		const credentialPicker = ref(null);
		const configIsRestricted = ref(false);
		const isCredentialModalOpen = computed(() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true);
		const isOpen = computed({
			get: () => uiStore.modalsById[props.modalName]?.open === true,
			set: (value) => {
				if (!value) closeModal();
			}
		});
		const currentStep = computed(() => configData.value ? "configure" : "select");
		const pickerTitle = computed(() => isWorkflow.value ? i18n.baseText("workflows.add") : i18n.baseText("agents.builder.tools.add"));
		const modalTitle = computed(() => configData.value ? configTitle.value : pickerTitle.value);
		const configIsCustom = computed(() => configData.value?.kind !== "mcpServer" && configData.value?.kind !== "registryMcpServer" && configData.value?.toolRef.type === "custom");
		const saveDisabled = computed(() => isCredentialModalOpen.value || configIsRestricted.value || configData.value?.kind === "registryMcpServer" && (configContent.value?.saveDisabled ?? true));
		function initialConfigTitle(data) {
			if (data.kind === "mcpServer" || data.kind === "registryMcpServer") return data.mcpServer.name;
			if (data.toolRef.type === "custom") return data.customTool?.descriptor.name ?? data.toolRef.id;
			return data.toolRef.name ?? "";
		}
		function openConfigModal(data) {
			configIsRestricted.value = false;
			configData.value = data;
			configTitle.value = initialConfigTitle(data);
			configSession.value += 1;
		}
		function closeModal() {
			uiStore.closeModal(props.modalName);
			configData.value = null;
			configIsRestricted.value = false;
		}
		function backToPicker() {
			configData.value = null;
			configIsRestricted.value = false;
			configTitle.value = "";
		}
		function updateConfigTitle(value) {
			configTitle.value = value;
			configContent.value?.changeTitle(value);
		}
		function saveConfig() {
			if (configContent.value?.confirm()) closeModal();
		}
		async function removeConfig() {
			if (await configContent.value?.remove()) closeModal();
		}
		function handleInteractOutside(event) {
			if (isCredentialModalOpen.value) event.preventDefault();
		}
		const isLoadingCredentials = ref(false);
		/**
		* Block until the project's credentials are in the store, so rows do not show as
		* unconnected. A slice already fetched for this project refreshes in the background.
		*/
		async function loadCredentials() {
			isLoadingCredentials.value = !credentialsStore.hasUsableCredentialsForScope({ projectId: props.data.projectId });
			try {
				await preloadCredentials();
			} catch (error) {
				console.error("Failed to fetch credentials", error);
			} finally {
				isLoadingCredentials.value = false;
			}
		}
		onMounted(() => {
			if (isWorkflow.value) loadWorkflows(props.data.projectId);
			if (!isWorkflow.value) {
				loadRegistryCatalog();
				loadCredentials();
			}
			typeAvailabilityPoliciesStore.reload();
			nodeTypesStore.fetchCommunityNodePreviews();
			if (settingsStore.isAiGatewayEnabled) {
				aiGatewayStore.fetchConfig();
				aiGatewayStore.fetchWallet();
			}
		});
		const credentialListeners = effectScope(true);
		credentialListeners.run(() => {
			listenForCredentialChanges({
				store: credentialsStore,
				onCredentialDeleted: handleCredentialDeleted
			});
		});
		onBeforeUnmount(() => credentialListeners.stop());
		function makeUniqueName(baseName, existingNames, format) {
			const defaultFormat = (name, counter) => `${name} (${counter})`;
			const formatFn = format ?? defaultFormat;
			if (!existingNames.includes(baseName)) return baseName;
			let counter = 1;
			while (existingNames.includes(formatFn(baseName, counter))) counter++;
			return formatFn(baseName, counter);
		}
		function resolveMcpNodeType(server) {
			const preferredTypeName = server.metadata?.nodeTypeName ?? "@n8n/n8n-nodes-langchain.mcpClientTool";
			return nodeTypesStore.getNodeType(preferredTypeName) ?? nodeTypesStore.getNodeType("@n8n/n8n-nodes-langchain.mcpClientTool");
		}
		function getExistingMcpServerNames(servers, exclude) {
			return servers.filter((server) => server !== exclude).map((server) => server.name);
		}
		function commit() {
			props.data.onConfirm({
				tools: workingTools.value,
				mcpServers: workingMcpServers.value
			});
		}
		function addToolRef(savedRef) {
			if (savedRef.type === "node" && warnIfRestricted(savedRef.node.nodeType)) return;
			workingToolEntries.value = [...workingToolEntries.value, {
				localId: v4(),
				ref: savedRef
			}];
			commit();
		}
		function addMcpServer(savedServer) {
			workingMcpServerEntries.value = [...workingMcpServerEntries.value, {
				localId: v4(),
				server: savedServer
			}];
			commit();
		}
		function openConfigForNewRef(newRef) {
			openConfigModal({
				toolRef: newRef,
				projectId: props.data.projectId,
				agentId: props.data.agentId,
				supportsToolApproval: props.data.supportsToolApproval,
				existingToolNames: getExistingToolNames(workingTools.value),
				onConfirm: (savedRef) => {
					addToolRef(savedRef);
				}
			});
		}
		function openConfigForNewMcpServer(server, nodeType) {
			openConfigModal({
				kind: "mcpServer",
				mcpServer: server,
				initialNode: mcpServerToNode(server, nodeType),
				projectId: props.data.projectId,
				agentId: props.data.agentId,
				supportsToolApproval: props.data.supportsToolApproval,
				existingToolNames: getExistingMcpServerNames(workingMcpServers.value),
				onConfirm: (savedServer) => {
					addMcpServer(savedServer);
				}
			});
		}
		function handleAddMcpServer(nodeType) {
			const newServer = nodeTypeToNewMcpServer(nodeType, props.data.supportsToolApproval !== false);
			newServer.name = makeUniqueName(newServer.name, getExistingMcpServerNames(workingMcpServers.value), (name, counter) => `${name}-${counter}`);
			openConfigForNewMcpServer(newServer, nodeType);
		}
		function isCommunityPreviewTool(nodeType) {
			if (!isNodePreviewKey(nodeType.name)) return false;
			return !!nodeTypesStore.communityNodeType(stripToolSuffix(nodeType.name));
		}
		/** Reviewed and approved by n8n, whether or not it is installed yet. */
		function isVerifiedCommunityTool(nodeType) {
			return isCommunityPackageName(nodeType.name) && !!nodeTypesStore.communityNodeType(stripToolSuffix(nodeType.name))?.isOfficialNode;
		}
		function communityPackageNameFor(nodeType) {
			const baseName = stripToolSuffix(nodeType.name);
			return nodeTypesStore.communityNodeType(baseName)?.packageName ?? removePreviewToken(nodeType.name.split(".")[0] ?? nodeType.name);
		}
		async function installAndAddCommunityPreview(nodeType) {
			installingToolName.value = nodeType.name;
			try {
				const result = await installCommunityNode({
					type: "verified",
					packageName: communityPackageNameFor(nodeType),
					nodeType: stripToolSuffix(nodeType.name),
					selectedNodeType: nodeType.name,
					telemetry: {
						source: "agent builder tools",
						hasQuickConnect: false
					}
				});
				if (!result.success) return;
				const installedName = removePreviewToken(nodeType.name);
				const installed = nodeTypesStore.getNodeType(installedName);
				if (!installed) {
					toast.showError(new Error(i18n.baseText("agents.tools.install.unresolved.message")), i18n.baseText("agents.tools.install.unresolved.title"));
					return;
				}
				if (result.restricted) return;
				addNodeTool(installed);
			} finally {
				installingToolName.value = null;
			}
		}
		async function handleAddTool(nodeType) {
			if (getNodeItemRestriction(nodeType.name)) return;
			if (isMcpRelatedNodeType(nodeType.name) && !isMcpRegistryNodeType(nodeType.name)) {
				handleAddMcpServer(nodeType);
				return;
			}
			if (isMcpRegistryNodeType(nodeType.name)) return;
			if (isCommunityPreviewTool(nodeType)) {
				await installAndAddCommunityPreview(nodeType);
				return;
			}
			addNodeTool(nodeType);
		}
		function addNodeTool(nodeType) {
			toolTelemetry.trackAddStarted("node");
			const newRef = nodeTypeToNewToolRef(nodeType);
			if (newRef.type === "node") openConfigForNewRef({
				...newRef,
				name: makeUniqueName(newRef.name ?? nodeType.displayName, getExistingToolNames(workingTools.value))
			});
			else openConfigForNewRef({ ...newRef });
		}
		/**
		* Add a gateway-backed tool. Same flow as any other node tool — the config
		* modal opens so the user can pick the operation — the only difference being
		* the n8n Connect managed credential is pre-selected, so no credential setup.
		*/
		function addManagedNodeTool(nodeType) {
			if (getNodeItemRestriction(nodeType.name)) return;
			toolTelemetry.trackAddStarted("node");
			const newRef = nodeTypeToNewToolRef(nodeType);
			const activation = resolveSupportedCredentialActivation(nodeType, {
				typeVersion: newRef.node.nodeTypeVersion,
				parameters: {}
			}, aiGatewayStore.isCredentialTypeSupported);
			if (activation) {
				newRef.node.nodeParameters = activation.parameters;
				newRef.node.credentials = { [activation.credentialType]: {
					id: null,
					name: "",
					__aiGatewayManaged: true
				} };
			}
			openConfigForNewRef(newRef);
		}
		async function handleAddWorkflow(workflow) {
			toolTelemetry.trackAddStarted("workflow");
			let full;
			try {
				full = await getWorkflow(rootStore.restApiContext, workflow.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.tools.workflow.fetchFailed.title"), { message: i18n.baseText("agents.tools.workflow.fetchFailed.message") });
				return;
			}
			const incompatible = (full.nodes ?? []).filter((node) => incompatibleWorkflowToolBodyNodeTypes.has(node.type));
			if (incompatible.length > 0) {
				const nodeNames = incompatible.map((n) => n.name).join(", ");
				toast.showError(new Error(i18n.baseText("agents.tools.workflow.incompatible.message", { interpolate: {
					name: workflow.name,
					nodes: nodeNames
				} })), i18n.baseText("agents.tools.workflow.incompatible.title"));
				return;
			}
			openConfigForNewRef(workflowToNewToolRef(workflow));
		}
		async function handleCreateWorkflow() {
			const projectId = props.data.projectId;
			if (!projectId || !canCreateWorkflow.value || isCreatingWorkflow.value) return;
			isCreatingWorkflow.value = true;
			toolTelemetry.trackAddStarted("workflow");
			try {
				const sampleName = DEFAULT_NEW_WORKFLOW_NAME;
				const matchingWorkflows = availableWorkflows.value.filter((workflow) => workflow.name?.startsWith(sampleName));
				const newWorkflow = await workflowsStore.createNewWorkflow({
					...SAMPLE_SUBWORKFLOW_WORKFLOW,
					name: `${sampleName} ${matchingWorkflows.length + 1}`,
					projectId
				});
				const newRef = workflowToNewToolRef(newWorkflow);
				openConfigForNewRef({
					...newRef,
					name: makeUniqueName(newRef.name ?? newWorkflow.name, getExistingToolNames(workingTools.value))
				});
				const { href } = router.resolve({
					name: VIEWS.WORKFLOW,
					params: {
						workflowId: newWorkflow.id,
						nodeId: SAMPLE_SUBWORKFLOW_TRIGGER_ID
					}
				});
				window.open(href, "_blank");
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.tools.workflow.createFailed.title"), { message: i18n.baseText("agents.tools.workflow.createFailed.message") });
			} finally {
				isCreatingWorkflow.value = false;
			}
		}
		function openConfigForToolEntry(entry) {
			const toolRef = entry.ref;
			openConfigModal({
				toolRef,
				projectId: props.data.projectId,
				agentId: props.data.agentId,
				supportsToolApproval: props.data.supportsToolApproval,
				existingToolNames: getExistingToolNames(workingTools.value, toolRef),
				onConfirm: (updatedRef) => {
					workingToolEntries.value = workingToolEntries.value.map((e) => e.localId === entry.localId ? {
						...e,
						ref: updatedRef
					} : e);
					toolTelemetry.trackEdited(updatedRef);
					commit();
				},
				onRemove: () => {
					workingToolEntries.value = workingToolEntries.value.filter((e) => e.localId !== entry.localId);
					commit();
				}
			});
		}
		function openConfigForMcpEntry(entry) {
			if (entry.server.metadata?.nodeTypeName) {
				openConfigForRegistryEntry(entry);
				return;
			}
			const nodeType = resolveMcpNodeType(entry.server);
			if (!nodeType) return;
			openConfigModal({
				kind: "mcpServer",
				mcpServer: entry.server,
				initialNode: mcpServerToNode(entry.server, nodeType),
				projectId: props.data.projectId,
				agentId: props.data.agentId,
				supportsToolApproval: props.data.supportsToolApproval,
				existingToolNames: getExistingMcpServerNames(workingMcpServers.value, entry.server),
				onConfirm: (updatedServer) => {
					workingMcpServerEntries.value = workingMcpServerEntries.value.map((e) => e.localId === entry.localId ? {
						...e,
						server: updatedServer
					} : e);
					commit();
				},
				onRemove: () => {
					workingMcpServerEntries.value = workingMcpServerEntries.value.filter((e) => e.localId !== entry.localId);
					commit();
				}
			});
		}
		function openConfigForRegistryEntry(entry) {
			openConfigModal({
				kind: "registryMcpServer",
				mcpServer: entry.server,
				projectId: props.data.projectId,
				supportsToolApproval: props.data.supportsToolApproval,
				existingToolNames: getExistingMcpServerNames(workingMcpServers.value, entry.server),
				onConfirm: (updatedServer) => {
					workingMcpServerEntries.value = workingMcpServerEntries.value.map((candidate) => candidate.localId === entry.localId ? {
						...candidate,
						server: updatedServer
					} : candidate);
					commit();
				},
				onRemove: () => {
					workingMcpServerEntries.value = workingMcpServerEntries.value.filter((candidate) => candidate.localId !== entry.localId);
					commit();
				}
			});
		}
		function credentialsFromNode(node) {
			return Object.entries(node.credentials ?? {}).flatMap(([authType, cred]) => cred.id ? [{
				authType,
				credentialId: cred.id
			}] : []);
		}
		function credentialSubtitle(node) {
			const creds = node.credentials ?? {};
			return Object.values(creds)[0]?.name;
		}
		function connectedToolItem(entry) {
			const { localId, ref } = entry;
			if (ref.type !== "node") return null;
			const node = toolRefToNode(ref);
			if (!node) return null;
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) return null;
			return {
				id: `tool:${localId}`,
				kind: "node",
				category: toolCategoryForNodeType(nodeType),
				nodeTypeName: nodeType.name,
				title: node.name,
				description: credentialSubtitle(node) ?? nodeType.description,
				longDescription: nodeType.description,
				status: "connected",
				iconSource: toToolIconSource(nodeType),
				credentials: credentialsFromNode(node),
				verified: isVerifiedCommunityTool(nodeType),
				restriction: getNodeItemRestriction(nodeType.name)
			};
		}
		function connectedMcpItem(entry) {
			const registryNodeTypeName = entry.server.metadata?.nodeTypeName;
			if (registryNodeTypeName) {
				const registryServer = mcpCatalog.value.find((server) => server.nodeTypeName === registryNodeTypeName);
				const status = entry.server.credential ? "connected" : "disconnected";
				return {
					id: `mcp:${entry.localId}`,
					kind: "mcp-server",
					category: "mcp",
					title: entry.server.name,
					description: registryServer?.tagline ?? entry.server.description,
					longDescription: registryServer?.description ?? entry.server.description,
					status,
					...status === "disconnected" ? { connectionFailureReason: "authentication" } : {},
					iconSource: registryServer ? iconForMcpRegistryServer(registryServer.icons, uiStore.appliedTheme) : {
						type: "icon",
						name: "mcp"
					},
					credentials: registryServer ? toMcpRegistryCredentialRefs(registryServer, entry.server) : [{
						authType: entry.server.authentication,
						credentialId: entry.server.credential,
						required: true
					}],
					availableTools: registryServer?.tools.map(toMcpServerTool) ?? [],
					isOfficial: registryServer?.isOfficial,
					freeCredits: isAiGatewayMcpEntry(entry.server),
					settings: entry.server.toolPermissions,
					publisher: registryServer && (registryServer.isOfficial || registryServer.websiteUrl) ? {
						name: registryServer.title,
						url: registryServer.websiteUrl
					} : void 0,
					version: registryServer?.version
				};
			}
			const nodeType = resolveMcpNodeType(entry.server);
			if (!nodeType) return null;
			const node = mcpServerToNode(entry.server, nodeType);
			return {
				id: `mcp:${entry.localId}`,
				kind: "node",
				category: "mcp",
				nodeTypeName: nodeType.name,
				title: entry.server.name,
				description: credentialSubtitle(node) ?? nodeType.description,
				longDescription: nodeType.description,
				status: "connected",
				iconSource: toToolIconSource(nodeType),
				credentials: credentialsFromNode(node),
				restriction: getNodeItemRestriction(nodeType.name)
			};
		}
		function toMcpServerTool(tool) {
			return {
				id: tool.name,
				name: tool.name,
				...tool.description ? { description: tool.description } : {},
				...tool.category ? { category: tool.category } : {}
			};
		}
		function availableRegistryItem(server) {
			const credentials = toMcpRegistryCredentialRefs(server);
			return {
				id: `registry:${server.slug}`,
				kind: "mcp-server",
				category: "mcp",
				title: server.title,
				description: server.tagline,
				longDescription: server.description,
				status: "none",
				iconSource: iconForMcpRegistryServer(server.icons, uiStore.appliedTheme),
				credentials,
				availableTools: server.tools.map(toMcpServerTool),
				isOfficial: server.isOfficial,
				freeCredits: credentials.some(({ aiGateway }) => aiGateway),
				publisher: server.isOfficial || server.websiteUrl ? {
					name: server.title,
					url: server.websiteUrl
				} : void 0,
				version: server.version
			};
		}
		function registryServerForItem(item) {
			if (item.id.startsWith("registry:")) {
				const slug = item.id.slice(9);
				return mcpCatalog.value.find((server) => server.slug === slug);
			}
			const nodeTypeName = mcpEntryForItem(item)?.server.metadata?.nodeTypeName;
			return mcpCatalog.value.find((server) => server.nodeTypeName === nodeTypeName);
		}
		function mcpEntryForItem(item) {
			if (!item.id.startsWith("mcp:")) return void 0;
			const localId = item.id.slice(4);
			return workingMcpServerEntries.value.find((entry) => entry.localId === localId);
		}
		function isRegistryItem(item) {
			if (item.kind !== "mcp-server") return false;
			if (item.id.startsWith("registry:")) return true;
			return mcpEntryForItem(item)?.server.metadata?.nodeTypeName !== void 0;
		}
		function connectRegistryItem(item, credentialId, authType) {
			const registryServer = registryServerForItem(item);
			if (!registryServer) return;
			const auth = toMcpEntryAuth(authType, credentialId);
			const existingEntry = mcpEntryForItem(item);
			if (existingEntry) {
				openConfigForRegistryEntry({
					...existingEntry,
					server: {
						...existingEntry.server,
						...auth
					}
				});
				return;
			}
			openConfigModal({
				kind: "registryMcpServer",
				mcpServer: {
					name: makeUniqueName(registryServer.title, getExistingMcpServerNames(workingMcpServers.value), (name, counter) => `${name}-${counter}`),
					description: registryServer.description,
					...auth,
					metadata: { nodeTypeName: registryServer.nodeTypeName },
					toolPermissions: defaultAgentMcpToolPermissions(props.data.supportsToolApproval !== false),
					connectionTimeoutMs: DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS
				},
				projectId: props.data.projectId,
				isNew: true,
				supportsToolApproval: props.data.supportsToolApproval,
				existingToolNames: getExistingMcpServerNames(workingMcpServers.value),
				onConfirm: addMcpServer
			});
		}
		async function loadRegistryCatalog() {
			try {
				mcpCatalog.value = await fetchCatalog();
			} catch (error) {
				toast.showError(error, i18n.baseText("generic.unknownError"));
			}
		}
		const credentialAdapter = createCredentialAdapter(registryServerForItem, ({ authType, credentialId, item }) => {
			connectRegistryItem(item, credentialId, authType);
		});
		provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, credentialAdapter);
		function handleCredentialDeleted(credentialId) {
			if (configData.value?.kind === "registryMcpServer") return;
			if (workingMcpServerEntries.value.filter(({ server }) => server.metadata?.nodeTypeName && server.credential === credentialId).length === 0) return;
			workingMcpServerEntries.value = workingMcpServerEntries.value.filter(({ server }) => !server.metadata?.nodeTypeName || server.credential !== credentialId);
			commit();
		}
		function handleSelectRegistryCredential(item, authType, credentialId) {
			if (!isRegistryItem(item)) return;
			connectRegistryItem(item, credentialId, authType);
		}
		function handleConnectRegistryItem(item) {
			if (!isRegistryItem(item)) {
				handleRowActivate(item);
				return;
			}
			const credential = item.credentials?.[0];
			if (!credential) return;
			credentialAdapter.openNewCredential(credential.authType, item, item.credentials?.map(({ authType }) => authType));
		}
		function availableNodeItem(nodeType) {
			const communityPreview = isCommunityPreviewTool(nodeType);
			return {
				id: `nodeType:${nodeType.name}`,
				kind: "node",
				category: toolCategoryForNodeType(nodeType),
				nodeTypeName: nodeType.name,
				title: nodeType.displayName.replace(/ Tool$/, ""),
				description: nodeType.description,
				longDescription: nodeType.description,
				status: "none",
				iconSource: toToolIconSource(nodeType),
				credentials: [],
				verified: isVerifiedCommunityTool(nodeType),
				communityPreview,
				installing: installingToolName.value === nodeType.name,
				installDisabled: communityPreview && !usersStore.isAdminOrOwner,
				restriction: getNodeItemRestriction(nodeType.name)
			};
		}
		/**
		* Same node, presented in the n8n Connect section: credentials are managed, so
		* it carries the "Free credits" pill and adds without a Connect step. The node
		* still appears under n8n nodes for users who want their own credential.
		*/
		function n8nConnectNodeItem(nodeType) {
			return {
				...availableNodeItem(nodeType),
				id: `${N8N_CONNECT_ID_PREFIX}${nodeType.name}`,
				category: "n8n-connect",
				freeCredits: true
			};
		}
		function availableWorkflowItem(workflow) {
			return {
				id: `workflow:${workflow.id}`,
				kind: "workflow",
				category: "workflows",
				workflowId: workflow.id,
				title: workflow.name,
				description: workflow.description ?? void 0,
				status: "none",
				credentials: []
			};
		}
		/**
		* Canvas parity: unofficial verified community tools are not in the AiTool name
		* index, so they surface only while searching, via the same path NodesMode uses
		* for "More from community".
		*/
		const communitySearchToolTypes = computed(() => {
			if (!searchQuery.value) return [];
			const hits = filterAndSearchNodes(nodeTypesStore.communityNodesAndActions.mergedNodes, searchQuery.value, {
				isAiSubcategory: true,
				aiConnectionType: NodeConnectionTypes.AiTool
			});
			const seen = new Set(availableToolTypes.value.map((nodeType) => nodeType.name));
			const previews = [];
			for (const hit of hits) {
				if (hit.type !== "node") continue;
				const resolved = resolveToolNodeType(hit.key) ?? resolveToolNodeType(hit.properties.name);
				if (!resolved || seen.has(resolved.name) || resolved.hidden || hasInputs(resolved)) continue;
				seen.add(resolved.name);
				previews.push(resolved);
			}
			return previews;
		});
		/** Gateway-backed subset of the available tools, surfaced in the n8n Connect section. */
		const n8nConnectItems = computed(() => availableToolTypes.value.filter((nodeType) => isAiGatewayEligibleNode(nodeType.name)).map(n8nConnectNodeItem));
		/**
		* Keep "All" first (the default tab), and slot the n8n Connect tab right after
		* it — only when the gateway actually offers something to show.
		*/
		const categories = computed(() => {
			if (isWorkflow.value) return ["workflows"];
			const baseCategories = BASE_CATEGORIES.filter((category) => category !== "workflows");
			if (n8nConnectItems.value.length === 0) return baseCategories;
			const [all, ...rest] = baseCategories;
			return [
				all,
				"n8n-connect",
				...rest
			];
		});
		const items = computed(() => {
			if (isWorkflow.value) return availableWorkflows.value.map(availableWorkflowItem);
			const out = [];
			const mcpClientNodeType = availableToolTypes.value.find((nodeType) => nodeType.name === AI_MCP_TOOL_NODE_TYPE);
			for (const item of n8nConnectItems.value) out.push(item);
			const configuredRegistryNodeTypes = new Set(workingMcpServerEntries.value.flatMap(({ server }) => server.metadata?.nodeTypeName ? [server.metadata.nodeTypeName] : []));
			for (const entry of workingMcpServerEntries.value) {
				const item = connectedMcpItem(entry);
				if (item) out.push(item);
			}
			if (mcpClientNodeType) out.push(availableNodeItem(mcpClientNodeType));
			for (const server of mcpCatalog.value) if (!configuredRegistryNodeTypes.has(server.nodeTypeName)) out.push(availableRegistryItem(server));
			for (const entry of workingToolEntries.value) {
				const item = connectedToolItem(entry);
				if (item) out.push(item);
			}
			for (const nodeType of availableToolTypes.value) {
				if (nodeType.name === "@n8n/n8n-nodes-langchain.mcpClientTool" || isMcpRegistryNodeType(nodeType.name)) continue;
				out.push(availableNodeItem(nodeType));
			}
			for (const nodeType of communitySearchToolTypes.value) {
				if (isMcpRegistryNodeType(nodeType.name)) continue;
				out.push(availableNodeItem(nodeType));
			}
			return out;
		});
		function addActionLabel(item) {
			if (item.kind === "mcp-server") return i18n.baseText("tools.connection.action.connect");
			return i18n.baseText("tools.connection.action.setup");
		}
		function openRegistryCredentialPicker() {
			credentialPicker.value?.open();
		}
		function handleOpenDetail(item) {
			handleRowActivate(item);
		}
		function handleRowActivate(item) {
			if (item.disabled) return;
			if (item.status === "connecting") return;
			const isRestricted = item.kind === "node" && Boolean(item.restriction);
			if (isRestricted && !hasToolConnection(item.status)) return;
			if (hasToolConnection(item.status)) {
				if (item.id.startsWith("mcp:")) {
					const localId = item.id.slice(4);
					const entry = workingMcpServerEntries.value.find((e) => e.localId === localId);
					if (entry) openConfigForMcpEntry(entry);
					return;
				}
				if (item.id.startsWith("tool:")) {
					const localId = item.id.slice(5);
					const entry = workingToolEntries.value.find((e) => e.localId === localId);
					if (!entry) return;
					const { ref } = entry;
					if (ref.type === "node" && !isRestricted) {
						const nodeType = [...availableToolTypes.value, ...communitySearchToolTypes.value].find((nt) => nt.name === ref.node.nodeType) ?? nodeTypesStore.getNodeType(ref.node.nodeType);
						if (nodeType) Object.values(ref.node.credentials ?? {}).some((credential) => "__aiGatewayManaged" in credential && credential.__aiGatewayManaged) ? addManagedNodeTool(nodeType) : handleAddTool(nodeType);
						return;
					}
					openConfigForToolEntry(entry);
				}
				return;
			}
			if (item.installDisabled || item.installing) return;
			if (item.kind === "workflow" && item.id.startsWith("workflow:")) {
				const workflowId = item.id.slice(9);
				const workflow = availableWorkflows.value.find((wf) => wf.id === workflowId);
				if (workflow) handleAddWorkflow(workflow);
				return;
			}
			if (item.kind === "node" && item.id.startsWith(N8N_CONNECT_ID_PREFIX)) {
				const nodeTypeName = item.id.slice(12);
				const nodeType = availableToolTypes.value.find((nt) => nt.name === nodeTypeName);
				if (nodeType) addManagedNodeTool(nodeType);
				return;
			}
			if (item.kind === "node" && item.id.startsWith("nodeType:")) {
				const nodeTypeName = item.id.slice(9);
				const nodeType = [...availableToolTypes.value, ...communitySearchToolTypes.value].find((nt) => nt.name === nodeTypeName);
				if (nodeType) handleAddTool(nodeType);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModalMultiStep_default, {
				open: isOpen.value,
				step: currentStep.value,
				title: modalTitle.value,
				"title-error": configContent.value?.titleError,
				"editable-title": Boolean(configData.value) && !configIsCustom.value && !configIsRestricted.value,
				"stable-height": "",
				"show-back": Boolean(configData.value),
				"show-footer": Boolean(configData.value),
				busy: isCredentialModalOpen.value || isCreatingWorkflow.value,
				"trap-focus": !isCredentialModalOpen.value,
				"disable-outside-pointer-events": !isCredentialModalOpen.value,
				"data-testid": "agent-tools-connection-modal",
				onInteractOutside: handleInteractOutside,
				"onUpdate:open": _cache[5] || (_cache[5] = ($event) => isOpen.value = $event),
				"onUpdate:title": updateConfigTitle,
				onBack: backToPicker
			}, createSlots({
				default: withCtx(() => [withDirectives(createVNode(ToolsConnectionModal_default, {
					open: isOpen.value,
					items: items.value,
					categories: categories.value,
					title: pickerTitle.value,
					"search-placeholder": isWorkflow.value ? unref(i18n).baseText("agents.tools.workflow.search.placeholder") : void 0,
					"create-action": isWorkflow.value && canCreateWorkflow.value ? {
						category: "workflows",
						label: unref(i18n).baseText("generic.create.workflow"),
						testId: "tools-connection-create-workflow"
					} : void 0,
					"create-action-loading": isCreatingWorkflow.value,
					loading: isLoadingCredentials.value,
					"empty-message": isWorkflow.value ? unref(i18n).baseText("agents.tools.workflow.empty.title") : void 0,
					"no-results-message": isWorkflow.value ? unref(i18n).baseText("agents.tools.workflow.empty.noResults") : void 0,
					"connect-label": addActionLabel,
					"group-search-results": !isWorkflow.value,
					embedded: "",
					"show-connect-actions": "",
					"persistent-scrollbar": "",
					"onUpdate:open": _cache[1] || (_cache[1] = ($event) => isOpen.value = $event),
					"onUpdate:searchQuery": _cache[2] || (_cache[2] = ($event) => searchQuery.value = $event),
					onConnect: handleConnectRegistryItem,
					onOpenDetail: handleOpenDetail,
					onSelectCredential: handleSelectRegistryCredential,
					onCreate: handleCreateWorkflow
				}, {
					"suggestion-footer": withCtx(() => [createVNode(McpRegistrySuggestionFooter_default, {
						prompt: unref(i18n).baseText("agents.tools.suggestion.prompt"),
						action: unref(i18n).baseText("agents.tools.suggestion.action")
					}, null, 8, ["prompt", "action"])]),
					_: 1
				}, 8, [
					"open",
					"items",
					"categories",
					"title",
					"search-placeholder",
					"create-action",
					"create-action-loading",
					"loading",
					"empty-message",
					"no-results-message",
					"group-search-results"
				]), [[vShow, !configData.value]]), configData.value ? (openBlock(), createBlock(AgentToolConfigContent_default, {
					key: configSession.value,
					ref_key: "configContent",
					ref: configContent,
					data: configData.value,
					onCredentialDeleted: closeModal,
					"onUpdate:title": _cache[3] || (_cache[3] = ($event) => configTitle.value = $event),
					"onUpdate:restricted": _cache[4] || (_cache[4] = ($event) => configIsRestricted.value = $event),
					onRequestCredentialPicker: openRegistryCredentialPicker
				}, null, 8, ["data"])) : createCommentVNode("", true)]),
				_: 2
			}, [
				configData.value ? {
					name: "titlePrefix",
					fn: withCtx(() => [createVNode(AgentToolConfigTitleIcon_default, { data: configData.value }, null, 8, ["data"])]),
					key: "0"
				} : void 0,
				configContent.value?.headerItem?.credentials?.length ? {
					name: "headerActions",
					fn: withCtx(() => [createVNode(AgentToolConfigCredentialPicker_default, {
						ref_key: "credentialPicker",
						ref: credentialPicker,
						item: configContent.value.headerItem,
						adapter: configContent.value.credentialAdapter,
						"show-connected-icon": Boolean(configData.value?.onRemove),
						onSelectCredential: _cache[0] || (_cache[0] = (authType, credentialId) => configContent.value?.selectCredential(authType, credentialId))
					}, null, 8, [
						"item",
						"adapter",
						"show-connected-icon"
					])]),
					key: "1"
				} : void 0,
				configData.value?.onRemove ? {
					name: "footerLeft",
					fn: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						"data-testid": "agent-tool-config-remove",
						onClick: removeConfig
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "trash-2",
							size: 16
						})]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.tools.remove")), 1)]),
						_: 1
					})]),
					key: "2"
				} : void 0,
				configData.value ? {
					name: "footerActions",
					fn: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "solid",
						disabled: saveDisabled.value,
						"data-testid": "agent-tool-config-save",
						onClick: saveConfig
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(configData.value?.kind === "registryMcpServer" && configData.value.isNew ? unref(i18n).baseText("agents.builder.tools.add") : unref(i18n).baseText("generic.save")), 1)]),
						_: 1
					}, 8, ["disabled"])]),
					key: "3"
				} : void 0
			]), 1032, [
				"open",
				"step",
				"title",
				"title-error",
				"editable-title",
				"show-back",
				"show-footer",
				"busy",
				"trap-focus",
				"disable-outside-pointer-events"
			]);
		};
	}
});
//#endregion
export { AgentToolsConnectionModalWrapper_default as default };
