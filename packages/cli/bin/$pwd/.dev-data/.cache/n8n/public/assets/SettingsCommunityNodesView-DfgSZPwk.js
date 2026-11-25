import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, af as onBeforeMount, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { A_ as COMMUNITY_PACKAGE_MANAGE_ACTIONS, E_ as COMMUNITY_NODES_INSTALLATION_DOCS_URL, Hy as NPM_PACKAGE_DOCS_BASE_URL, Jg as useUIStore, Kd as useDocumentTitle, Kj as N8nNotice_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Xc as usePushConnectionStore, YM as N8nActionToggle_default, _N as N8nText_default, dC as useToast, f as usePrefetchModals, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, k_ as COMMUNITY_PACKAGE_INSTALL_MODAL_KEY, nN as N8nBadge_default, sp as getNodeTypeRestriction, tN as N8nLoading_default, tp as useTypeAvailability, uf as useNodeTypesStore, vd as useExternalHooks, vm as useProjectsStore, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as usePushConnection } from "./usePushConnection-B4aIEl0f.js";
import "./usePushConnection-wBo-ZJFz.js";
import { i as isCommunityPackageUpdateAvailable, o as useCommunityNodesStore, r as findVettedCommunityNodeAttributes } from "./communityNodes.utils-CxF1_d74.js";
//#region src/features/settings/communityNodes/components/CommunityPackageCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var CommunityPackageCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CommunityPackageCard",
	props: {
		communityPackage: { default: null },
		loading: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const { openCommunityPackageUpdateConfirmModal, openCommunityPackageUninstallConfirmModal } = useUIStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const settingsStore = useSettingsStore();
		const nodeTypesStore = useNodeTypesStore();
		const latestVerifiedVersion = ref();
		const isManagedByEnv = computed(() => settingsStore.settings.communityNodesManagedByEnv ?? false);
		const hasUpdateAvailable = computed(() => {
			if (!props.communityPackage) return false;
			return isCommunityPackageUpdateAvailable({
				installedVersion: props.communityPackage.installedVersion,
				updateAvailable: props.communityPackage.updateAvailable,
				latestVerifiedVersion: latestVerifiedVersion.value,
				isCommunityNodesFeatureEnabled: settingsStore.isCommunityNodesFeatureEnabled,
				isUnverifiedPackagesEnabled: settingsStore.isUnverifiedPackagesEnabled,
				isManagedByEnv: isManagedByEnv.value
			});
		});
		const blockedNodes = computed(() => {
			if (!props.communityPackage) return [];
			return props.communityPackage.installedNodes.filter((node) => {
				const restriction = getNodeTypeRestriction(node.type);
				return restriction?.scope === "instance" && !restriction.optInAvailable;
			});
		});
		const packageActions = computed(() => {
			const actions = [{
				label: i18n.baseText("settings.communityNodes.viewDocsAction.label"),
				value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS,
				type: "external-link"
			}];
			if (!isManagedByEnv.value) actions.push({
				label: i18n.baseText("settings.communityNodes.uninstallAction.label"),
				value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL
			});
			return actions;
		});
		async function onAction(value) {
			if (!props.communityPackage) return;
			switch (value) {
				case COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS:
					telemetry.track("user clicked to browse the cnr package documentation", {
						package_name: props.communityPackage.packageName,
						package_version: props.communityPackage.installedVersion
					});
					window.open(`${NPM_PACKAGE_DOCS_BASE_URL}${props.communityPackage.packageName}`, "_blank");
					break;
				case COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL: openCommunityPackageUninstallConfirmModal(props.communityPackage.packageName);
			}
		}
		function onUpdateClick() {
			if (!props.communityPackage) return;
			openCommunityPackageUpdateConfirmModal(props.communityPackage.packageName, "instance settings");
		}
		watch(() => props.communityPackage?.installedNodes.map((node) => node.type) ?? [], async (nodeTypes) => {
			const attributes = await findVettedCommunityNodeAttributes(nodeTypes, nodeTypesStore.getCommunityNodeAttributes);
			latestVerifiedVersion.value = attributes?.npmVersion;
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.cardContainer),
				"data-test-id": "community-package-card"
			}, [__props.loading ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.cardSkeleton)
			}, [createVNode(unref(N8nLoading_default), {
				class: normalizeClass(_ctx.$style.loader),
				variant: "p",
				rows: 1
			}, null, 8, ["class"]), createVNode(unref(N8nLoading_default), {
				class: normalizeClass(_ctx.$style.loader),
				variant: "p",
				rows: 1
			}, null, 8, ["class"])], 2)) : __props.communityPackage ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.packageCard)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardInfoContainer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardTitle) }, [createVNode(unref(N8nText_default), {
				bold: true,
				size: "large"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.communityPackage.packageName), 1)]),
				_: 1
			}), blockedNodes.value.length > 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				placement: "top"
			}, {
				content: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nText_default), {
					tag: "p",
					size: "small",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.communityNodes.restricted.tooltip.heading")), 1)]),
					_: 1
				}), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.blockedNodesList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(blockedNodes.value, (node) => {
					return openBlock(), createElementBlock("li", { key: node.type }, toDisplayString(node.name), 1);
				}), 128))], 2)])]),
				default: withCtx(() => [createVNode(unref(N8nBadge_default), {
					variant: "filled",
					"leading-icon": "lock",
					"data-test-id": "community-package-restricted-badge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.communityNodes.restricted.badge.label")), 1)]),
					_: 1
				})]),
				_: 1
			})) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardSubtitle) }, [createVNode(unref(N8nText_default), {
				bold: true,
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.communityNodes.packageNodes.label", { adjustToNumber: __props.communityPackage.installedNodes.length })) + ":\xA0 ", 1)]),
				_: 1
			}), createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.communityPackage.installedNodes, (node, index) => {
					return openBlock(), createElementBlock("span", { key: node.name }, [createTextVNode(toDisplayString(node.name), 1), index != __props.communityPackage.installedNodes.length - 1 ? (openBlock(), createElementBlock("span", _hoisted_1, ",")) : createCommentVNode("", true)]);
				}), 128))]),
				_: 1
			})], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardControlsContainer) }, [
				createVNode(unref(N8nText_default), {
					bold: true,
					size: "large",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(" v" + toDisplayString(__props.communityPackage.installedVersion), 1)]),
					_: 1
				}),
				__props.communityPackage.failedLoading === true ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					placement: "top"
				}, {
					content: withCtx(() => [createBaseVNode("div", null, toDisplayString(unref(i18n).baseText("settings.communityNodes.failedToLoad.tooltip")), 1)]),
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "triangle-alert",
						color: "danger",
						size: "large"
					})]),
					_: 1
				})) : hasUpdateAvailable.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					placement: "top"
				}, {
					content: withCtx(() => [createBaseVNode("div", null, toDisplayString(unref(i18n).baseText("settings.communityNodes.updateAvailable.tooltip")), 1)]),
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: "Update",
						onClick: onUpdateClick
					})]),
					_: 1
				})) : (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 2,
					placement: "top"
				}, {
					content: withCtx(() => [createBaseVNode("div", null, toDisplayString(unref(i18n).baseText("settings.communityNodes.upToDate.tooltip")), 1)]),
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "circle-check",
						color: "text-light",
						size: "large"
					})]),
					_: 1
				})),
				packageActions.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.cardActions)
				}, [createVNode(unref(N8nActionToggle_default), {
					actions: packageActions.value,
					onAction
				}, null, 8, ["actions"])], 2)) : createCommentVNode("", true)
			], 2)], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	cardContainer: "_cardContainer_1yc62_1",
	packageCard: "_packageCard_1yc62_9",
	cardSkeleton: "_cardSkeleton_1yc62_10",
	loader: "_loader_1yc62_24",
	cardInfoContainer: "_cardInfoContainer_1yc62_35",
	cardTitle: "_cardTitle_1yc62_40",
	blockedNodesList: "_blockedNodesList_1yc62_50",
	cardSubtitle: "_cardSubtitle_1yc62_55",
	cardControlsContainer: "_cardControlsContainer_1yc62_60",
	cardActions: "_cardActions_1yc62_66"
} }]]);
//#endregion
//#region src/features/settings/communityNodes/views/SettingsCommunityNodesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PACKAGE_COUNT_THRESHOLD = 31;
var SettingsCommunityNodesView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsCommunityNodesView",
	setup(__props) {
		const loading = ref(false);
		const router = useRouter();
		const pushConnection = usePushConnection({ router });
		const pushStore = usePushConnectionStore();
		const externalHooks = useExternalHooks();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const toast = useToast();
		const documentTitle = useDocumentTitle();
		const communityNodesStore = useCommunityNodesStore();
		const uiStore = useUIStore();
		const settingsStore = useSettingsStore();
		const projectsStore = useProjectsStore();
		const isManagedByEnv = computed(() => {
			return settingsStore.settings.communityNodesManagedByEnv ?? false;
		});
		const canInstall = computed(() => {
			return settingsStore.isUnverifiedPackagesEnabled && !isManagedByEnv.value;
		});
		usePrefetchModals([COMMUNITY_PACKAGE_INSTALL_MODAL_KEY], { enabled: () => canInstall.value });
		const getEmptyStateTitle = computed(() => {
			if (!settingsStore.isUnverifiedPackagesEnabled) return i18n.baseText("settings.communityNodes.empty.verified.only.title");
			return i18n.baseText("settings.communityNodes.empty.title");
		});
		const getEmptyStateDescription = computed(() => {
			if (!settingsStore.isUnverifiedPackagesEnabled) return i18n.baseText("settings.communityNodes.empty.verified.only.description");
			const packageCount = communityNodesStore.availablePackageCount;
			return packageCount < PACKAGE_COUNT_THRESHOLD ? i18n.baseText("settings.communityNodes.empty.description.no-packages", { interpolate: { docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL } }) : i18n.baseText("settings.communityNodes.empty.description", { interpolate: {
				docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
				count: (Math.floor(packageCount / 10) * 10).toString()
			} });
		});
		const getEmptyStateButtonText = computed(() => {
			if (!canInstall.value) return "";
			return i18n.baseText("settings.communityNodes.empty.installPackageLabel");
		});
		const actionBoxConfig = computed(() => {
			return {
				calloutText: "",
				calloutTheme: void 0,
				hideButton: false
			};
		});
		const onClickEmptyStateButton = () => {
			openInstallModal();
		};
		const openInstallModal = () => {
			const telemetryPayload = { is_empty_state: communityNodesStore.getInstalledPackages.length === 0 };
			telemetry.track("user clicked cnr install button", telemetryPayload);
			externalHooks.run("settingsCommunityNodesView.openInstallModal", telemetryPayload);
			uiStore.openModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
		};
		onBeforeMount(() => {
			pushConnection.initialize();
			pushStore.pushConnect();
		});
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.communityNodes"));
			try {
				loading.value = true;
				await communityNodesStore.fetchInstalledPackages();
				const installedPackages = communityNodesStore.getInstalledPackages;
				const packagesToUpdate = installedPackages.filter((p) => p.updateAvailable);
				telemetry.track("user viewed cnr settings page", {
					num_of_packages_installed: installedPackages.length,
					installed_packages: installedPackages.map((p) => {
						return {
							package_name: p.packageName,
							package_version: p.installedVersion,
							package_nodes: p.installedNodes.map((node) => `${node.name}-v${node.latestVersion}`),
							is_update_available: p.updateAvailable !== void 0
						};
					}),
					packages_to_update: packagesToUpdate.map((p) => {
						return {
							package_name: p.packageName,
							package_version_current: p.installedVersion,
							package_version_available: p.updateAvailable
						};
					}),
					number_of_updates_available: packagesToUpdate.length
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.communityNodes.fetchError.title"), { message: i18n.baseText("settings.communityNodes.fetchError.message") });
			} finally {
				loading.value = false;
			}
			try {
				await communityNodesStore.fetchAvailableCommunityPackageCount();
			} finally {
				loading.value = false;
			}
		});
		onBeforeUnmount(() => {
			pushStore.pushDisconnect();
			pushConnection.terminate();
		});
		useTypeAvailability(() => projectsStore.personalProject?.id);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.headingContainer) }, [createVNode(unref(N8nHeading_default), { size: "2xlarge" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.communityNodes")), 1)]),
					_: 1
				}), canInstall.value && unref(communityNodesStore).getInstalledPackages.length > 0 && !loading.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					label: unref(i18n).baseText("settings.communityNodes.installModal.installButton.label"),
					size: "large",
					onClick: openInstallModal
				}, null, 8, ["label"])) : createCommentVNode("", true)], 2),
				isManagedByEnv.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
					key: 0,
					class: "mb-l",
					content: unref(i18n).baseText("settings.communityNodes.managedByEnv"),
					"data-test-id": "community-nodes-managed-by-env"
				}, null, 8, ["content"])) : createCommentVNode("", true),
				loading.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.cardsContainer)
				}, [(openBlock(), createElementBlock(Fragment, null, renderList(2, (n) => {
					return createVNode(CommunityPackageCard_default, {
						key: "index-" + n,
						loading: true
					});
				}), 64))], 2)) : unref(communityNodesStore).getInstalledPackages.length === 0 ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.actionBoxContainer)
				}, [createVNode(unref(N8nEmptyState_default), {
					heading: getEmptyStateTitle.value,
					description: getEmptyStateDescription.value,
					"button-text": getEmptyStateButtonText.value,
					"button-disabled": !unref(settingsStore).isUnverifiedPackagesEnabled,
					"callout-text": actionBoxConfig.value.calloutText,
					"callout-theme": actionBoxConfig.value.calloutTheme,
					"onClick:button": onClickEmptyStateButton
				}, null, 8, [
					"heading",
					"description",
					"button-text",
					"button-disabled",
					"callout-text",
					"callout-theme"
				])], 2)) : (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.cardsContainer)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(communityNodesStore).getInstalledPackages, (communityPackage) => {
					return openBlock(), createBlock(CommunityPackageCard_default, {
						key: communityPackage.packageName,
						"community-package": communityPackage
					}, null, 8, ["community-package"]);
				}), 128))], 2))
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1j2yb_1",
	headingContainer: "_headingContainer_1j2yb_9",
	loadingContainer: "_loadingContainer_1j2yb_14",
	actionBoxContainer: "_actionBoxContainer_1j2yb_19",
	cardsContainer: "_cardsContainer_1j2yb_23"
} }]]);
//#endregion
export { SettingsCommunityNodesView_default as default };
