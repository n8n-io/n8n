import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Ar as require_startCase, Bd as createBlock, Df as withCtx, Eo as require_get, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Ck as mergeNodeProperties, Hm as getNodeCredentialForSelectedAuthType, Ik as deepCopy, Jk as CREDENTIAL_BLANKING_VALUE, Mp as useCredentialsStore, Pk as isExpression, Pp as isTestableExpression, SN as _plugin_vue_export_helper_default, Ul as hasAutomaticOAuthApp, Vm as getNodeAuthOptions, Wl as hasManagedOAuthApp, Ym as probeCredential, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, cN as Input_default, dM as N8nSwitch_default, dd as useNodeHelpers, gM as N8nInputLabel_default, jN as useI18n, kj as N8nSegmentControl_default, nD as getResourcePermissions, om as setParameterValue, uf as useNodeTypesStore, vm as useProjectsStore, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { a as extractTemplateMarkers, d as parseTemplatedAuthField, f as storedPlaceholderValue, l as parsePlaceholderDefs, n as cleanPlaceholderValue, o as isValidTemplateShape, r as composeCredentialNameWithUser, u as parsePlaceholderValues } from "./templatedAuth.utils-BSmmAPGQ.js";
import { t as ParameterInputExpanded_default } from "./ParameterInputExpanded-COHgQvjR.js";
import { t as CredentialInputs_default } from "./CredentialInputs-DxL-Pnkh.js";
//#region src/features/credentials/composables/useCredentialForm.ts
var import_get = /* @__PURE__ */ __toESM(require_get(), 1);
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MANAGED_CREDENTIAL_HIDDEN_PROPERTIES = /* @__PURE__ */ new Set([
	"scope",
	"customScopes",
	"enabledScopes",
	"customScopesNotice"
]);
/**
* Controller for a credential form: resolves the credential type + its visible
* properties, holds the editable data, and drives save / test. Host-agnostic —
* the credential edit modal and inline surfaces (Instance AI) both drive
* `CredentialConfig` from this. OAuth authorization stays with the host (it owns
* the popup lifecycle via `useCredentialOAuth`); this only exposes the state and
* persistence it needs.
*/
function useCredentialForm(options) {
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const rootStore = useRootStore();
	const nodeHelpers = useNodeHelpers();
	const i18n = useI18n();
	const credentialData = ref({});
	const credentialName = ref("");
	const credentialId = ref("");
	const currentCredential = ref(null);
	/** Set when the host switches auth type; overrides `activeId` as the type source. */
	const selectedCredential = ref("");
	const authError = ref("");
	const testedSuccessfully = ref(false);
	const isRetesting = ref(false);
	const isSaving = ref(false);
	const isTesting = ref(false);
	const showValidationWarning = ref(false);
	const isResolvable = ref(false);
	const connectedByMe = ref(false);
	/** The provider account my own connection authenticates as, when the provider tells us. */
	const connectedAccountIdentifier = ref(void 0);
	const useCustomOAuth = ref(false);
	const activeNodeType = computed(() => {
		const node = toValue(options.contextNode);
		return node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
	});
	const homeProject = computed(() => {
		const destination = toValue(options.destination);
		if (destination?.kind === "resolved") return destination.project;
		if (destination?.kind === "pending") return projectsStore.myProjects.find((project) => project.id === destination.id);
		const overrideProjectId = toValue(options.projectId);
		if (overrideProjectId) {
			const override = projectsStore.myProjects.find((p) => p.id === overrideProjectId);
			if (override) return override;
		}
		const { currentProject, personalProject } = projectsStore;
		return currentProject ?? personalProject ?? void 0;
	});
	const selectedCredentialType = computed(() => {
		if (toValue(options.mode) !== "new") return null;
		if (selectedCredential.value !== "") return credentialsStore.getCredentialTypeByName(selectedCredential.value) ?? null;
		if (toValue(options.showAuthSelector)) {
			const activeId = toValue(options.activeId);
			if (activeId) {
				const nodeCredential = activeNodeType.value?.credentials?.find((c) => c.name === activeId);
				if (nodeCredential) return nodeCredential;
			}
			const nodeAuthOptions = getNodeAuthOptions(activeNodeType.value);
			if (nodeAuthOptions.length > 0 && activeNodeType.value?.credentials) return getNodeCredentialForSelectedAuthType(activeNodeType.value, nodeAuthOptions[0].value);
			return activeNodeType.value?.credentials?.[0] ?? null;
		}
		return null;
	});
	const credentialTypeName = computed(() => {
		if (toValue(options.mode) === "edit") {
			if (selectedCredential.value) return selectedCredential.value;
			return currentCredential.value?.type ?? null;
		}
		if (selectedCredentialType.value) return selectedCredentialType.value.name;
		return toValue(options.activeId) ?? null;
	});
	const credentialType = computed(() => {
		if (!credentialTypeName.value) return null;
		const type = credentialsStore.getCredentialTypeByName(credentialTypeName.value);
		if (!type) return null;
		return {
			...type,
			properties: getCredentialProperties(credentialTypeName.value)
		};
	});
	const mergedProperties = computed(() => credentialType.value?.properties ?? []);
	const parentTypes = computed(() => credentialTypeName.value ? getParentTypes(credentialTypeName.value) : []);
	const isOAuthType = computed(() => !!credentialTypeName.value && ((credentialTypeName.value === "oAuth2Api" || parentTypes.value.includes("oAuth2Api")) && (credentialData.value.grantType === "authorizationCode" || credentialData.value.grantType === "pkce") || credentialTypeName.value === "oAuth1Api" || parentTypes.value.includes("oAuth1Api")));
	const managedOAuthAvailable = computed(() => {
		if (credentialTypeName.value && hasManagedOAuthCredentials(credentialTypeName.value)) return true;
		return activeNodeType.value?.credentials?.some((type) => hasManagedOAuthCredentials(type.name)) ?? false;
	});
	const isManagedOAuthMode = computed(() => isOAuthType.value && managedOAuthAvailable.value && !useCustomOAuth.value);
	const isAutomaticOAuthType = computed(() => hasAutomaticOAuthApp(credentialType.value ?? void 0));
	const isOAuthConnected = computed(() => {
		if (!isOAuthType.value) return false;
		if (isResolvable.value) return connectedByMe.value;
		return !!credentialData.value.oauthTokenData;
	});
	const canUseCustomOAuth = computed(() => isOAuthType.value && managedOAuthAvailable.value);
	const isEditingManagedCredential = computed(() => {
		const activeId = toValue(options.activeId);
		if (!activeId) return false;
		return credentialsStore.getCredentialById(activeId)?.isManaged ?? false;
	});
	const isNewCredential = computed(() => toValue(options.mode) === "new" && !credentialId.value);
	watch(credentialType, (newType) => {
		if (toValue(options.mode) === "new" && newType?.__skipManagedCreation) useCustomOAuth.value = true;
	}, { immediate: true });
	/** Automatic types store the selected mode, because the backend reads it. */
	function storeSelectedOAuthMode() {
		if (!isAutomaticOAuthType.value) return;
		const useDynamicClientRegistration = !useCustomOAuth.value;
		if (credentialData.value.useDynamicClientRegistration === useDynamicClientRegistration) return;
		credentialData.value = {
			...credentialData.value,
			useDynamicClientRegistration
		};
	}
	const oauthModeInputs = () => [
		isAutomaticOAuthType.value,
		useCustomOAuth.value,
		credentialData.value.useDynamicClientRegistration
	];
	watch(oauthModeInputs, storeSelectedOAuthMode, { immediate: true });
	const credentialProperties = computed(() => {
		const type = credentialType.value;
		if (!type) return [];
		const properties = type.properties.filter((propertyData) => {
			if (!displayCredentialParameter(propertyData)) return false;
			return useCustomOAuth.value || !type.__overwrittenProperties?.includes(propertyData.name);
		});
		if (properties.every((p) => p.type === "notice")) return [];
		return properties;
	});
	const requiredPropertiesFilled = computed(() => {
		if (credentialTypeName.value === "httpTemplatedCustomAuth") {
			const template = parseTemplatedAuthField(credentialData.value.template, {});
			if (!isValidTemplateShape(template)) return false;
			const markers = extractTemplateMarkers(template);
			const values = parsePlaceholderValues(credentialData.value.placeholderValues);
			const optionalMarkers = new Set(parsePlaceholderDefs(credentialData.value.placeholderDefs).filter((def) => def.optional === true).map((def) => def.name));
			if (markers.some((marker) => !optionalMarkers.has(marker) && !values[marker])) return false;
		}
		for (const property of credentialProperties.value) {
			if (property.required !== true) continue;
			const value = credentialData.value[property.name];
			if (property.type === "string" && !value) return false;
			if (property.type === "number") {
				const containsExpression = typeof value === "string" && value.startsWith("=");
				if (typeof value !== "number" && !containsExpression) return false;
			}
			if (property.type === "json" && value) {
				const jsonValue = String(value);
				if (!isExpression(jsonValue) && jsonValue !== "__n8n_EMPTY_VALUE_7b1af746-3729-4c60-9b9b-e08eb29e58da") try {
					JSON.parse(jsonValue);
				} catch {
					return false;
				}
			}
		}
		return true;
	});
	const isTemplatedAuthProbeable = computed(() => credentialTypeName.value === "httpTemplatedCustomAuth" && typeof credentialData.value.testUrl === "string" && /^https?:\/\//i.test(credentialData.value.testUrl));
	const isCredentialTestable = computed(() => {
		if (isOAuthType.value || !requiredPropertiesFilled.value) return false;
		if (isTemplatedAuthProbeable.value) return true;
		if (credentialProperties.value.some((prop) => {
			const value = credentialData.value[prop.name];
			return typeof value === "string" && isExpression(value) && !isTestableExpression(value);
		})) return false;
		if (!credentialTypeName.value) return false;
		return credentialsStore.isCredentialTypeTestable(credentialTypeName.value);
	});
	const credentialPermissions = computed(() => {
		const permissions = getResourcePermissions(currentCredential.value?.scopes ?? homeProject.value?.scopes).credential;
		const destination = toValue(options.destination);
		if (destination?.kind === "pending" && toValue(options.mode) === "new" && !credentialId.value && !currentCredential.value && !homeProject.value) return {
			...permissions,
			create: destination.permissions.create
		};
		return permissions;
	});
	function getParentTypes(name) {
		const type = credentialsStore.getCredentialTypeByName(name);
		if (type?.extends === void 0) return [];
		const types = [];
		for (const typeName of type.extends) types.push(typeName, ...getParentTypes(typeName));
		return types;
	}
	function getCredentialProperties(name) {
		const credentialTypeData = credentialsStore.getCredentialTypeByName(name);
		if (!credentialTypeData) return [];
		if (credentialTypeData.extends === void 0) return credentialTypeData.properties;
		const combined = [];
		for (const parentName of credentialTypeData.extends) mergeNodeProperties(combined, getCredentialProperties(parentName));
		mergeNodeProperties(combined, credentialTypeData.properties);
		return combined;
	}
	function displayCredentialParameter(parameter) {
		if (parameter.type === "hidden") return false;
		const isManagedCredential = isEditingManagedCredential.value || isManagedOAuthMode.value;
		if (MANAGED_CREDENTIAL_HIDDEN_PROPERTIES.has(parameter.name) && isManagedCredential && !credentialType.value?.__showManagedOAuthScopes) return false;
		const deployment = settingsStore.isCloudDeployment ? "cloud" : "hosted";
		if (parameter.displayOptions?.showOnDeployment && parameter.displayOptions.showOnDeployment !== deployment) return false;
		if (parameter.displayOptions?.hideOnCloud && settingsStore.isCloudDeployment) return false;
		if (parameter.displayOptions === void 0) return true;
		return nodeHelpers.displayParameter(credentialData.value, parameter, "", null);
	}
	function hasManagedOAuthCredentials(credType) {
		const type = credentialsStore.getCredentialTypeByName(credType);
		return hasManagedOAuthApp(type) || hasAutomaticOAuthApp(type);
	}
	function usesExternalSecrets(data) {
		return Object.entries(data).some(([, value]) => typeof value !== "object" && /=.*\{\{[^}]*\$secrets\.[^}]+}}.*/.test(`${value}`));
	}
	function setCredentialPropertyDefaults() {
		const type = credentialType.value;
		if (!type) return;
		for (const property of type.properties) if (!credentialData.value.hasOwnProperty(property.name) && !type.__overwrittenProperties?.includes(property.name)) credentialData.value = {
			...credentialData.value,
			[property.name]: property.default
		};
	}
	function resetCredentialData() {
		const type = credentialType.value;
		if (!type) return;
		for (const property of type.properties) if (!type.__overwrittenProperties?.includes(property.name)) credentialData.value = {
			...credentialData.value,
			[property.name]: property.default
		};
		const resolvedProject = homeProject.value ?? {};
		const scopes = ("scopes" in resolvedProject ? resolvedProject.scopes : void 0) ?? [];
		credentialData.value = {
			...credentialData.value,
			scopes,
			homeProject: resolvedProject
		};
	}
	function clearOverwrittenProperties() {
		const overwritten = credentialType.value?.__overwrittenProperties;
		if (!overwritten?.length) return;
		credentialData.value = Object.fromEntries(Object.entries(credentialData.value).filter(([key]) => !overwritten.includes(key)));
	}
	/**
	* Source-controlled credentials can arrive with empty-string parameters that
	* break FE type checks — strip them.
	*/
	function removePropertiesWithEmptyStrings(data) {
		const copy = structuredClone(data);
		Object.entries(copy).forEach(([key, value]) => {
			if (value === "") delete copy[key];
		});
		return copy;
	}
	async function loadCurrentCredential(id) {
		credentialId.value = id;
		const loaded = await credentialsStore.getCredentialData({ id });
		if (!loaded) throw new Error(`${i18n.baseText("credentialEdit.credentialEdit.couldNotFindCredentialWithId")}:${id}`);
		currentCredential.value = loaded;
		credentialData.value = removePropertiesWithEmptyStrings(loaded.data ?? {});
		if (loaded.sharedWithProjects) credentialData.value.sharedWithProjects = loaded.sharedWithProjects;
		if (loaded.homeProject) credentialData.value.homeProject = loaded.homeProject;
		credentialName.value = loaded.name;
		isResolvable.value = "isResolvable" in loaded && typeof loaded.isResolvable === "boolean" ? loaded.isResolvable : false;
		connectedByMe.value = "connectedByMe" in loaded && typeof loaded.connectedByMe === "boolean" ? loaded.connectedByMe : false;
		connectedAccountIdentifier.value = "connectedAccountIdentifier" in loaded && typeof loaded.connectedAccountIdentifier === "string" ? loaded.connectedAccountIdentifier : void 0;
		if (isAutomaticOAuthType.value) useCustomOAuth.value = credentialData.value.useDynamicClientRegistration !== true;
	}
	function detectCustomOAuth() {
		if (credentialType.value?.__overwrittenProperties?.includes("clientId") && credentialData.value.clientId && credentialData.value.clientSecret) useCustomOAuth.value = true;
	}
	/** Seed a new Templated Custom Auth credential's fields from an agent recipe,
	*  so the form opens on the guided simple view with the template pre-filled. */
	function seedFromSetupHint(setupHint) {
		credentialData.value = {
			...credentialData.value,
			template: JSON.stringify(setupHint.template, null, 2),
			placeholderDefs: JSON.stringify(setupHint.placeholders, null, 2),
			...setupHint.testUrl ? { testUrl: setupHint.testUrl } : {},
			...setupHint.docsUrl ? { docsUrl: setupHint.docsUrl } : {},
			...setupHint.acceptedStatusCodes?.length ? { acceptedStatusCodes: JSON.stringify(setupHint.acceptedStatusCodes) } : {},
			...setupHint.serviceHost ? { serviceHost: setupHint.serviceHost } : {},
			...setupHint.serviceOrigin ? { serviceOrigin: setupHint.serviceOrigin } : {}
		};
	}
	/**
	* One-call setup for a fresh form: loads the credential (edit) or seeds a
	* default name (new), then fills property defaults. Hosts with extra concerns
	* (external secrets, hooks, quick connect) run those around this.
	*/
	async function initialize() {
		if (toValue(options.mode) === "edit") {
			const id = toValue(options.activeId);
			if (id) await loadCurrentCredential(id);
			setCredentialPropertyDefaults();
			detectCustomOAuth();
			return;
		}
		const setupHint = credentialTypeName.value === "httpTemplatedCustomAuth" ? toValue(options.setupHint) : void 0;
		setCredentialPropertyDefaults();
		if (setupHint) seedFromSetupHint(setupHint);
		const initialData = toValue(options.initialData);
		if (initialData) {
			const data = deepCopy(initialData);
			for (const property of mergedProperties.value) {
				const value = data[property.name];
				if (property.type === "json" && typeof value === "object" && value !== null) data[property.name] = JSON.stringify(value);
			}
			Object.assign(credentialData.value, data);
			if (credentialType.value?.__overwrittenProperties?.some((name) => name in initialData)) useCustomOAuth.value = true;
		}
		let suggestedName = toValue(options.suggestedName);
		if (setupHint) {
			const base = setupHint.suggestedName || suggestedName;
			if (base) suggestedName = composeCredentialNameWithUser(base, usersStore.currentUser);
		}
		credentialName.value = toValue(options.initialName) ?? (suggestedName ? await credentialsStore.getDedupedCredentialName(suggestedName) : credentialTypeName.value ? await credentialsStore.getNewCredentialName({ credentialTypeName: credentialTypeName.value }) : credentialType.value?.displayName ?? "");
		if (homeProject.value) credentialData.value = {
			...credentialData.value,
			homeProject: homeProject.value
		};
	}
	/** Applies a field change to `credentialData`; returns false when the value was unchanged. */
	function onDataChange({ name, value }) {
		if ((0, import_get.default)(credentialData.value, name) === value) return false;
		if (isOAuthType.value && (name === "clientId" || name === "clientSecret")) {
			const { oauthTokenData, ...rest } = credentialData.value;
			credentialData.value = deepCopy(rest);
		}
		setParameterValue(credentialData.value, name, value);
		return true;
	}
	/**
	* Static (shared, non-resolvable) fields whose value in `data` differs from the
	* loaded credential. Pass the payload to be saved (defaults stripped) so the
	* result mirrors the backend's authoritative check.
	*/
	function getChangedSharedFields(data) {
		const original = currentCredential.value?.data ?? {};
		return mergedProperties.value.filter((prop) => prop.resolvableField !== true).map((prop) => prop.name).filter((name) => name in data && !(0, import_isEqual.default)(original[name], data[name]));
	}
	async function testCredential(details) {
		let result;
		try {
			result = isTemplatedAuthProbeable.value && details.id ? await probeCredential(rootStore.restApiContext, details.id) : await credentialsStore.testCredential(details);
		} catch (error) {
			result = {
				status: "Error",
				message: error instanceof Error ? error.message : String(error)
			};
		}
		if (result.status === "Error") {
			authError.value = result.message;
			testedSuccessfully.value = false;
		} else {
			authError.value = "";
			testedSuccessfully.value = true;
		}
		options.onTestComplete?.();
	}
	async function retestCredential() {
		if (isEditingManagedCredential.value) return;
		if (!isCredentialTestable.value || !credentialTypeName.value) {
			authError.value = "";
			testedSuccessfully.value = false;
			return;
		}
		const { ownedBy, sharedWithProjects, ...data } = credentialData.value;
		isRetesting.value = true;
		await testCredential({
			id: credentialId.value,
			name: credentialName.value,
			type: credentialTypeName.value,
			data
		});
		isRetesting.value = false;
	}
	return {
		credentialData,
		credentialName,
		credentialId,
		currentCredential,
		selectedCredential,
		authError,
		testedSuccessfully,
		isRetesting,
		isSaving,
		isTesting,
		showValidationWarning,
		isResolvable,
		connectedByMe,
		connectedAccountIdentifier,
		useCustomOAuth,
		activeNodeType,
		homeProject,
		credentialTypeName,
		credentialType,
		mergedProperties,
		parentTypes,
		isOAuthType,
		isOAuthConnected,
		isManagedOAuthMode,
		managedOAuthAvailable,
		isEditingManagedCredential,
		isNewCredential,
		credentialProperties,
		requiredPropertiesFilled,
		isCredentialTestable,
		credentialPermissions,
		canUseCustomOAuth,
		getParentTypes,
		getCredentialProperties,
		displayCredentialParameter,
		usesExternalSecrets,
		setCredentialPropertyDefaults,
		resetCredentialData,
		clearOverwrittenProperties,
		loadCurrentCredential,
		initialize,
		getChangedSharedFields,
		onDataChange,
		testCredential,
		retestCredential
	};
}
//#endregion
//#region src/features/credentials/components/CredentialEdit/TemplatedAuthSimpleView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var import_startCase = /* @__PURE__ */ __toESM(require_startCase(), 1);
var TemplatedAuthSimpleView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplatedAuthSimpleView",
	props: {
		credentialData: {},
		compact: { type: Boolean },
		showValidationWarnings: { type: Boolean }
	},
	emits: ["update"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const templateText = computed(() => typeof props.credentialData.template === "string" ? props.credentialData.template : "");
		const template = computed(() => parseTemplatedAuthField(props.credentialData.template, {}));
		const markers = computed(() => extractTemplateMarkers(template.value));
		const defsByName = computed(() => {
			const defs = parsePlaceholderDefs(props.credentialData.placeholderDefs);
			return new Map(defs.map((def) => [def.name, def]));
		});
		const savedValues = computed(() => parsePlaceholderValues(props.credentialData.placeholderValues));
		const editing = ref(markers.value.length === 0);
		const userDrivenState = ref(false);
		watch(markers, (next) => {
			if (!userDrivenState.value) editing.value = next.length === 0;
		});
		function setEditing(value) {
			userDrivenState.value = true;
			editing.value = value;
		}
		const editedValues = ref({ ...savedValues.value });
		function isRequired(name) {
			return defsByName.value.get(name)?.optional !== true;
		}
		const inputNameFor = (index) => `marker_${index}`;
		const markerFor = (inputName) => markers.value[Number(inputName.slice(7))];
		/** One native credential parameter per template marker; defs give the UI.
		*  The def's info renders in the label's tooltip bubble like every other
		*  credential field's help text. */
		const placeholderProperties = computed(() => markers.value.map((name, index) => {
			const def = defsByName.value.get(name);
			return {
				displayName: def?.title || (0, import_startCase.default)(name),
				name: inputNameFor(index),
				type: "string",
				default: "",
				required: isRequired(name),
				...def?.info ? { description: def.info } : {},
				...def?.type === "plain" ? {} : { typeOptions: { password: true } }
			};
		}));
		const parameterValues = computed(() => Object.fromEntries(markers.value.map((name, index) => {
			const value = editedValues.value[name] ?? "";
			const masked = defsByName.value.get(name)?.type !== "plain";
			return [inputNameFor(index), value === "***" && masked ? CREDENTIAL_BLANKING_VALUE : value];
		})));
		function onParameterUpdate(update) {
			const marker = markerFor(update.name);
			if (!marker) return;
			editedValues.value[marker] = storedPlaceholderValue(String(update.value ?? ""));
			const composed = {};
			for (const name of markers.value) {
				const edited = editedValues.value[name] ?? savedValues.value[name] ?? "";
				const cleaned = cleanPlaceholderValue(template.value, name, edited);
				if (cleaned === "" && !isRequired(name)) continue;
				composed[name] = cleaned;
			}
			emit("update", {
				name: "placeholderValues",
				value: JSON.stringify(composed, null, 2)
			});
		}
		function chipLabel(name) {
			return "{{" + name + "}}";
		}
		function emitSetupUpdate(name, value) {
			userDrivenState.value = true;
			emit("update", {
				name,
				value
			});
		}
		function defFor(name) {
			return defsByName.value.get(name) ?? {
				name,
				title: ""
			};
		}
		function setDefField(name, patch) {
			const defs = markers.value.map((marker) => {
				const existing = defFor(marker);
				return marker === name ? {
					...existing,
					...patch
				} : existing;
			});
			emitSetupUpdate("placeholderDefs", JSON.stringify(defs, null, 2));
		}
		function onTemplateInput(value) {
			emitSetupUpdate("template", value);
		}
		const testUrlText = computed(() => typeof props.credentialData.testUrl === "string" ? props.credentialData.testUrl : "");
		const docsUrlText = computed(() => typeof props.credentialData.docsUrl === "string" ? props.credentialData.docsUrl : "");
		const codesText = ref(parseTemplatedAuthField(props.credentialData.acceptedStatusCodes, []).join(", "));
		function onCodesInput(value) {
			codesText.value = value;
			const codes = value.split(/[\s,]+/).map(Number).filter((code) => Number.isInteger(code) && code > 0);
			emitSetupUpdate("acceptedStatusCodes", codes.length ? JSON.stringify(codes) : "");
		}
		const typeOptions = [{
			label: i18n.baseText("credentialEdit.templatedAuth.fieldType.secret"),
			value: "password"
		}, {
			label: i18n.baseText("credentialEdit.templatedAuth.fieldType.plain"),
			value: "plain"
		}];
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.view),
				"data-test-id": "templated-auth-simple-view",
				onKeydown: _cache[5] || (_cache[5] = withModifiers(() => {}, ["stop"]))
			}, [__props.compact || !editing.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [__props.compact && markers.value.length ? (openBlock(), createBlock(CredentialInputs_default, {
				key: 0,
				compact: "",
				"credential-properties": placeholderProperties.value,
				"credential-data": parameterValues.value,
				"show-validation-warnings": __props.showValidationWarnings,
				"documentation-url": "",
				onUpdate: onParameterUpdate
			}, null, 8, [
				"credential-properties",
				"credential-data",
				"show-validation-warnings"
			])) : markers.value.length ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(placeholderProperties.value, (parameter) => {
				return openBlock(), createElementBlock("form", {
					key: parameter.name,
					class: normalizeClass(_ctx.$style.field),
					autocomplete: "off",
					"data-test-id": "templated-auth-value-input",
					onSubmit: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"]))
				}, [createVNode(ParameterInputExpanded_default, {
					parameter,
					value: parameterValues.value[parameter.name],
					"node-values": parameterValues.value,
					label: { size: "medium" },
					"documentation-url": "",
					"event-source": "credentials",
					onUpdate: onParameterUpdate
				}, null, 8, [
					"parameter",
					"value",
					"node-values"
				])], 34);
			}), 128)) : (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.empty),
				"data-test-id": "templated-auth-empty"
			}, toDisplayString(unref(i18n).baseText("credentialEdit.templatedAuth.noFieldsYet")), 3)), !__props.compact ? (openBlock(), createElementBlock("div", {
				key: 3,
				class: normalizeClass(_ctx.$style.provenance)
			}, [createVNode(unref(N8nButton_default), {
				variant: "outline",
				size: "small",
				"data-test-id": "templated-auth-edit-setup",
				onClick: _cache[1] || (_cache[1] = ($event) => setEditing(true))
			}, {
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "pen",
					size: "xsmall"
				}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("credentialEdit.templatedAuth.editSetup")), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.editHead) }, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					"icon-only": "",
					"aria-label": unref(i18n).baseText("credentialEdit.templatedAuth.backToForm"),
					"data-test-id": "templated-auth-back",
					onClick: _cache[2] || (_cache[2] = ($event) => setEditing(false))
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "arrow-left" })]),
					_: 1
				}, 8, ["aria-label"]), createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-dark",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialEdit.templatedAuth.editSetup")), 1)]),
					_: 1
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("credentialEdit.templatedAuth.template"),
					"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.template.tooltip"),
					bold: false,
					size: "medium"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						"model-value": templateText.value,
						type: "textarea",
						rows: 6,
						class: normalizeClass(_ctx.$style.mono),
						"data-test-id": "templated-auth-template-input",
						"onUpdate:modelValue": onTemplateInput
					}, null, 8, ["model-value", "class"])]),
					_: 1
				}, 8, ["label", "tooltip-text"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("credentialEdit.templatedAuth.fields"),
					"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.fields.tooltip"),
					bold: false,
					size: "medium"
				}, {
					default: withCtx(() => [markers.value.length ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.defs)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(markers.value, (name) => {
						return openBlock(), createElementBlock("div", {
							key: name,
							class: normalizeClass(_ctx.$style.defCard),
							"data-test-id": "templated-auth-def-card"
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.defTop) }, [createBaseVNode("code", { class: normalizeClass(_ctx.$style.chip) }, toDisplayString(chipLabel(name)), 3), createVNode(unref(N8nSwitch_default), {
							"model-value": isRequired(name),
							label: unref(i18n).baseText("credentialEdit.templatedAuth.fieldRequired"),
							size: "small",
							"onUpdate:modelValue": ($event) => setDefField(name, { optional: $event ? void 0 : true })
						}, null, 8, [
							"model-value",
							"label",
							"onUpdate:modelValue"
						])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.defGrid) }, [
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("credentialEdit.templatedAuth.fieldLabel"),
								"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.fieldLabel.tooltip"),
								bold: false,
								size: "small"
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									size: "small",
									"model-value": defFor(name).title,
									placeholder: unref(import_startCase.default)(name),
									"onUpdate:modelValue": ($event) => setDefField(name, { title: $event })
								}, null, 8, [
									"model-value",
									"placeholder",
									"onUpdate:modelValue"
								])]),
								_: 2
							}, 1032, ["label", "tooltip-text"]),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.typePick) }, [createVNode(unref(N8nSegmentControl_default), {
								size: "small",
								"model-value": defFor(name).type === "plain" ? "plain" : "password",
								options: typeOptions,
								"onUpdate:modelValue": ($event) => setDefField(name, { type: $event === "plain" ? "plain" : "password" })
							}, null, 8, ["model-value", "onUpdate:modelValue"])], 2),
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("credentialEdit.templatedAuth.fieldHint"),
								"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.fieldHint.tooltip"),
								bold: false,
								size: "small",
								class: normalizeClass(_ctx.$style.defWide)
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									size: "small",
									"model-value": defFor(name).info ?? "",
									"onUpdate:modelValue": ($event) => setDefField(name, { info: $event || void 0 })
								}, null, 8, ["model-value", "onUpdate:modelValue"])]),
								_: 2
							}, 1032, [
								"label",
								"tooltip-text",
								"class"
							])
						], 2)], 2);
					}), 128))], 2)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.empty)
					}, toDisplayString(unref(i18n).baseText("credentialEdit.templatedAuth.fields.empty")), 3))]),
					_: 1
				}, 8, ["label", "tooltip-text"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("credentialEdit.templatedAuth.testUrl"),
					"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.testUrl.tooltip"),
					bold: false,
					size: "medium"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						size: "small",
						"model-value": testUrlText.value,
						placeholder: unref(i18n).baseText("credentialEdit.templatedAuth.testUrl.placeholder"),
						class: normalizeClass(_ctx.$style.mono),
						"data-test-id": "templated-auth-test-url-input",
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => emitSetupUpdate("testUrl", $event))
					}, null, 8, [
						"model-value",
						"placeholder",
						"class"
					])]),
					_: 1
				}, 8, ["label", "tooltip-text"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("credentialEdit.templatedAuth.codes"),
					"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.codes.tooltip"),
					bold: false,
					size: "medium"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						size: "small",
						"model-value": codesText.value,
						placeholder: unref(i18n).baseText("credentialEdit.templatedAuth.codes.placeholder"),
						class: normalizeClass([_ctx.$style.mono, _ctx.$style.narrow]),
						"data-test-id": "templated-auth-codes-input",
						"onUpdate:modelValue": onCodesInput
					}, null, 8, [
						"model-value",
						"placeholder",
						"class"
					])]),
					_: 1
				}, 8, ["label", "tooltip-text"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("credentialEdit.templatedAuth.docsUrl"),
					"tooltip-text": unref(i18n).baseText("credentialEdit.templatedAuth.docsUrl.tooltip"),
					bold: false,
					size: "medium"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						size: "small",
						"model-value": docsUrlText.value,
						placeholder: unref(i18n).baseText("credentialEdit.templatedAuth.docsUrl.placeholder"),
						class: normalizeClass(_ctx.$style.mono),
						"data-test-id": "templated-auth-docs-url-input",
						"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => emitSetupUpdate("docsUrl", $event))
					}, null, 8, [
						"model-value",
						"placeholder",
						"class"
					])]),
					_: 1
				}, 8, ["label", "tooltip-text"])], 2)
			], 64))], 34);
		};
	}
}), [["__cssModules", { "$style": {
	view: "_view_rbl8e_1",
	field: "_field_rbl8e_7",
	empty: "_empty_rbl8e_12",
	provenance: "_provenance_rbl8e_21",
	editHead: "_editHead_rbl8e_29",
	section: "_section_rbl8e_35",
	mono: "_mono_rbl8e_40",
	narrow: "_narrow_rbl8e_49",
	defs: "_defs_rbl8e_53",
	defCard: "_defCard_rbl8e_59",
	defTop: "_defTop_rbl8e_66",
	chip: "_chip_rbl8e_74",
	defGrid: "_defGrid_rbl8e_83",
	typePick: "_typePick_rbl8e_90",
	defWide: "_defWide_rbl8e_96"
} }]]);
//#endregion
export { useCredentialForm as n, TemplatedAuthSimpleView_default as t };
