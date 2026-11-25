import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Vf as ref, if as nextTick } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, AN as i18n, Ef as removePreviewToken, Mp as useCredentialsStore, Qc as useCanvasOperations, _C as useUsersStore, bf as getNodeItemRestriction, dC as useToast, hC as useTelemetry, hp as useTypeAvailabilityPoliciesStore, uf as useNodeTypesStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { a as isNodesApiVersionError, n as describeSelectedNodeRestriction, o as useCommunityNodesStore, t as describeInstallPolicyNote } from "./communityNodes.utils-CxF1_d74.js";
//#region src/features/settings/communityNodes/composables/useInstallNode.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useInstallNode() {
	const communityNodesStore = useCommunityNodesStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const userStore = useUsersStore();
	const loading = ref(false);
	const toast = useToast();
	const canvasOperations = useCanvasOperations();
	const telemetry = useTelemetry();
	const settingsStore = useSettingsStore();
	const typeAvailabilityPoliciesStore = useTypeAvailabilityPoliciesStore();
	const getNpmVersion = async (key) => {
		const communityNodeAttributes = await nodeTypesStore.getCommunityNodeAttributes(key);
		if (communityNodeAttributes) return communityNodeAttributes.npmVersion;
	};
	/** `undefined` when no policy restricts the node in the current project. */
	const describeSelectedNode = (nodeTypeName) => {
		const restriction = getNodeItemRestriction(nodeTypeName);
		if (!restriction) return void 0;
		const displayName = nodeTypesStore.getNodeType(nodeTypeName)?.displayName ?? nodeTypeName;
		return describeSelectedNodeRestriction(displayName, restriction.scope);
	};
	const installNode = async (props) => {
		if (!userStore.isAdminOrOwner) {
			const error = /* @__PURE__ */ new Error("User is not an owner or admin");
			toast.showError(error, i18n.baseText("settings.communityNodes.messages.install.error"));
			return {
				success: false,
				error
			};
		}
		if (props.telemetry) telemetry.track("user started cnr package install", {
			input_string: props.packageName,
			has_quick_connect: props.telemetry.hasQuickConnect,
			source: props.telemetry.source
		});
		try {
			loading.value = true;
			const installedPackage = props.type === "verified" && !settingsStore.isUnverifiedPackagesEnabled ? await communityNodesStore.installPackage(props.packageName, await getNpmVersion(props.nodeType)) : await communityNodesStore.installPackage(props.packageName);
			await Promise.all([
				nodeTypesStore.getNodeTypes(),
				nodeTypesStore.fetchCommunityNodePreviews(),
				credentialsStore.fetchCredentialTypes(true),
				typeAvailabilityPoliciesStore.reload()
			]);
			await nextTick();
			const nodeType = props.nodeType;
			const allNodes = workflowDocumentStore.value.allNodes;
			if (nodeType && allNodes.length) {
				const nodesToUpdate = allNodes.filter((node) => node.type === removePreviewToken(nodeType));
				canvasOperations.initializeUnknownNodes(nodesToUpdate);
			}
			const selectedNote = props.selectedNodeType ? describeSelectedNode(removePreviewToken(props.selectedNodeType)) : void 0;
			const policyNote = selectedNote ?? describeInstallPolicyNote(installedPackage.policyRestrictions, installedPackage.installedNodes.length);
			toast.showMessage({
				title: i18n.baseText("settings.communityNodes.messages.install.success"),
				...policyNote ? {
					type: "warning",
					message: policyNote
				} : { type: "success" }
			});
			return {
				success: true,
				restricted: selectedNote !== void 0
			};
		} catch (error) {
			toast.showError(error, i18n.baseText(isNodesApiVersionError(error) ? "settings.communityNodes.messages.install.incompatible.title" : "settings.communityNodes.messages.install.error"));
			return {
				success: false,
				error
			};
		} finally {
			loading.value = false;
		}
	};
	return {
		installNode,
		loading
	};
}
//#endregion
export { useInstallNode as t };
