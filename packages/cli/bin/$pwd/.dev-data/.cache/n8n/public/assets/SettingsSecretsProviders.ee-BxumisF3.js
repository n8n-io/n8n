import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Kf as toRef, Lf as markRaw, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Zd as h, _f as resolveDirective, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, ua as DateTime, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Cm as useRBACStore, Eg as isDateObject, Ij as SettingsRowGroup_default, Jg as useUIStore, Kd as useDocumentTitle, NM as N8nCard_default, PA as useMessage, Rj as SettingsEnableRow_default, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, VA as isIconOrEmoji, YM as N8nActionToggle_default, _N as N8nText_default, aw as updateExternalSecretsSettings, bC as useRootStore, dC as useToast, ex as DELETE_SECRETS_PROVIDER_MODAL_KEY, f as usePrefetchModals, fN as N8nTooltip_default, hM as N8nLink_default, hm as splitName, jN as useI18n, nN as N8nBadge_default, px as SECRETS_PROVIDER_CONNECTION_MODAL_KEY, tN as N8nLoading_default, vm as useProjectsStore, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { t as useSecretsProvidersList } from "./useSecretsProvidersList.ee-DVnqZaqI.js";
import { t as useSecretsProviderConnection } from "./useSecretsProviderConnection.ee-CxOA3MoQ.js";
import { t as SecretsProviderImage_ee_default } from "./SecretsProviderImage.ee-gN0QNXmC.js";
//#region src/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionCard.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "secrets-provider-display-name" };
var _hoisted_2$1 = { "data-test-id": "secrets-provider-secrets-count" };
var _hoisted_3$1 = { "data-test-id": "secrets-provider-created-at" };
var _hoisted_4$1 = { key: 1 };
var SecretsProviderConnectionCard_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SecretsProviderConnectionCard.ee",
	props: {
		provider: {},
		providerTypeInfo: {},
		project: {},
		canUpdate: { type: Boolean }
	},
	emits: [
		"edit",
		"share",
		"reload",
		"delete",
		"activate"
	],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const rbacStore = useRBACStore();
		const projectsStore = useProjectsStore();
		const isProjectScopedSecretsEnabled = useSettingsStore().moduleSettings["external-secrets"]?.forProjects ?? false;
		const props = __props;
		const emit = __emit;
		const provider = toRef(props, "provider");
		const providerTypeInfo = toRef(props, "providerTypeInfo");
		const formattedDate = computed(() => {
			return DateTime.fromISO(isDateObject(provider.value.createdAt) ? provider.value.createdAt.toISOString() : provider.value.createdAt || (/* @__PURE__ */ new Date()).toISOString()).toFormat("dd LLL yyyy");
		});
		const showDisconnectedBadge = computed(() => {
			return provider.value.state === "error";
		});
		const isDisabled = computed(() => provider.value.isEnabled === false);
		const canDelete = computed(() => {
			if (rbacStore.hasScope("externalSecretsProvider:delete")) return true;
			if (provider.value.projects.length > 0) return provider.value.projects.every((p) => {
				return projectsStore.myProjects.find((mp) => mp.id === p.id)?.scopes?.includes("externalSecretsProvider:delete") ?? false;
			});
			return false;
		});
		const canSync = computed(() => {
			if (rbacStore.hasScope("externalSecretsProvider:sync")) return true;
			if (provider.value.projects.length > 0) return provider.value.projects.every((p) => {
				return projectsStore.myProjects.find((mp) => mp.id === p.id)?.scopes?.includes("externalSecretsProvider:sync") ?? false;
			});
			return false;
		});
		const isGlobal = computed(() => provider.value.projects.length === 0);
		const projectName = computed(() => {
			if (props.project) {
				const { name, email } = splitName(props.project.name ?? void 0);
				return name ?? email ?? "";
			}
			return "";
		});
		const badgeIcon = computed(() => {
			if (isGlobal.value) return {
				type: "icon",
				value: "globe"
			};
			return isIconOrEmoji(props.project?.icon) ? props.project.icon : {
				type: "icon",
				value: "layers"
			};
		});
		const badgeTooltip = computed(() => {
			if (isGlobal.value) return i18n.baseText("settings.secretsProviderConnections.badge.tooltip.global");
			return i18n.baseText("settings.secretsProviderConnections.badge.tooltip.project", { interpolate: { projectName: projectName.value } });
		});
		const actionDropdownOptions = computed(() => {
			if (!props.canUpdate) return [];
			const options = [{
				label: i18n.baseText("generic.edit"),
				value: "edit"
			}];
			if (isDisabled.value) options.push({
				label: i18n.baseText("generic.activate"),
				value: "activate"
			});
			if (isProjectScopedSecretsEnabled) options.push({
				label: i18n.baseText("settings.secretsProviderConnections.actions.share"),
				value: "share"
			});
			if (provider.value.state === "connected" && canSync.value && !isDisabled.value) options.push({
				label: i18n.baseText("settings.externalSecrets.card.actionDropdown.reload"),
				value: "reload"
			});
			if (canDelete.value) options.push({
				label: i18n.baseText("generic.delete"),
				value: "delete"
			});
			return options;
		});
		function onAction(action) {
			if (action === "edit") emit("edit", provider.value.name);
			else if (action === "activate") emit("activate", provider.value.name);
			else if (action === "share") emit("share", provider.value.name);
			else if (action === "reload") emit("reload", provider.value.name);
			else if (action === "delete") emit("delete", provider.value.name);
		}
		return (_ctx, _cache) => {
			const _directive_n8n_truncate = resolveDirective("n8n-truncate");
			return openBlock(), createBlock(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, createSlots({
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerContainer) }, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					bold: "",
					"data-test-id": "secrets-provider-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(provider.value.name), 1)]),
					_: 1
				}), isDisabled.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					variant: "outline",
					size: "xsmall",
					"data-test-id": "disabled-badge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.state.disabled")), 1)]),
					_: 1
				})) : showDisconnectedBadge.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 1,
					variant: "warning",
					size: "xsmall",
					"data-test-id": "disconnected-badge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.state.disconnected")), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2)]),
				default: withCtx(() => [createVNode(unref(N8nText_default), {
					class: "pb-4xs",
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [
						createBaseVNode("span", _hoisted_1$1, toDisplayString(providerTypeInfo.value?.displayName ?? provider.value.type), 1),
						_cache[0] || (_cache[0] = createTextVNode(" | ", -1)),
						createBaseVNode("span", _hoisted_2$1, toDisplayString(unref(i18n).baseText("settings.externalSecrets.card.secretsCount", {
							interpolate: { count: provider.value.secretsCount },
							adjustToNumber: provider.value.secretsCount
						})), 1),
						_cache[1] || (_cache[1] = createTextVNode(" | ", -1)),
						createBaseVNode("span", _hoisted_3$1, toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.card.createdAt", { interpolate: { date: formattedDate.value } })), 1)
					]),
					_: 1
				})]),
				append: withCtx(() => [!isDisabled.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.cardBadge),
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(badgeTooltip.value), 1)]),
					default: withCtx(() => [createVNode(unref(N8nBadge_default), {
						class: normalizeClass(_ctx.$style.badge),
						variant: "outline",
						"data-test-id": isGlobal.value ? "secrets-provider-global-badge" : "secrets-provider-project-badge"
					}, {
						default: withCtx(() => [createVNode(ProjectIcon_default, {
							icon: badgeIcon.value,
							"border-less": true,
							size: "mini"
						}, null, 8, ["icon"]), !isGlobal.value ? withDirectives((openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.nowrap)
						}, [createTextVNode(toDisplayString(projectName.value), 1)], 2)), [[
							_directive_n8n_truncate,
							projectName.value,
							"20"
						]]) : (openBlock(), createElementBlock("span", _hoisted_4$1, toDisplayString(unref(i18n).baseText("projects.badge.global")), 1))]),
						_: 1
					}, 8, ["class", "data-test-id"])]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createVNode(unref(N8nActionToggle_default), {
					actions: actionDropdownOptions.value,
					"data-test-id": "secrets-provider-action-toggle",
					onAction
				}, null, 8, ["actions"])]),
				_: 2
			}, [providerTypeInfo.value ? {
				name: "prepend",
				fn: withCtx(() => [createVNode(SecretsProviderImage_ee_default, {
					class: normalizeClass(_ctx.$style.providerImage),
					provider: providerTypeInfo.value,
					"data-test-id": "secrets-provider-image"
				}, null, 8, ["class", "provider"])]),
				key: "0"
			} : void 0]), 1032, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1rkda_2",
	providerImage: "_providerImage_1rkda_13",
	headerContainer: "_headerContainer_1rkda_18",
	cardBadge: "_cardBadge_1rkda_24",
	badge: "_badge_1rkda_28",
	nowrap: "_nowrap_1rkda_42"
} }]]);
//#endregion
//#region src/features/integrations/secretsProviders.ee/components/SecretsProvidersEmptyState.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/integrations/secretsProviders.ee/components/SecretsProvidersEmptyState.ee.vue
var SecretsProvidersEmptyState_ee_default = /* @__PURE__ */ defineComponent({
	__name: "SecretsProvidersEmptyState.ee",
	props: {
		providerTypes: {},
		canCreate: { type: Boolean }
	},
	emits: ["addSecretsStore"],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const providerTypes = toRef(__props, "providerTypes");
		const supportedProviders = computed(() => providerTypes.value ?? []);
		const emit = __emit;
		const emptyStateIcon = computed(() => ({
			type: "cards",
			center: "vault",
			sides: supportedProviders.value.map((provider) => markRaw(() => h(SecretsProviderImage_ee_default, { provider })))
		}));
		function onAddSecretsStore() {
			emit("addSecretsStore");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nEmptyState_default), {
				class: "mt-2xl mb-l",
				"data-test-id": "secrets-provider-connections-empty-state",
				icon: emptyStateIcon.value,
				heading: unref(i18n).baseText("settings.secretsProviderConnections.emptyState.heading"),
				description: unref(i18n).baseText("settings.secretsProviderConnections.emptyState.description")
			}, {
				additionalContent: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					class: "mr-2xs n8n-button--highlight",
					href: unref(i18n).baseText("settings.externalSecrets.docs"),
					target: "_blank",
					"data-test-id": "secrets-provider-connections-learn-more"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")) + " ", 1), createVNode(unref(N8nIcon_default), { icon: "arrow-up-right" })]),
					_: 1
				}, 8, ["href"]), __props.canCreate ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					onClick: onAddSecretsStore
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.buttons.addSecretsStore")), 1)]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"icon",
				"heading",
				"description"
			]);
		};
	}
});
//#endregion
//#region src/features/integrations/secretsProviders.ee/views/SettingsSecretsProviders.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = {
	key: 0,
	"data-test-id": "secrets-provider-connections-content-licensed"
};
var _hoisted_2 = {
	key: 0,
	"data-test-id": "secrets-providers-loading"
};
var _hoisted_3 = { key: 2 };
var _hoisted_4 = ["href"];
var SettingsSecretsProviders_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsSecretsProviders.ee",
	setup(__props) {
		const i18n = useI18n();
		const secretsProviders = useSecretsProvidersList();
		const projectsStore = useProjectsStore();
		const settingsStore = useSettingsStore();
		const rootStore = useRootStore();
		const toast = useToast();
		const message = useMessage();
		const documentTitle = useDocumentTitle();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const uiStore = useUIStore();
		usePrefetchModals([SECRETS_PROVIDER_CONNECTION_MODAL_KEY, DELETE_SECRETS_PROVIDER_MODAL_KEY], { enabled: () => secretsProviders.isEnterpriseExternalSecretsEnabled.value });
		const secretsProviderConnection = useSecretsProviderConnection(projectsStore.currentProjectId);
		const hasActiveProviders = computed(() => secretsProviders.activeProviders.value.length > 0);
		const externalSecretsModuleSettings = computed(() => settingsStore.moduleSettings["external-secrets"]);
		const isRoleBasedAccessEnabled = computed(() => externalSecretsModuleSettings.value?.roleBasedAccess ?? false);
		const systemRolesEnabled = ref(false);
		const systemRolesToggleLoading = ref(false);
		async function onSystemRolesToggle(enabled) {
			if (!enabled) {
				if (await message.confirm(i18n.baseText("settings.externalSecrets.systemRoles.confirm.message"), i18n.baseText("settings.externalSecrets.systemRoles.confirm.headline"), {
					confirmButtonText: i18n.baseText("settings.externalSecrets.systemRoles.confirm.confirmButtonText"),
					cancelButtonText: i18n.baseText("settings.externalSecrets.systemRoles.confirm.cancelButtonText")
				}) !== "confirm") return;
			}
			systemRolesToggleLoading.value = true;
			try {
				const response = await updateExternalSecretsSettings(rootStore.restApiContext, { systemRolesEnabled: enabled });
				systemRolesEnabled.value = response.systemRolesEnabled;
				await settingsStore.getModuleSettings();
				toast.showMessage({
					title: enabled ? i18n.baseText("settings.externalSecrets.systemRoles.enabled.toast") : i18n.baseText("settings.externalSecrets.systemRoles.disabled.toast"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.externalSecrets.systemRoles.error"));
			} finally {
				systemRolesToggleLoading.value = false;
			}
		}
		const sortedProviders = computed(() => {
			return [...secretsProviders.activeProviders.value].sort((a, b) => a.name.localeCompare(b.name));
		});
		function getProjectForProvider(provider) {
			if (!provider || provider.projects.length === 0) return null;
			return projectsStore.projects.find((p) => p.id === provider.projects[0].id) ?? null;
		}
		async function handleActivate(providerKey) {
			try {
				await secretsProviderConnection.activateConnection(providerKey);
				await secretsProviders.fetchConnection(providerKey);
				toast.showMessage({
					title: i18n.baseText("settings.secretsProviderConnections.actions.activate.success.title"),
					message: i18n.baseText("settings.secretsProviderConnections.actions.activate.success.description", { interpolate: { provider: providerKey } }),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.secretsProviderConnections.actions.activate.error.title"), { message: i18n.baseText("settings.secretsProviderConnections.actions.activate.error.description", { interpolate: { provider: providerKey } }) });
			}
		}
		function getProviderTypeInfo(providerType) {
			return secretsProviders.providerTypes.value.find((type) => type.type === providerType);
		}
		function openConnectionModal(providerKey, activeTab = "connection") {
			const existingNames = secretsProviders.activeProviders.value.map((provider) => provider.name);
			uiStore.openModalWithData({
				name: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
				data: {
					activeTab,
					providerKey,
					providerTypes: secretsProviders.providerTypes.value,
					existingProviderNames: existingNames,
					onClose: async () => {
						await secretsProviders.fetchActiveConnections();
					}
				}
			});
		}
		function handleCardClick(providerKey) {
			openConnectionModal(providerKey, "connection");
		}
		function handleEdit(providerKey) {
			openConnectionModal(providerKey, "connection");
		}
		function handleShare(providerKey) {
			openConnectionModal(providerKey, "sharing");
		}
		async function handleReload(providerKey) {
			try {
				if (!(await secretsProviderConnection.reloadConnection(providerKey)).success) {
					toast.showError(/* @__PURE__ */ new Error("Reload failed"), i18n.baseText("error"));
					return;
				}
				toast.showMessage({
					title: i18n.baseText("settings.externalSecrets.card.reload.success.title"),
					message: i18n.baseText("settings.externalSecrets.card.reload.success.description", { interpolate: { provider: providerKey } }),
					type: "success"
				});
				await secretsProviders.fetchConnection(providerKey);
			} catch (error) {
				toast.showError(error, i18n.baseText("error"));
			}
		}
		function handleDelete(providerKey) {
			const provider = secretsProviders.activeProviders.value.find((p) => p.name === providerKey);
			if (!provider) return;
			uiStore.openModalWithData({
				name: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: provider.name,
					providerName: provider.name,
					secretsCount: provider.secretsCount ?? 0,
					projectId: provider.projects.length > 0 ? provider.projects[0].id : void 0,
					onConfirm: async () => {
						await secretsProviders.fetchActiveConnections();
					}
				}
			});
		}
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.secretsProviderConnections.title"));
			if (!secretsProviders.isEnterpriseExternalSecretsEnabled.value) return;
			try {
				await Promise.all([
					secretsProviders.fetchProviderTypes(),
					secretsProviders.fetchActiveConnections(),
					projectsStore.getAllProjects()
				]);
			} catch (error) {
				toast.showError(error, i18n.baseText("error"));
			}
			systemRolesEnabled.value = externalSecretsModuleSettings.value?.systemRolesEnabled ?? false;
		});
		function goToUpgrade() {
			pageRedirectionHelper.goToUpgrade("external-secrets", "upgrade-external-secrets");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(["mb-xl", _ctx.$style.headerContainer]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [
				createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "2xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.title")), 1)]),
					_: 1
				}),
				unref(secretsProviders).isEnterpriseExternalSecretsEnabled.value && hasActiveProviders.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-base",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.description")) + " " + toDisplayString(unref(i18n).baseText("credentialResolver.view.learnMore")) + " ", 1), createVNode(unref(N8nLink_default), {
						theme: "text",
						href: unref(i18n).baseText("settings.externalSecrets.docs"),
						size: "medium",
						"new-window": ""
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.link) }, [createTextVNode(toDisplayString(unref(i18n).baseText("generic.documentation")) + " ", 1), createVNode(unref(N8nIcon_default), { icon: "arrow-up-right" })], 2)]),
						_: 1
					}, 8, ["href"])]),
					_: 1
				})) : createCommentVNode("", true),
				isRoleBasedAccessEnabled.value ? (openBlock(), createBlock(unref(SettingsRowGroup_default), {
					key: 1,
					class: "mt-xl",
					"data-test-id": "external-secrets-system-roles-toggle"
				}, {
					default: withCtx(() => [createVNode(unref(SettingsEnableRow_default), {
						title: unref(i18n).baseText("settings.externalSecrets.systemRoles.title"),
						description: unref(i18n).baseText("settings.externalSecrets.systemRoles.description"),
						enabled: systemRolesEnabled.value,
						disabled: systemRolesToggleLoading.value,
						"switch-test-id": "external-secrets-system-roles-switch",
						"onUpdate:enabled": onSystemRolesToggle
					}, null, 8, [
						"title",
						"description",
						"enabled",
						"disabled"
					])]),
					_: 1
				})) : createCommentVNode("", true),
				hasActiveProviders.value && unref(secretsProviders).canCreate.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					class: normalizeClass(_ctx.$style.addButton),
					variant: "solid",
					size: "small",
					onClick: _cache[0] || (_cache[0] = ($event) => openConnectionModal())
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "plus" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.buttons.addSecretsStore")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)
			], 2)], 2), unref(secretsProviders).isEnterpriseExternalSecretsEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_1, [unref(secretsProviders).isLoading.value && !hasActiveProviders.value ? (openBlock(), createElementBlock("div", _hoisted_2, [(openBlock(), createElementBlock(Fragment, null, renderList(3, (i) => {
				return createBaseVNode("div", {
					key: i,
					class: "mb-2xs"
				}, [createVNode(unref(N8nLoading_default), {
					variant: "p",
					rows: 1
				})]);
			}), 64))])) : !hasActiveProviders.value ? (openBlock(), createBlock(SecretsProvidersEmptyState_ee_default, {
				key: 1,
				"provider-types": unref(secretsProviders).providerTypes.value,
				"can-create": unref(secretsProviders).canCreate.value,
				onAddSecretsStore: _cache[1] || (_cache[1] = ($event) => openConnectionModal())
			}, null, 8, ["provider-types", "can-create"])) : (openBlock(), createElementBlock("div", _hoisted_3, [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedProviders.value, (provider) => {
				return openBlock(), createBlock(SecretsProviderConnectionCard_ee_default, {
					key: provider.name,
					class: "mb-2xs",
					provider,
					"provider-type-info": getProviderTypeInfo(provider.type),
					project: getProjectForProvider(provider),
					"can-update": unref(secretsProviders).canUpdate.value,
					onClick: ($event) => handleCardClick(provider.name),
					onEdit: handleEdit,
					onShare: handleShare,
					onReload: handleReload,
					onActivate: handleActivate,
					onDelete: handleDelete
				}, null, 8, [
					"provider",
					"provider-type-info",
					"project",
					"can-update",
					"onClick"
				]);
			}), 128))]))])) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				class: "mt-2xl mb-l",
				"data-test-id": "secrets-provider-connections-content-unlicensed",
				"button-text": unref(i18n).baseText("settings.externalSecrets.actionBox.buttonText"),
				onClick: goToUpgrade
			}, {
				heading: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.externalSecrets.actionBox.title")), 1)]),
				description: withCtx(() => [createVNode(unref(I18nT), {
					keypath: "settings.externalSecrets.actionBox.description",
					scope: "global"
				}, {
					link: withCtx(() => [createBaseVNode("a", {
						href: unref(i18n).baseText("settings.externalSecrets.docs"),
						target: "_blank"
					}, toDisplayString(unref(i18n).baseText("settings.externalSecrets.actionBox.description.link")), 9, _hoisted_4)]),
					_: 1
				})]),
				_: 1
			}, 8, ["button-text"]))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_wm73r_2",
	headerContainer: "_headerContainer_wm73r_8",
	headerTitle: "_headerTitle_wm73r_14",
	addButton: "_addButton_wm73r_20",
	link: "_link_wm73r_25"
} }]]);
//#endregion
export { SettingsSecretsProviders_ee_default as default };
