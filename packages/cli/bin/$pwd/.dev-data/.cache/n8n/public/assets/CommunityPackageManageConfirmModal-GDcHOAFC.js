import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, la as require_semver, lf as onMounted, nf as mergeModels, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { A_ as COMMUNITY_PACKAGE_MANAGE_ACTIONS, Jg as useUIStore, KA as Dialog_default, Kj as N8nNotice_default, O_ as COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, Wp as useWorkflowsListStore, _N as N8nText_default, dC as useToast, ej as N8nDataTableServer_default, fC as VIEWS, hC as useTelemetry, jN as useI18n, lm as ResourceType, uf as useNodeTypesStore, vm as useProjectsStore, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { a as isNodesApiVersionError, o as useCommunityNodesStore, r as findVettedCommunityNodeAttributes } from "./communityNodes.utils-CxF1_d74.js";
import { t as ProjectCardBadge_default } from "./ProjectCardBadge-OjdBsJc2.js";
//#region src/features/settings/communityNodes/components/NodesInWorkflowTable.vue?vue&type=script&setup=true&lang.ts
var import_semver = /* @__PURE__ */ __toESM(require_semver(), 1);
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "status active"
};
var _hoisted_2 = {
	key: 1,
	class: "status inactive"
};
//#endregion
//#region src/features/settings/communityNodes/components/NodesInWorkflowTable.vue
var NodesInWorkflowTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodesInWorkflowTable",
	props: /*@__PURE__*/ mergeModels({ data: {} }, {
		"sortBy": {},
		"sortByModifiers": {}
	}),
	emits: ["update:sortBy"],
	setup(__props) {
		const props = __props;
		const sortBy = useModel(__props, "sortBy");
		const i18n = useI18n();
		const projectsStore = useProjectsStore();
		const headers = computed(() => [
			{
				title: i18n.baseText("settings.communityNodes.confirmModal.workflowsTable.workflow"),
				key: "name",
				width: 250
			},
			{
				title: i18n.baseText("settings.communityNodes.confirmModal.workflowsTable.owner"),
				key: "homeProject.name",
				width: 100
			},
			{
				title: i18n.baseText("settings.communityNodes.confirmModal.workflowsTable.status"),
				key: "active",
				width: 30
			}
		]);
		const sortedItems = computed(() => {
			if (!sortBy?.value?.length) return props.data;
			const [{ id, desc }] = sortBy.value;
			return [...props.data].sort((a, b) => {
				if (!a[id] || !b[id]) return 0;
				if (a[id] < b[id]) return desc ? 1 : -1;
				if (a[id] > b[id]) return desc ? -1 : 1;
				return 0;
			});
		});
		const getWorkflowLink = (workflowId) => ({
			name: VIEWS.WORKFLOW,
			params: { workflowId }
		});
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("div", null, [sortedItems.value?.length ? (openBlock(), createBlock(unref(N8nDataTableServer_default), {
				key: 0,
				"sort-by": sortBy.value,
				"onUpdate:sortBy": _cache[0] || (_cache[0] = ($event) => sortBy.value = $event),
				headers: headers.value,
				items: sortedItems.value,
				"items-length": sortedItems.value.length,
				"page-sizes": [sortedItems.value.length + 1]
			}, {
				[`item.name`]: withCtx(({ item }) => [createVNode(_component_RouterLink, {
					to: getWorkflowLink(item.id),
					target: "_blank"
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: "ellipsis",
						style: { "color": "var(--color--text)" }
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
						_: 2
					}, 1024)]),
					_: 2
				}, 1032, ["to"])]),
				[`item.homeProject.name`]: withCtx(({ item }) => [createBaseVNode("div", null, [createVNode(ProjectCardBadge_default, {
					class: "cardBadge",
					resource: item,
					"resource-type": unref(ResourceType).Workflow,
					"resource-type-label": unref(i18n).baseText("generic.workflow").toLowerCase(),
					"personal-project": unref(projectsStore).personalProject,
					"show-badge-border": false
				}, null, 8, [
					"resource",
					"resource-type",
					"resource-type-label",
					"personal-project"
				])])]),
				[`item.active`]: withCtx(({ item }) => [item.active ? (openBlock(), createElementBlock("span", _hoisted_1, toDisplayString(unref(i18n).baseText("settings.communityNodes.confirmModal.workflowsTable.active")), 1)) : (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(unref(i18n).baseText("settings.communityNodes.confirmModal.workflowsTable.inactive")), 1))]),
				_: 2
			}, 1032, [
				"sort-by",
				"headers",
				"items",
				"items-length",
				"page-sizes"
			])) : createCommentVNode("", true)]);
		};
	}
}), [["__scopeId", "data-v-8367b8b0"]]);
//#endregion
//#region src/features/settings/communityNodes/components/CommunityPackageManageConfirmModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CommunityPackageManageConfirmModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "CommunityPackageManageConfirmModal",
	props: {
		modalName: {},
		activePackageName: {},
		mode: {}
	},
	setup(__props) {
		const props = __props;
		const communityNodesStore = useCommunityNodesStore();
		const nodeTypesStore = useNodeTypesStore();
		const settingsStore = useSettingsStore();
		const workflowsListStore = useWorkflowsListStore();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]?.open === true);
		const toast = useToast();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const loading = ref(false);
		const workflowsWithPackageNodes = ref([]);
		const isUsingVerifiedAndUnverifiedPackages = settingsStore.isCommunityNodesFeatureEnabled && settingsStore.isUnverifiedPackagesEnabled;
		const isUsingVerifiedPackagesOnly = settingsStore.isCommunityNodesFeatureEnabled && !settingsStore.isUnverifiedPackagesEnabled;
		const communityStorePackage = computed(() => communityNodesStore.installedPackages[props.activePackageName]);
		const updateVersion = computed(() => {
			return settingsStore.isUnverifiedPackagesEnabled ? communityStorePackage.value.updateAvailable : nodeTypeStorePackage.value?.npmVersion;
		});
		const nodeTypeStorePackage = ref();
		const isLatestPackageVerified = ref(true);
		const packageVersion = ref(communityStorePackage.value.updateAvailable ?? "");
		const includedNodes = computed(() => {
			return communityStorePackage.value.installedNodes.map((node) => node.name).join(", ");
		});
		const getModalContent = computed(() => {
			if (props.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) return {
				title: i18n.baseText("settings.communityNodes.confirmModal.uninstall.title"),
				message: i18n.baseText("settings.communityNodes.confirmModal.includedNodes", { interpolate: { nodes: includedNodes.value } }),
				description: workflowsWithPackageNodes.value.length ? i18n.baseText("settings.communityNodes.confirmModal.uninstall.description") : i18n.baseText("settings.communityNodes.confirmModal.noWorkflowsUsingNodes"),
				buttonLabel: i18n.baseText("settings.communityNodes.confirmModal.uninstall.buttonLabel"),
				buttonLoadingLabel: i18n.baseText("settings.communityNodes.confirmModal.uninstall.buttonLoadingLabel")
			};
			return {
				title: i18n.baseText("settings.communityNodes.confirmModal.update.title"),
				message: i18n.baseText("settings.communityNodes.confirmModal.includedNodes", { interpolate: { nodes: includedNodes.value } }),
				description: workflowsWithPackageNodes.value.length ? i18n.baseText("settings.communityNodes.confirmModal.update.description") : i18n.baseText("settings.communityNodes.confirmModal.noWorkflowsUsingNodes"),
				warning: i18n.baseText("settings.communityNodes.confirmModal.update.warning"),
				buttonLabel: i18n.baseText("settings.communityNodes.confirmModal.update.buttonLabel"),
				buttonLoadingLabel: i18n.baseText("settings.communityNodes.confirmModal.update.buttonLoadingLabel")
			};
		});
		function closeDialog() {
			uiStore.closeModal(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open && !loading.value) closeDialog();
		}
		const onConfirmButtonClick = async () => {
			if (props.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) await onUninstall();
			else if (props.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE) await onUpdate();
		};
		const onUninstall = async () => {
			try {
				telemetry.track("user started cnr package deletion", {
					package_name: communityStorePackage.value.packageName,
					package_node_names: communityStorePackage.value.installedNodes.map((node) => node.name),
					package_version: communityStorePackage.value.installedVersion,
					package_author: communityStorePackage.value.authorName,
					package_author_email: communityStorePackage.value.authorEmail
				});
				loading.value = true;
				await communityNodesStore.uninstallPackage(props.activePackageName);
				await Promise.all([useNodeTypesStore().getNodeTypes(), useNodeTypesStore().fetchCommunityNodePreviews()]);
				toast.showMessage({
					title: i18n.baseText("settings.communityNodes.messages.uninstall.success.title"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.communityNodes.messages.uninstall.error"));
			} finally {
				loading.value = false;
				closeDialog();
			}
		};
		const onUpdate = async () => {
			try {
				telemetry.track("user started cnr package update", {
					package_name: communityStorePackage.value.packageName,
					package_node_names: communityStorePackage.value.installedNodes.map((node) => node.name),
					package_version_current: communityStorePackage.value.installedVersion,
					package_version_new: communityStorePackage.value.updateAvailable,
					package_author: communityStorePackage.value.authorName,
					package_author_email: communityStorePackage.value.authorEmail
				});
				loading.value = true;
				if (settingsStore.isUnverifiedPackagesEnabled) await communityNodesStore.updatePackage(props.activePackageName);
				else if (settingsStore.isCommunityNodesFeatureEnabled) await communityNodesStore.updatePackage(props.activePackageName, updateVersion.value);
				else throw new Error("Community nodes feature is not correctly enabled.");
				await useNodeTypesStore().getNodeTypes();
				toast.showMessage({
					title: i18n.baseText("settings.communityNodes.messages.update.success.title"),
					message: i18n.baseText("settings.communityNodes.messages.update.success.message", { interpolate: {
						packageName: props.activePackageName,
						version: updateVersion.value ?? ""
					} }),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText(isNodesApiVersionError(error) ? "settings.communityNodes.messages.update.error.incompatible.title" : "settings.communityNodes.messages.update.error.title"));
			} finally {
				loading.value = false;
				closeDialog();
			}
		};
		async function fetchPackageInfo() {
			const nodeTypes = communityStorePackage.value?.installedNodes.map((node) => node.type) ?? [];
			const communityNodeAttributes = await findVettedCommunityNodeAttributes(nodeTypes, nodeTypesStore.getCommunityNodeAttributes);
			nodeTypeStorePackage.value = communityNodeAttributes ?? void 0;
		}
		function setIsVerifiedLatestPackage() {
			if (isUsingVerifiedAndUnverifiedPackages && nodeTypeStorePackage.value?.npmVersion && communityStorePackage.value.updateAvailable) isLatestPackageVerified.value = import_semver.default.eq(nodeTypeStorePackage.value.npmVersion, communityStorePackage.value.updateAvailable);
		}
		function setPackageVersion() {
			if (isUsingVerifiedPackagesOnly) packageVersion.value = nodeTypeStorePackage.value?.npmVersion ?? packageVersion.value;
		}
		onMounted(async () => {
			if (props.activePackageName) await fetchPackageInfo();
			if (communityStorePackage.value?.installedNodes.length) {
				const nodeTypes = communityStorePackage.value.installedNodes.map((node) => node.type);
				const response = await workflowsListStore.fetchWorkflowsWithNodesIncluded(nodeTypes);
				workflowsWithPackageNodes.value = response?.data ?? [];
			}
			setIsVerifiedLatestPackage();
			setPackageVersion();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: props.mode === unref(COMMUNITY_PACKAGE_MANAGE_ACTIONS).UNINSTALL ? "medium" : "large",
				header: getModalContent.value.title,
				"close-on-overlay-click": !loading.value,
				"close-on-escape": !loading.value,
				"show-close-button": !loading.value,
				"data-test-id": `${unref(COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY)}-modal`,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [
						createVNode(unref(N8nText_default), {
							color: "text-dark",
							bold: true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(getModalContent.value.message), 1)]),
							_: 1
						}),
						!isLatestPackageVerified.value && getModalContent.value.warning ? (openBlock(), createBlock(unref(N8nNotice_default), {
							key: 0,
							"data-test-id": "communityPackageManageConfirmModal-warning",
							content: getModalContent.value.warning
						}, null, 8, ["content"])) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.descriptionContainer) }, [createVNode(unref(N8nText_default), {
							size: "medium",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(getModalContent.value.description), 1)]),
							_: 1
						})], 2),
						workflowsWithPackageNodes.value?.length ? (openBlock(), createBlock(NodesInWorkflowTable_default, {
							key: 1,
							data: workflowsWithPackageNodes.value
						}, null, 8, ["data"])) : createCommentVNode("", true)
					]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						disabled: loading.value,
						label: unref(i18n).baseText("settings.communityNodes.confirmModal.cancel"),
						"data-test-id": "close-button",
						onClick: closeDialog
					}, null, 8, ["disabled", "label"]), createVNode(unref(N8nButton_default), {
						loading: loading.value,
						disabled: loading.value,
						label: loading.value ? getModalContent.value.buttonLoadingLabel : getModalContent.value.buttonLabel,
						onClick: onConfirmButtonClick
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"open",
				"size",
				"header",
				"close-on-overlay-click",
				"close-on-escape",
				"show-close-button",
				"data-test-id"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	descriptionContainer: "_descriptionContainer_2nx0a_1",
	descriptionIcon: "_descriptionIcon_2nx0a_7",
	descriptionText: "_descriptionText_2nx0a_12"
} }]]);
//#endregion
export { CommunityPackageManageConfirmModal_default as default };
