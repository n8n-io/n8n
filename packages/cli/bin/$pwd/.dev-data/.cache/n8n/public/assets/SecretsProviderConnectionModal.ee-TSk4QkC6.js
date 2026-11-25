import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { AN as i18n, Cg as isComponentPublicInstance, Cm as useRBACStore, Jg as useUIStore, Kj as N8nNotice_default, LM as N8nCallout_default, PA as useMessage, SN as _plugin_vue_export_helper_default, Yj as N8nMenuItem_default, _N as N8nText_default, cN as Input_default, dC as useToast, ex as DELETE_SECRETS_PROVIDER_MODAL_KEY, fN as N8nTooltip_default, gM as N8nInputLabel_default, jM as createEventBus, jN as useI18n, mM as N8nOption_default, nD as getResourcePermissions, pE as SECRETS_PROVIDER_KEY_REGEX, pM as N8nSelect_default, px as SECRETS_PROVIDER_CONNECTION_MODAL_KEY, tM as N8nInfoTip_default, tN as N8nLoading_default, vN as N8nIconButton_default, vm as useProjectsStore, xN as N8nIcon_default, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as ParameterInputExpanded_default } from "./ParameterInputExpanded-COHgQvjR.js";
import { t as useSecretsProviderConnection } from "./useSecretsProviderConnection.ee-CxOA3MoQ.js";
import { t as Banner_default } from "./Banner-DceNkpG_.js";
import { t as SaveButton_default } from "./SaveButton-B2zcJp0p.js";
import { t as SecretsProviderImage_ee_default } from "./SecretsProviderImage.ee-gN0QNXmC.js";
//#region src/features/integrations/secretsProviders.ee/composables/useConnectionModal.ee.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* High-level composable for managing the secrets provider connection modal.
* Handles modal state, validation, user feedback, and orchestrates API calls.
*/
function isValidConnectionName(name) {
	return SECRETS_PROVIDER_KEY_REGEX.test(name);
}
function useConnectionModal(options) {
	const { providerTypes } = options;
	const rbacStore = useRBACStore();
	const toast = useToast();
	const projectsStore = useProjectsStore();
	const providerKey = ref(options.providerKey?.value);
	const providerSecretsCount = ref(0);
	const connectionName = ref("");
	const originalConnectionName = ref("");
	const connectionNameBlurred = ref(false);
	const selectedProviderType = ref(void 0);
	const connectionSettings = ref({});
	const originalSettings = ref({});
	const isSaving = ref(false);
	const didSave = ref(false);
	const parameterValidationStates = ref({});
	const connection = useSecretsProviderConnection(options.projectId);
	function shouldDisplayProperty(property) {
		let visible = true;
		if (property.displayOptions?.show) visible = visible && Object.entries(property.displayOptions.show).every(([key, value]) => {
			return value?.includes(connectionSettings.value[key]);
		});
		if (property.displayOptions?.hide) visible = visible && !Object.entries(property.displayOptions.hide).every(([key, value]) => {
			return value?.includes(connectionSettings.value[key]);
		});
		return visible;
	}
	const projectIds = ref([]);
	const isSharedGlobally = ref(true);
	const originalProjectIds = ref([]);
	const originalIsSharedGlobally = ref(true);
	const connectionProjects = ref([]);
	watch(connectionProjects, async (projects) => {
		if (projects.length === 0) return;
		const projectId = projects[0].id;
		if (!projectsStore.projects.find((p) => p.id === projectId)) await projectsStore.fetchProject(projectId);
	}, { immediate: true });
	const sharedWithProjects = computed(() => {
		if (projectIds.value.length === 0) return [];
		return projectsStore.projects.filter((p) => projectIds.value.includes(p.id));
	});
	const hasProjectScope = (projectId, scope) => {
		return projectsStore.myProjects.find((p) => p.id === projectId)?.scopes?.includes(scope) ?? false;
	};
	const isScopedMode = computed(() => !!options.projectId);
	const connectionScopes = ref([]);
	const connectionPermissions = computed(() => {
		return getResourcePermissions(connectionScopes.value).externalSecretsProvider;
	});
	const isProjectOwned = computed(() => {
		if (!options.projectId) return false;
		return connectionProjects.value.find((p) => p.id === options.projectId)?.role === "secretsProviderConnection:owner";
	});
	const canCreateProjectScoped = computed(() => {
		if (!options.projectId) return false;
		return hasProjectScope(options.projectId, "externalSecretsProvider:create");
	});
	const canCreate = computed(() => rbacStore.hasScope("externalSecretsProvider:create") || canCreateProjectScoped.value);
	const canUpdate = computed(() => {
		if (isScopedMode.value) return connectionPermissions.value.update && isProjectOwned.value;
		return rbacStore.hasScope("externalSecretsProvider:update");
	});
	const canDelete = computed(() => {
		if (isScopedMode.value) return connectionPermissions.value.delete && isProjectOwned.value;
		return rbacStore.hasScope("externalSecretsProvider:delete");
	});
	const canShareGlobally = computed(() => {
		return rbacStore.hasScope("externalSecretsProvider:update");
	});
	const isEditMode = computed(() => !!providerKey.value);
	const providerTypeOptions = computed(() => providerTypes.value.map((type) => ({
		label: type.displayName,
		value: type.type
	})));
	const settingsUpdated = computed(() => {
		return Object.keys(connectionSettings.value).some((key) => {
			return connectionSettings.value[key] !== originalSettings.value[key];
		});
	});
	const scopeUpdated = computed(() => isSharedGlobally.value !== originalIsSharedGlobally.value || JSON.stringify(projectIds.value) !== JSON.stringify(originalProjectIds.value));
	const hasUnsavedChanges = computed(() => connectionName.value !== originalConnectionName.value || settingsUpdated.value || scopeUpdated.value);
	const requiredFieldsFilled = computed(() => {
		if (!selectedProviderType.value) return true;
		return selectedProviderType.value.properties?.filter((property) => property.required && shouldDisplayProperty(property)).every((property) => {
			const value = connectionSettings.value[property.name];
			return value !== void 0 && value !== null && value !== "";
		}) ?? true;
	});
	const hasValidationErrors = computed(() => {
		return Object.values(parameterValidationStates.value).some((isValid) => !isValid);
	});
	const normalizedConnectionSettings = computed(() => {
		return Object.entries(connectionSettings.value).reduce((acc, [key, value]) => {
			const property = selectedProviderType.value?.properties?.find((p) => p.name === key);
			if (property && shouldDisplayProperty(property)) acc[key] = value;
			return acc;
		}, {});
	});
	const isNameTaken = computed(() => {
		const name = connectionName.value.trim();
		return (options.existingProviderNames?.value ?? []).includes(name) && (!isEditMode.value || name !== originalConnectionName.value);
	});
	const isValidName = computed(() => {
		const name = connectionName.value.trim();
		return name.length > 0 && isValidConnectionName(name) && !isNameTaken.value;
	});
	const connectionNameError = computed(() => {
		const name = connectionName.value.trim();
		if (name.length === 0) return i18n.baseText("settings.secretsProviderConnections.modal.validation.connectionName.required");
		if (!isValidConnectionName(name)) return i18n.baseText("settings.secretsProviderConnections.modal.validation.connectionName.format");
		if (isNameTaken.value) return i18n.baseText("settings.secretsProviderConnections.modal.connectionName.unique");
		return null;
	});
	const canSave = computed(() => {
		if (!isValidName.value) return false;
		if (!selectedProviderType.value) return false;
		if (!(isEditMode.value ? canUpdate.value : canCreate.value)) return false;
		if (hasValidationErrors.value) return false;
		return requiredFieldsFilled.value && (projectIds.value.length > 0 || isSharedGlobally.value) && (settingsUpdated.value || scopeUpdated.value || !isEditMode.value);
	});
	const expressionExample = computed(() => {
		if (!originalConnectionName.value) return "";
		return `{{ $secrets.${originalConnectionName.value}.secret_name }}`;
	});
	function initializeSettings(providerType) {
		const initialSettings = {};
		providerType.properties?.forEach((property) => {
			if (property.default !== void 0 && property.default !== "") initialSettings[property.name] = property.default;
		});
		connectionSettings.value = initialSettings;
	}
	function updateSettings(name, value) {
		connectionSettings.value = {
			...connectionSettings.value,
			[name]: value
		};
	}
	function setParameterValidationState(propertyName, el) {
		if (!isComponentPublicInstance(el) || !("displaysIssues" in el)) return;
		parameterValidationStates.value[propertyName] = !el.displaysIssues;
	}
	function selectProviderType(providerTypeKey) {
		const provider = providerTypes.value.find((type) => type.type === providerTypeKey);
		if (!provider) return;
		selectedProviderType.value = provider;
		initializeSettings(provider);
	}
	async function loadConnection() {
		if (!providerKey.value) return;
		try {
			const { name, type, state, settings, projects, secretsCount, scopes } = await connection.getConnection(providerKey.value);
			connectionName.value = name;
			originalConnectionName.value = name;
			connectionNameBlurred.value = true;
			connectionSettings.value = { ...settings };
			originalSettings.value = { ...settings };
			providerSecretsCount.value = secretsCount;
			connectionProjects.value = projects ?? [];
			projectIds.value = (projects ?? []).map((p) => p.id);
			isSharedGlobally.value = projectIds.value.length === 0;
			originalProjectIds.value = [...projectIds.value];
			originalIsSharedGlobally.value = isSharedGlobally.value;
			if (scopes) connectionScopes.value = scopes;
			selectedProviderType.value = providerTypes.value.find((providerType) => providerType.type === type);
			connection.setConnectionState(state);
			if (canUpdate.value) await connection.testConnection(providerKey.value);
		} catch (error) {
			toast.showError(error, i18n.baseText("generic.error"), { message: error?.response?.data?.data.error });
		}
	}
	/**
	* Creates a new secrets provider connection
	*/
	async function createNewConnection() {
		if (!selectedProviderType.value) return false;
		const scopeProjectIds = isSharedGlobally.value ? [] : projectIds.value.slice(0, 1);
		const connectionData = {
			providerKey: connectionName.value.trim(),
			type: selectedProviderType.value.type,
			settings: normalizedConnectionSettings.value,
			projectIds: scopeProjectIds
		};
		const { secretsCount, scopes, projects } = await connection.createConnection(connectionData);
		providerKey.value = connectionName.value.trim();
		providerSecretsCount.value = secretsCount;
		if (scopes) connectionScopes.value = scopes;
		if (projects) connectionProjects.value = projects;
		originalSettings.value = { ...connectionSettings.value };
		originalConnectionName.value = connectionName.value.trim();
		originalProjectIds.value = [...projectIds.value];
		originalIsSharedGlobally.value = isSharedGlobally.value;
		if (providerKey.value) await connection.testConnection(providerKey.value);
		return true;
	}
	/**
	* Updates an existing secrets provider connection
	*/
	async function updateExistingConnection() {
		if (!providerKey.value || !selectedProviderType.value) return false;
		const scopeProjectIds = isSharedGlobally.value ? [] : projectIds.value.slice(0, 1);
		const updateData = {
			isGlobal: isSharedGlobally.value,
			settings: normalizedConnectionSettings.value,
			projectIds: scopeProjectIds
		};
		const hasSettingsChanges = settingsUpdated.value;
		const { secretsCount, projects, scopes, state } = await connection.updateConnection(providerKey.value, updateData);
		providerSecretsCount.value = secretsCount;
		if (scopes) connectionScopes.value = scopes;
		if (state) connection.setConnectionState(state);
		originalSettings.value = { ...connectionSettings.value };
		originalConnectionName.value = connectionName.value.trim();
		originalProjectIds.value = [...projectIds.value];
		isSharedGlobally.value = projects.length === 0;
		originalIsSharedGlobally.value = projects.length === 0;
		if (hasSettingsChanges && providerKey.value) await connection.testConnection(providerKey.value);
		return true;
	}
	function setScopeState(newProjectIds, newIsSharedGlobally) {
		projectIds.value = newProjectIds.slice(0, 1);
		isSharedGlobally.value = newIsSharedGlobally;
	}
	/**
	* Initialize the modal with project scope when creating from a project context
	*/
	function initializeProjectScope() {
		if (!providerKey.value && options.projectId) {
			const project = projectsStore.myProjects.find((p) => p.id === options.projectId);
			projectIds.value = [options.projectId];
			isSharedGlobally.value = false;
			originalProjectIds.value = [options.projectId];
			originalIsSharedGlobally.value = false;
			if (project?.name) connectionProjects.value = [{
				id: project.id,
				name: project.name
			}];
		}
	}
	initializeProjectScope();
	/**
	* Saves the connection (creates new or updates existing)
	*/
	async function saveConnection() {
		if (!selectedProviderType.value || !canSave.value) return false;
		if (!(isEditMode.value ? canUpdate.value : canCreate.value)) {
			toast.showError(new Error(i18n.baseText("generic.missing.permissions")), i18n.baseText("generic.error"), { message: i18n.baseText("generic.missing.permissions") });
			return false;
		}
		isSaving.value = true;
		try {
			const success = isEditMode.value ? await updateExistingConnection() : await createNewConnection();
			if (success) didSave.value = true;
			return success;
		} catch (error) {
			toast.showError(error, i18n.baseText("generic.error"), { message: error?.response?.data?.data.error });
			return false;
		} finally {
			isSaving.value = false;
		}
	}
	return {
		providerSecretsCount,
		providerKey,
		connectionName,
		connectionNameBlurred,
		originalConnectionName,
		selectedProviderType,
		connectionSettings,
		isSaving,
		didSave,
		connection,
		projectIds,
		isSharedGlobally,
		connectionProjects,
		sharedWithProjects,
		canUpdate,
		canDelete,
		canShareGlobally,
		isScopedMode,
		isReadOnly: computed(() => {
			return isScopedMode.value && isEditMode.value && !canUpdate.value;
		}),
		setScopeState,
		isEditMode,
		providerTypeOptions,
		hasUnsavedChanges,
		hasValidationErrors,
		canSave,
		expressionExample,
		isValidName,
		connectionNameError,
		scopeUpdated,
		updateSettings,
		selectProviderType,
		loadConnection,
		saveConnection,
		shouldDisplayProperty,
		setParameterValidationState
	};
}
//#endregion
//#region src/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionModal.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { key: 1 };
var _hoisted_3 = ["disabled"];
var _hoisted_4 = { class: "mb-l" };
var _hoisted_5 = { class: "mb-l" };
var SecretsProviderConnectionModal_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SecretsProviderConnectionModal.ee",
	props: {
		modalName: {},
		data: { default: () => ({ activeTab: "connection" }) }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const { confirm } = useMessage();
		const eventBus = createEventBus();
		const projectsStore = useProjectsStore();
		const uiStore = useUIStore();
		const settingsStore = useSettingsStore();
		const LABEL_SIZE = { size: "medium" };
		const internalActiveTab = ref(props.data?.activeTab ?? "connection");
		const contentArea = ref();
		const providerTypes = computed(() => props.data.providerTypes ?? []);
		const modal = useConnectionModal({
			providerTypes,
			providerKey: computed(() => props.data.providerKey ?? ""),
			existingProviderNames: computed(() => props.data.existingProviderNames ?? []),
			projectId: computed(() => props.data.projectId).value
		});
		const tabNavigationEnabled = (settingsStore.moduleSettings["external-secrets"]?.forProjects ?? false) && modal.canShareGlobally.value;
		const ACTIVE_TAB = computed({
			get: () => tabNavigationEnabled ? internalActiveTab.value : "connection",
			set: (value) => {
				if (tabNavigationEnabled) internalActiveTab.value = value;
			}
		});
		const sidebarItems = computed(() => {
			return [{
				id: "connection",
				label: i18n.baseText("settings.secretsProviderConnections.modal.items.connection"),
				position: "top"
			}, {
				id: "sharing",
				label: i18n.baseText("settings.secretsProviderConnections.modal.items.scope"),
				position: "top"
			}];
		});
		const scopeOptions = computed(() => {
			const options = [{
				value: "",
				label: i18n.baseText("settings.secretsProviderConnections.modal.scope.global"),
				icon: {
					type: "icon",
					value: "globe"
				}
			}];
			options.push(...projectsStore.teamProjects.map((project) => {
				const icon = project.icon ?? {
					type: "icon",
					value: "layer-group"
				};
				return {
					value: project.id,
					label: project.name ?? project.id,
					icon
				};
			}));
			return options;
		});
		const scopeSelectValue = computed(() => modal.isSharedGlobally.value ? "" : modal.projectIds.value[0] ?? "");
		const selectedScopeIcon = computed(() => {
			return scopeOptions.value.find((option) => option.value === scopeSelectValue.value)?.icon ?? {
				type: "icon",
				value: "globe"
			};
		});
		function handleScopeSelect(value) {
			if (value === "") modal.setScopeState([], true);
			else modal.setScopeState([value], false);
		}
		function handleConnectionNameUpdate(value) {
			modal.connectionName.value = value;
			modal.connectionNameBlurred.value = false;
		}
		function handleConnectionNameBlur() {
			modal.connectionNameBlurred.value = true;
		}
		function handleProviderTypeChange(providerType) {
			modal.selectProviderType(providerType);
		}
		function handleSettingChange(update) {
			modal.updateSettings(update.name, update.value);
		}
		async function handleSave() {
			await modal.saveConnection();
			if (contentArea.value) contentArea.value.scrollTop = 0;
		}
		function handleDelete() {
			if (!modal.providerKey.value) return;
			const deleteProjectId = modal.connectionProjects.value.length > 0 ? modal.connectionProjects.value[0].id : void 0;
			uiStore.openModalWithData({
				name: DELETE_SECRETS_PROVIDER_MODAL_KEY,
				data: {
					providerKey: modal.providerKey.value,
					providerName: modal.connectionName.value,
					secretsCount: modal.providerSecretsCount.value ?? 0,
					projectId: deleteProjectId,
					onConfirm: () => {
						props.data.onClose?.();
						eventBus.emit("close");
					}
				}
			});
		}
		async function handleBeforeClose() {
			if (modal.hasUnsavedChanges.value) {
				if (await confirm(i18n.baseText("settings.secretsProviderConnections.modal.unsavedChanges.text"), {
					title: i18n.baseText("settings.secretsProviderConnections.modal.unsavedChanges.title"),
					confirmButtonText: i18n.baseText("generic.keepEditing"),
					cancelButtonText: i18n.baseText("generic.close")
				}) === "confirm") return false;
			}
			props.data.onClose?.();
			return true;
		}
		onMounted(async () => {
			if (providerTypes.value.length === 0) return;
			if (modal.isEditMode.value) await Promise.all([modal.loadConnection()]);
		});
		return (_ctx, _cache) => {
			return providerTypes.value.length ? (openBlock(), createBlock(Modal_default, {
				key: 0,
				id: `${unref(SECRETS_PROVIDER_CONNECTION_MODAL_KEY)}-modal`,
				"custom-class": _ctx.$style.secretsProviderConnectionModal,
				"event-bus": unref(eventBus),
				name: unref(SECRETS_PROVIDER_CONNECTION_MODAL_KEY),
				"before-close": handleBeforeClose,
				width: "70%",
				height: "80%"
			}, {
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.info) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.icon) }, [unref(modal).selectedProviderType.value ? (openBlock(), createBlock(SecretsProviderImage_ee_default, {
					key: 0,
					provider: unref(modal).selectedProviderType.value,
					class: normalizeClass(_ctx.$style.headerIcon)
				}, null, 8, ["provider", "class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "vault",
					width: "24",
					height: "24"
				}))], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.name) }, [unref(modal).providerKey.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "large",
					class: normalizeClass(_ctx.$style.providerName),
					title: unref(modal).providerKey.value
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(modal).providerKey.value), 1)]),
					_: 1
				}, 8, ["class", "title"])) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
					size: unref(modal).providerKey.value ? "small" : "large",
					color: unref(modal).providerKey.value ? "text-light" : "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(modal).selectedProviderType.value?.displayName ?? unref(i18n).baseText("settings.secretsProviderConnections.modal.providerType.placeholder")), 1)]),
					_: 1
				}, 8, ["size", "color"])], 2)], 2), !unref(modal).isReadOnly.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actions)
				}, [createVNode(unref(N8nTooltip_default), { placement: "left" }, {
					content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.delete")), 1)]),
					default: withCtx(() => [unref(modal).isEditMode.value && unref(modal).canDelete.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
						key: 0,
						title: unref(i18n).baseText("generic.delete"),
						icon: "trash-2",
						variant: "ghost",
						disabled: unref(modal).isSaving.value,
						"data-test-id": "secrets-provider-delete-button",
						onClick: handleDelete
					}, null, 8, ["title", "disabled"])) : createCommentVNode("", true)]),
					_: 1
				}), createVNode(SaveButton_default, {
					saved: !unref(modal).hasUnsavedChanges.value && unref(modal).isEditMode.value,
					"is-saving": unref(modal).isSaving.value,
					disabled: !unref(modal).canSave.value,
					"saving-label": unref(i18n).baseText("settings.secretsProviderConnections.modal.saving"),
					"data-test-id": "secrets-provider-connection-save-button",
					onClick: handleSave
				}, null, 8, [
					"saved",
					"is-saving",
					"disabled",
					"saving-label"
				])], 2)) : createCommentVNode("", true)], 2)]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [unref(tabNavigationEnabled) ? (openBlock(), createElementBlock("nav", {
					key: 0,
					class: normalizeClass(_ctx.$style.sidebar)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(sidebarItems.value, (item) => {
					return openBlock(), createBlock(unref(N8nMenuItem_default), {
						key: item.id,
						item,
						active: ACTIVE_TAB.value === item.id,
						"data-test-id": `sidebar-item-${item.id}`,
						onClick: ($event) => ACTIVE_TAB.value = item.id
					}, null, 8, [
						"item",
						"active",
						"data-test-id",
						"onClick"
					]);
				}), 128))], 2)) : createCommentVNode("", true), createBaseVNode("div", {
					ref_key: "contentArea",
					ref: contentArea,
					class: normalizeClass(_ctx.$style.contentArea)
				}, [unref(modal).connection.isLoading.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nLoading_default), {
					variant: "p",
					rows: 4
				})])) : (openBlock(), createElementBlock("div", _hoisted_2, [ACTIVE_TAB.value === "connection" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.mainContent)
				}, [createBaseVNode("div", null, [
					unref(modal).isReadOnly.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						class: "mb-l",
						"data-test-id": "secrets-provider-read-only-notice",
						content: unref(i18n).baseText(unref(modal).isSharedGlobally.value && unref(modal).canShareGlobally.value ? "settings.secretsProviderConnections.modal.readOnly.notice.admin" : "settings.secretsProviderConnections.modal.readOnly.notice.noPermission")
					}, null, 8, ["content"])) : createCommentVNode("", true),
					unref(modal).connection.connectionState.value === "connected" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "success",
						class: "mb-l",
						"data-test-id": "connection-success-callout"
					}, {
						default: withCtx(() => [createBaseVNode("div", null, [
							createBaseVNode("p", null, toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.modal.testConnection.success.serviceEnabled", { interpolate: {
								count: unref(modal).providerSecretsCount.value,
								providerName: unref(modal).connectionName.value
							} })), 1),
							createBaseVNode("p", null, toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.modal.testConnection.success.reference")), 1),
							createBaseVNode("code", { class: normalizeClass(_ctx.$style.expressionExample) }, toDisplayString(unref(modal).expressionExample.value), 3)
						])]),
						_: 1
					})) : unref(modal).connection.connectionState.value === "error" ? (openBlock(), createBlock(Banner_default, {
						key: 2,
						class: "mb-l",
						"data-test-id": "connection-error-banner",
						theme: "danger",
						message: unref(i18n).baseText("settings.secretsProviderConnections.modal.testConnection.error"),
						details: unref(modal).connection.connectionError.value
					}, null, 8, ["message", "details"])) : createCommentVNode("", true),
					createBaseVNode("fieldset", { disabled: unref(modal).isReadOnly.value }, [
						createBaseVNode("div", _hoisted_4, [
							createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("settings.secretsProviderConnections.modal.connectionName") }, null, 8, ["label"]),
							createVNode(unref(Input_default), {
								"data-test-id": "provider-name",
								"model-value": unref(modal).connectionName.value,
								readonly: unref(modal).isEditMode.value,
								disabled: unref(modal).isEditMode.value,
								"aria-required": "true",
								placeholder: "myVault",
								"onUpdate:modelValue": handleConnectionNameUpdate,
								onBlur: handleConnectionNameBlur
							}, null, 8, [
								"model-value",
								"readonly",
								"disabled"
							]),
							unref(modal).connectionNameError.value && unref(modal).connectionNameBlurred.value && !unref(modal).isEditMode.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								size: "small",
								color: "danger",
								class: normalizeClass(_ctx.$style.headerHint)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(modal).connectionNameError.value), 1)]),
								_: 1
							}, 8, ["class"])) : !unref(modal).isEditMode.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "text-light",
								class: normalizeClass(_ctx.$style.headerHint)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.modal.connectionName.hint")), 1)]),
								_: 1
							}, 8, ["class"])) : createCommentVNode("", true)
						]),
						createBaseVNode("div", _hoisted_5, [createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("settings.secretsProviderConnections.modal.providerType") }, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
							"data-test-id": "provider-type-select",
							"model-value": unref(modal).selectedProviderType.value?.type,
							disabled: unref(modal).isEditMode.value,
							"onUpdate:modelValue": handleProviderTypeChange
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(modal).providerTypeOptions.value, (option) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: option.value,
									label: option.label,
									value: option.value
								}, null, 8, ["label", "value"]);
							}), 128))]),
							_: 1
						}, 8, ["model-value", "disabled"])]),
						(openBlock(true), createElementBlock(Fragment, null, renderList(unref(modal).selectedProviderType.value?.properties, (property) => {
							return withDirectives((openBlock(), createElementBlock("form", {
								key: property.name,
								autocomplete: "off",
								onSubmit: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"]))
							}, [property.type === "notice" ? (openBlock(), createBlock(unref(N8nNotice_default), {
								key: 0,
								content: property.displayName
							}, null, 8, ["content"])) : (openBlock(), createBlock(ParameterInputExpanded_default, {
								key: 1,
								ref_for: true,
								ref: (el) => unref(modal).setParameterValidationState(property.name, el),
								class: "mb-l",
								parameter: property,
								value: unref(modal).connectionSettings.value[property.name],
								label: LABEL_SIZE,
								"event-source": "secrets-provider-connection",
								onUpdate: handleSettingChange
							}, null, 8, ["parameter", "value"]))], 32)), [[vShow, unref(modal).shouldDisplayProperty(property)]]);
						}), 128))
					], 8, _hoisted_3)
				])], 2)) : createCommentVNode("", true), ACTIVE_TAB.value === "sharing" && unref(modal).isEditMode ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.mainContent)
				}, [createBaseVNode("div", null, [createVNode(unref(N8nInfoTip_default), {
					bold: false,
					class: "mb-s"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.modal.scope.info")), 1)]),
					_: 1
				}), createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("settings.secretsProviderConnections.modal.scope.label") }, {
					default: withCtx(() => [createVNode(unref(N8nSelect_default), {
						"model-value": scopeSelectValue.value,
						size: "large",
						filterable: "",
						disabled: !unref(modal).canUpdate.value || unref(modal).isScopedMode.value,
						"data-test-id": "secrets-provider-scope-select",
						"onUpdate:modelValue": handleScopeSelect
					}, {
						prefix: withCtx(() => [selectedScopeIcon.value?.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							color: "text-light",
							class: normalizeClass(_ctx.$style.menuItemEmoji)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(selectedScopeIcon.value.value), 1)]),
							_: 1
						}, 8, ["class"])) : selectedScopeIcon.value?.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 1,
							color: "text-light",
							icon: selectedScopeIcon.value.value
						}, null, 8, ["icon"])) : createCommentVNode("", true)]),
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(scopeOptions.value, (option) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: option.value || "global",
								value: option.value,
								label: option.label,
								class: normalizeClass({ [_ctx.$style.globalOption]: option.value === "" && scopeOptions.value.length > 1 })
							}, {
								default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [option.icon?.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									class: normalizeClass(_ctx.$style.menuItemEmoji)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(option.icon.value), 1)]),
									_: 2
								}, 1032, ["class"])) : option.icon?.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
									key: 1,
									icon: option.icon.value
								}, null, 8, ["icon"])) : createCommentVNode("", true), createBaseVNode("span", null, toDisplayString(option.label), 1)], 2)]),
								_: 2
							}, 1032, [
								"value",
								"label",
								"class"
							]);
						}), 128))]),
						_: 1
					}, 8, ["model-value", "disabled"])]),
					_: 1
				}, 8, ["label"])])], 2)) : createCommentVNode("", true)]))], 2)], 2)]),
				_: 1
			}, 8, [
				"id",
				"custom-class",
				"event-bus",
				"name"
			])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	secretsProviderConnectionModal: "_secretsProviderConnectionModal_nly5q_1",
	mainContent: "_mainContent_nly5q_16",
	icon: "_icon_nly5q_22",
	name: "_name_nly5q_31",
	providerName: "_providerName_nly5q_37",
	headerHint: "_headerHint_nly5q_43",
	modalLayout: "_modalLayout_nly5q_48",
	sidebar: "_sidebar_nly5q_54",
	header: "_header_nly5q_43",
	container: "_container_nly5q_68",
	info: "_info_nly5q_73",
	actions: "_actions_nly5q_82",
	contentArea: "_contentArea_nly5q_93",
	expressionExample: "_expressionExample_nly5q_99",
	optionContent: "_optionContent_nly5q_104",
	menuItemEmoji: "_menuItemEmoji_nly5q_110",
	globalOption: "_globalOption_nly5q_115"
} }]]);
//#endregion
export { SecretsProviderConnectionModal_ee_default as default };
