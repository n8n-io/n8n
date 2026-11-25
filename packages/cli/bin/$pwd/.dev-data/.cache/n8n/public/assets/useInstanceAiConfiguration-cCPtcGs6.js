import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $S as TIME, AN as i18n, Ai as useInstanceAiSettingsStore, Cy as scrubSecretsInText, DE as INSTANCE_AI_CATALOG_PROVIDERS, JA as DialogHeader_default, KA as Dialog_default, LM as N8nCallout_default, MA as RadioGroupItem_default, Mc as SANDBOX_PROVIDER_LABELS, Mp as useCredentialsStore, Ni as deriveInstanceAiConfiguration, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _N as N8nText_default, cN as Input_default, dn as useCredentialTestInBackground, gM as N8nInputLabel_default, hM as N8nLink_default, jA as RadioGroup_default, jN as useI18n, lk as displayParameter, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, qA as DialogTitle_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ai/instanceAi/composables/useInstanceCredentialTest.ts
init_reactivity_esm_bundler();
var genericError = () => i18n.baseText("instanceAi.workflowSetup.credentialTestFailedTooltip");
function useInstanceCredentialTest() {
	const credentialsStore = useCredentialsStore();
	const { isCredentialTypeTestable } = useCredentialTestInBackground();
	const credentialTestError = ref("");
	const isTestingCredential = ref(false);
	function hasRequiredData(credentials) {
		const data = credentials.data ?? {};
		return (credentialsStore.getCredentialTypeByName(credentials.type)?.properties ?? []).every((property) => {
			if (!property.required || !displayParameter(data, property, null, null)) return true;
			const value = data[property.name];
			return (typeof value === "string" ? value.trim().length > 0 : value !== null && value !== void 0) || property.default !== void 0 && property.default !== "";
		});
	}
	async function runCredentialTest(credentials) {
		const result = await credentialsStore.testCredential(credentials);
		if (result.status === "OK") return true;
		credentialTestError.value = result.message || genericError();
		return false;
	}
	async function testCredential(credentials) {
		credentialTestError.value = "";
		if (!isCredentialTypeTestable(credentials.type)) {
			const isValid = hasRequiredData(credentials);
			if (!isValid) credentialTestError.value = genericError();
			return isValid;
		}
		isTestingCredential.value = true;
		try {
			return await runCredentialTest(credentials);
		} catch {
			credentialTestError.value = genericError();
			return false;
		} finally {
			isTestingCredential.value = false;
		}
	}
	async function testSavedCredential(id, name, type) {
		if (!isCredentialTypeTestable(type)) return true;
		credentialTestError.value = "";
		isTestingCredential.value = true;
		try {
			const credential = await credentialsStore.getCredentialData({ id });
			const credentialData = credential && "data" in credential ? credential.data : void 0;
			if (!credentialData || typeof credentialData === "string") throw new Error();
			const { ownedBy: _ownedBy, sharedWithProjects: _sharedWithProjects, oauthTokenData, ...data } = credentialData;
			if (oauthTokenData) {
				credentialsStore.credentialTestResults.set(id, "success");
				return true;
			}
			return await runCredentialTest({
				id,
				name,
				type,
				data
			});
		} catch {
			credentialsStore.credentialTestResults.set(id, "error");
			credentialTestError.value = genericError();
			return false;
		} finally {
			isTestingCredential.value = false;
		}
	}
	/** Resurfaces a failure recorded for this credential by any prior testSavedCredential run. */
	function restoreStoredError(id) {
		credentialTestError.value = id && credentialsStore.credentialTestResults.get(id) === "error" ? genericError() : "";
	}
	return {
		credentialTestError,
		isTestingCredential,
		testCredential,
		testSavedCredential,
		restoreStoredError
	};
}
//#endregion
//#region src/features/ai/instanceAi/instanceAiConnection.constants.ts
var INSTANCE_AI_CURATED_MODELS = {
	anthropic: ["claude-opus-5-5", "claude-sonnet-5-5"],
	openai: ["gpt-6.1-sol", "gpt-6-astra"],
	openrouter: [
		"anthropic/claude-opus-5.5",
		"anthropic/claude-sonnet-5.5",
		"openai/gpt-6.1-sol",
		"openai/gpt-6-astra",
		"moonshotai/kimi-k3"
	],
	custom: []
};
var INSTANCE_AI_MODEL_PROVIDERS = [
	{
		id: "anthropic",
		credentialType: "anthropicApi",
		label: "Anthropic",
		placeholder: "sk-ant-…"
	},
	{
		id: "openai",
		credentialType: "openAiApi",
		label: "OpenAI",
		placeholder: "sk-…"
	},
	{
		id: "openrouter",
		credentialType: "openRouterApi",
		label: "OpenRouter",
		placeholder: "sk-or-…"
	},
	{
		id: "custom",
		credentialType: "openAiApi",
		label: null,
		placeholder: "Leave empty for Ollama"
	}
];
var INSTANCE_AI_SANDBOX_PROVIDERS = [{
	id: "n8n-sandbox",
	label: SANDBOX_PROVIDER_LABELS["n8n-sandbox"],
	onboardingLabel: "n8n Sandbox"
}, {
	id: "daytona",
	label: SANDBOX_PROVIDER_LABELS.daytona,
	onboardingLabel: "Daytona"
}];
var INSTANCE_AI_SEARCH_PROVIDERS = [{
	id: "searxng",
	credentialType: "searXngApi",
	label: "SearXNG"
}, {
	id: "brave",
	credentialType: "braveSearchApi",
	label: "Brave Search"
}];
//#endregion
//#region src/features/ai/instanceAi/instanceAiModelCatalog.ts
function compareModels(a, b) {
	const aReleaseTime = a.releaseDate ? Date.parse(a.releaseDate) : NaN;
	const bReleaseTime = b.releaseDate ? Date.parse(b.releaseDate) : NaN;
	const aHasReleaseDate = !Number.isNaN(aReleaseTime);
	const bHasReleaseDate = !Number.isNaN(bReleaseTime);
	if (aHasReleaseDate && bHasReleaseDate && aReleaseTime !== bReleaseTime) return bReleaseTime - aReleaseTime;
	if (aHasReleaseDate !== bHasReleaseDate) return aHasReleaseDate ? -1 : 1;
	return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}
function getOptionsForProviders(providers, catalog, currentModel) {
	const catalogModels = providers.flatMap((provider) => catalog?.[provider] ?? []);
	const catalogById = /* @__PURE__ */ new Map();
	for (const model of catalogModels) if (!catalogById.has(model.id)) catalogById.set(model.id, model);
	const seen = /* @__PURE__ */ new Set();
	const recommended = [];
	for (const [providerIndex, provider] of providers.entries()) for (const [modelIndex, id] of INSTANCE_AI_CURATED_MODELS[provider].entries()) {
		if (seen.has(id)) continue;
		seen.add(id);
		recommended.push({
			id,
			name: catalogById.get(id)?.name ?? id,
			recommended: providerIndex === 0 && modelIndex === 0
		});
	}
	const dynamicModels = catalogModels.filter((model) => {
		if (!model.id || !model.name || seen.has(model.id)) return false;
		seen.add(model.id);
		return true;
	}).map((model) => ({ ...model }));
	const current = currentModel.trim();
	if (current && !seen.has(current)) dynamicModels.push({
		id: current,
		name: current
	});
	const dynamic = dynamicModels.sort(compareModels).map((model) => ({
		id: model.id,
		name: model.name,
		recommended: false
	}));
	return [...recommended, ...dynamic];
}
function getInstanceAiModelOptions(provider, catalog, currentModel) {
	if (provider === "custom") return [];
	return getOptionsForProviders([provider], catalog, currentModel);
}
function getAllInstanceAiModelOptions(catalog, currentModel) {
	return getOptionsForProviders(INSTANCE_AI_CATALOG_PROVIDERS, catalog, currentModel);
}
//#endregion
//#region ../../@n8n/utils/src/redaction/sanitize-error-detail.ts
var QUOTED_URL_QUERY = /(["'])(https?:\/\/(?:(?!\1)[^\s?<>])+)(?:\?(?:\\.|(?!\1(?!\w))[^\s<>\\])*)?/gi;
var BARE_URL_QUERY = /(https?:\/\/[^\s?<>]+)(?:\?[^\s<>]*)?/gi;
function sanitizeErrorDetail(message, maxLength) {
	return scrubSecretsInText(message).replace(QUOTED_URL_QUERY, "$1$2").replace(BARE_URL_QUERY, "$1").slice(0, maxLength);
}
//#endregion
//#region src/features/ai/instanceAi/onboarding/sanitizeFailureDetail.ts
var MAX_DETAIL_LENGTH = 512;
/**
* Client-side mirror of the backend's verification-error sanitizer, for error
* detail that never passed through it (credential-test messages, request
* failures). The rendered callout must be safe to screenshot and share:
* providers can echo API keys in error messages, so scrub known secret
* shapes, drop URL query strings, and cap the length.
*/
function sanitizeFailureDetail(message) {
	return sanitizeErrorDetail(message, MAX_DETAIL_LENGTH);
}
//#endregion
//#region src/features/ai/instanceAi/onboarding/InstanceAiOnboardingWizard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-test-id", "onClick"];
var _hoisted_2 = ["data-test-id"];
var _hoisted_3 = ["data-test-id"];
var _hoisted_4 = ["data-test-id", "onClick"];
var _hoisted_5 = ["data-test-id"];
var _hoisted_6 = ["onClick"];
var _hoisted_7 = ["data-test-id"];
var DAYTONA_API_URL = "https://app.daytona.io/api";
var N8N_SANDBOX_HEADER = "x-api-key";
var STATIC_SECRET_MASK = "••••••••••••";
var SANDBOX_DOCS_URL = "https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant#setup-2-self-host-the-sandbox-manually-advanced";
var SEARCH_DOCS_URL = "https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant#enable-web-search";
var BRAVE_SEARCH_KEYS_URL = "https://api-dashboard.search.brave.com/app/keys";
var ENV_DOCS_URL = "https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant";
var InstanceAiOnboardingWizard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiOnboardingWizard",
	props: {
		open: { type: Boolean },
		step: {},
		editMode: { type: Boolean },
		sequence: {},
		modelValue: {},
		sandboxValue: {},
		searchValue: {},
		composeFastPath: { type: Boolean },
		surface: { default: "onboarding" },
		allowUnchanged: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"update:open",
		"advance",
		"back",
		"edit",
		"completed"
	],
	setup(__props, { emit: __emit }) {
		const SUCCESS_PAUSE_MS = TIME.SECOND * 1.5;
		const DEFAULT_MODEL_PROVIDER = INSTANCE_AI_MODEL_PROVIDERS[0];
		const DEFAULT_MODEL_NAME = INSTANCE_AI_CURATED_MODELS[DEFAULT_MODEL_PROVIDER.id][0] ?? "";
		const VERIFICATION_FAILURE_COPY = {
			unauthorized: "instanceAi.onboarding.verification.unauthorized",
			forbidden: "instanceAi.onboarding.verification.forbidden",
			timeout: "instanceAi.onboarding.verification.timeout",
			rate_limited: "instanceAi.onboarding.verification.rate_limited",
			quota_exceeded: "instanceAi.onboarding.verification.quota_exceeded",
			unreachable: "instanceAi.onboarding.verification.unreachable",
			invalid_response: "instanceAi.onboarding.verification.invalid_response",
			provider_error: "instanceAi.onboarding.verification.provider_error"
		};
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const store = useInstanceAiSettingsStore();
		const credentialsStore = useCredentialsStore();
		const { credentialTestError, testSavedCredential } = useInstanceCredentialTest();
		const busy = ref(false);
		const failure = ref(null);
		const failureDetail = ref(null);
		const success = ref(null);
		const modelProvider = ref("anthropic");
		const modelApiKey = ref("");
		const modelBaseUrl = ref("");
		const modelName = ref(DEFAULT_MODEL_NAME);
		const sandboxProvider = ref(null);
		const sandboxServiceUrl = ref("");
		const sandboxApiKey = ref("");
		const daytonaApiKey = ref("");
		const searchProvider = ref(null);
		const searchInput = ref("");
		const selectedExistingCredentialId = ref("");
		const hydratedModelProvider = ref(null);
		const baseline = ref("");
		let hydrationGeneration = 0;
		const modelConfig = computed(() => INSTANCE_AI_MODEL_PROVIDERS.find(({ id }) => id === modelProvider.value) ?? DEFAULT_MODEL_PROVIDER);
		const modelConnectionLocked = computed(() => store.settings?.envManaged?.model?.provider === true);
		const modelNameLocked = computed(() => store.settings?.envManaged?.model?.model === true);
		const modelOptions = computed(() => modelConnectionLocked.value ? getAllInstanceAiModelOptions(store.modelCatalog, modelName.value) : getInstanceAiModelOptions(modelProvider.value, store.modelCatalog, modelName.value));
		const sandboxEnvManaged = computed(() => store.settings?.sandboxEnvConfigured === true);
		const searchEnvManaged = computed(() => store.settings?.searchEnvConfigured === true);
		const readOnly = computed(() => !store.canManageInstanceCredentials);
		const isProxyDaytonaSelection = computed(() => props.step === "sandbox" && store.isProxyEnabled && sandboxProvider.value === "daytona" && !selectedExistingCredentialId.value);
		function assignedCredentialId() {
			if (props.step === "model") return store.settings?.modelCredentialId ?? null;
			if (props.step === "sandbox") return store.settings?.sandboxProvider === "daytona" ? store.settings?.daytonaCredentialId ?? null : store.settings?.n8nSandboxCredentialId ?? null;
			if (props.step === "search") return store.settings?.searchCredentialId ?? null;
			return null;
		}
		function credentialProviderLabel(credential) {
			if (credential.type === "daytonaApi") return SANDBOX_PROVIDER_LABELS.daytona;
			if (credential.type === "httpHeaderAuth") return SANDBOX_PROVIDER_LABELS["n8n-sandbox"];
			return credentialsStore.getCredentialTypeByName(credential.type)?.displayName ?? credential.type;
		}
		const allCompatibleCredentials = computed(() => {
			if (props.step === "done") return [];
			const credentials = props.step === "model" ? store.instanceModelCredentials : store.serviceCredentials;
			const allowedTypes = new Set(props.step === "model" ? INSTANCE_AI_MODEL_PROVIDERS.map(({ credentialType }) => credentialType) : props.step === "sandbox" ? ["daytonaApi", "httpHeaderAuth"] : INSTANCE_AI_SEARCH_PROVIDERS.map(({ credentialType }) => credentialType));
			return credentials.filter((credential) => allowedTypes.has(credential.type));
		});
		const compatibleCredentials = computed(() => {
			const assignedId = assignedCredentialId();
			return allCompatibleCredentials.value.filter((credential) => readOnly.value || credential.id !== assignedId);
		});
		const selectedExistingCredential = computed(() => compatibleCredentials.value.find(({ id }) => id === selectedExistingCredentialId.value));
		const editableConnectionLabel = computed(() => assignedCredentialId() ? i18n.baseText("instanceAi.onboarding.existingConnection.current") : i18n.baseText("instanceAi.onboarding.existingConnection.new"));
		const environmentManaged = computed(() => {
			if (props.step === "model") return modelConnectionLocked.value;
			if (props.step === "sandbox") return sandboxEnvManaged.value;
			if (props.step === "search") return searchEnvManaged.value;
			return false;
		});
		const showExistingCredentialSelect = computed(() => props.surface === "settings" && !modelConnectionLocked.value && !environmentManaged.value && allCompatibleCredentials.value.length > 1);
		function formSnapshot() {
			return JSON.stringify({
				modelProvider: modelProvider.value,
				modelApiKey: modelApiKey.value,
				modelBaseUrl: modelBaseUrl.value,
				modelName: modelName.value,
				sandboxProvider: sandboxProvider.value,
				sandboxServiceUrl: sandboxServiceUrl.value,
				sandboxApiKey: sandboxApiKey.value,
				daytonaApiKey: daytonaApiKey.value,
				searchProvider: searchProvider.value,
				searchValue: searchInput.value,
				selectedExistingCredentialId: selectedExistingCredentialId.value
			});
		}
		const changed = computed(() => formSnapshot() !== baseline.value);
		const stepReady = computed(() => {
			if (props.step === "done") return true;
			if (props.step === "model") {
				if (modelConnectionLocked.value) return modelNameLocked.value || modelName.value.trim().length > 0;
				if (selectedExistingCredentialId.value) return modelName.value.trim().length > 0;
				return Boolean(modelName.value.trim() && (modelProvider.value === "custom" ? modelBaseUrl.value.trim() : modelApiKey.value.trim()));
			}
			if (props.step === "sandbox") {
				if (sandboxEnvManaged.value) return true;
				if (selectedExistingCredentialId.value) return sandboxProvider.value === "n8n-sandbox" ? Boolean(sandboxServiceUrl.value.trim()) : true;
				if (isProxyDaytonaSelection.value) return true;
				if (sandboxProvider.value === "daytona") return Boolean(daytonaApiKey.value.trim());
				if (sandboxProvider.value === "n8n-sandbox") return Boolean(sandboxServiceUrl.value.trim() && sandboxApiKey.value.trim());
				return false;
			}
			if (searchEnvManaged.value) return true;
			if (selectedExistingCredentialId.value) return true;
			if (searchProvider.value === "disabled") return true;
			return Boolean(searchProvider.value && searchInput.value.trim());
		});
		const primaryDisabled = computed(() => busy.value || !stepReady.value || props.editMode && environmentManaged.value && (props.step !== "model" || modelNameLocked.value) || props.editMode && !props.allowUnchanged && !changed.value);
		const canGoBack = computed(() => {
			if (props.editMode) return false;
			return props.sequence.indexOf(props.step) > 0 && props.step !== "done";
		});
		const visibleSetupSteps = computed(() => props.sequence.filter((step) => step !== "done"));
		const primaryLabel = computed(() => {
			if (busy.value) return i18n.baseText("instanceAi.onboarding.wizard.testing");
			if (props.step === "done") return i18n.baseText("instanceAi.onboarding.wizard.startUsing");
			if (props.editMode) return i18n.baseText("generic.save");
			return i18n.baseText("instanceAi.onboarding.wizard.continue");
		});
		const settingsTestPrefix = computed(() => props.step === "done" ? "n8n-agent" : `n8n-agent-${props.step}`);
		const dialogTestId = computed(() => props.surface === "settings" ? `${settingsTestPrefix.value}-dialog` : "assistant-setup-wizard");
		const primaryTestId = computed(() => props.surface === "settings" ? `${settingsTestPrefix.value}-dialog-save` : "wizard-primary");
		const cancelTestId = computed(() => props.surface === "settings" ? `${settingsTestPrefix.value}-dialog-cancel` : "wizard-cancel");
		const backTestId = computed(() => props.surface === "settings" ? `${settingsTestPrefix.value}-dialog-back` : "wizard-back");
		const progressTestId = computed(() => props.surface === "settings" ? `${settingsTestPrefix.value}-dialog-step` : "wizard-progress");
		const existingCredentialTestId = computed(() => props.surface === "settings" ? `${settingsTestPrefix.value}-existing-credential-select` : "assistant-existing-credential");
		function readString(data, field) {
			if (typeof data !== "object" || data === null) return "";
			const value = Reflect.get(data, field);
			return typeof value === "string" ? value : "";
		}
		async function credentialData(id) {
			if (!id) return void 0;
			try {
				const credential = await credentialsStore.getCredentialData({ id });
				if (!credential || !("data" in credential)) return void 0;
				return credential.data;
			} catch {
				return;
			}
		}
		function modelProviderForCredentialType(type) {
			if (type === "anthropicApi") return "anthropic";
			if (type === "openRouterApi") return "openrouter";
			return "openai";
		}
		function applyExistingCredential(credential) {
			selectedExistingCredentialId.value = credential.id;
			if (props.step === "model") {
				modelProvider.value = modelProviderForCredentialType(credential.type);
				modelName.value = (credential.id === assignedCredentialId() ? store.settings?.modelName : null) || INSTANCE_AI_CURATED_MODELS[modelProvider.value][0] || "";
			} else if (props.step === "sandbox") sandboxProvider.value = credential.type === "daytonaApi" ? "daytona" : "n8n-sandbox";
			else if (props.step === "search") searchProvider.value = credential.type === "braveSearchApi" ? "brave" : "searxng";
		}
		async function selectExistingCredential(value) {
			const credential = compatibleCredentials.value.find(({ id }) => id === value);
			if (credential) {
				applyExistingCredential(credential);
				return;
			}
			selectedExistingCredentialId.value = "";
			const generation = ++hydrationGeneration;
			if (props.step === "model") await hydrateModel(generation);
			if (props.step === "sandbox") await hydrateSandbox(generation);
			if (props.step === "search") await hydrateSearch(generation);
		}
		async function hydrateModel(generation, rememberProvider = true) {
			if (rememberProvider) hydratedModelProvider.value = null;
			selectedExistingCredentialId.value = "";
			modelProvider.value = "anthropic";
			modelApiKey.value = "";
			modelBaseUrl.value = "";
			modelName.value = store.settings?.modelName || DEFAULT_MODEL_NAME;
			if (modelConnectionLocked.value) {
				if (modelNameLocked.value) modelName.value = "";
				return;
			}
			const assigned = store.instanceModelCredentials.find(({ id }) => id === store.settings?.modelCredentialId);
			if (!assigned) return;
			if (readOnly.value) {
				applyExistingCredential(assigned);
				if (rememberProvider) hydratedModelProvider.value = modelProvider.value;
				return;
			}
			const data = await credentialData(assigned.id);
			if (generation !== hydrationGeneration) return;
			modelApiKey.value = readString(data, "apiKey");
			modelBaseUrl.value = readString(data, "url");
			modelProvider.value = assigned.type === "openAiApi" && modelBaseUrl.value ? "custom" : modelProviderForCredentialType(assigned.type);
			if (rememberProvider) hydratedModelProvider.value = modelProvider.value;
		}
		async function hydrateSandbox(generation) {
			selectedExistingCredentialId.value = "";
			sandboxProvider.value = null;
			sandboxServiceUrl.value = store.settings?.n8nSandboxServiceUrl ?? "";
			sandboxApiKey.value = "";
			daytonaApiKey.value = "";
			if (sandboxEnvManaged.value) return;
			const isDaytona = store.settings?.sandboxProvider === "daytona";
			const credentialId = isDaytona ? store.settings?.daytonaCredentialId : store.settings?.n8nSandboxCredentialId;
			if (!credentialId) return;
			sandboxProvider.value = isDaytona ? "daytona" : "n8n-sandbox";
			const assigned = store.serviceCredentials.find(({ id }) => id === credentialId);
			if (readOnly.value && assigned) {
				applyExistingCredential(assigned);
				return;
			}
			const data = await credentialData(credentialId);
			if (generation !== hydrationGeneration) return;
			if (isDaytona) daytonaApiKey.value = readString(data, "apiKey");
			else sandboxApiKey.value = readString(data, "value");
		}
		async function hydrateSearch(generation) {
			selectedExistingCredentialId.value = "";
			searchProvider.value = store.settings?.searchDisabled ? "disabled" : null;
			searchInput.value = "";
			if (searchEnvManaged.value) return;
			const assigned = store.serviceCredentials.find(({ id }) => id === store.settings?.searchCredentialId);
			if (!assigned) return;
			if (readOnly.value) {
				applyExistingCredential(assigned);
				return;
			}
			const data = await credentialData(assigned.id);
			if (generation !== hydrationGeneration) return;
			searchProvider.value = assigned.type === "braveSearchApi" ? "brave" : "searxng";
			searchInput.value = readString(data, assigned.type === "braveSearchApi" ? "apiKey" : "apiUrl");
		}
		async function hydrate() {
			const generation = ++hydrationGeneration;
			failure.value = null;
			failureDetail.value = null;
			success.value = null;
			if (props.step === "model") await hydrateModel(generation);
			if (props.step === "sandbox") await hydrateSandbox(generation);
			if (props.step === "search") await hydrateSearch(generation);
			if (generation !== hydrationGeneration) return;
			await nextTick();
			baseline.value = formSnapshot();
		}
		watch(() => [props.open, props.step], async ([open]) => {
			if (!open) return;
			await hydrate();
			if (props.step === "model" && modelProvider.value !== "custom") store.loadModelCatalog();
		}, { immediate: true });
		watch([
			modelProvider,
			modelApiKey,
			modelBaseUrl,
			modelName,
			sandboxProvider,
			sandboxServiceUrl,
			sandboxApiKey,
			daytonaApiKey,
			searchProvider,
			searchInput,
			selectedExistingCredentialId
		], () => {
			failure.value = null;
			failureDetail.value = null;
			success.value = null;
			credentialTestError.value = "";
		});
		async function selectModelProvider(provider) {
			const next = INSTANCE_AI_MODEL_PROVIDERS.find(({ id }) => id === provider);
			if (!next) return;
			if (store.instanceModelCredentials.find(({ id }) => id === store.settings?.modelCredentialId) && hydratedModelProvider.value === next.id) {
				await hydrateModel(++hydrationGeneration, false);
				return;
			}
			selectedExistingCredentialId.value = "";
			modelProvider.value = next.id;
			modelApiKey.value = "";
			modelBaseUrl.value = "";
			modelName.value = INSTANCE_AI_CURATED_MODELS[next.id][0] ?? "";
			if (next.id !== "custom") store.loadModelCatalog();
		}
		function selectSandboxProvider(provider) {
			const next = INSTANCE_AI_SANDBOX_PROVIDERS.find(({ id }) => id === provider);
			if (next) {
				selectedExistingCredentialId.value = "";
				sandboxProvider.value = next.id;
			}
		}
		function selectSearchProvider(provider) {
			selectedExistingCredentialId.value = "";
			if (provider === "disabled") {
				searchProvider.value = provider;
				return;
			}
			const next = INSTANCE_AI_SEARCH_PROVIDERS.find(({ id }) => id === provider);
			if (next) searchProvider.value = next.id;
		}
		function modelConnection() {
			const data = {};
			if (modelApiKey.value.trim()) data.apiKey = modelApiKey.value.trim();
			if (modelProvider.value === "custom") data.url = modelBaseUrl.value.trim();
			return {
				type: modelConfig.value.credentialType,
				data
			};
		}
		function sandboxConnection() {
			if (sandboxProvider.value === "daytona") return {
				type: "daytonaApi",
				data: {
					apiUrl: DAYTONA_API_URL,
					apiKey: daytonaApiKey.value.trim()
				}
			};
			if (sandboxProvider.value === "n8n-sandbox") return {
				type: "httpHeaderAuth",
				data: {
					name: N8N_SANDBOX_HEADER,
					value: sandboxApiKey.value.trim()
				}
			};
		}
		function searchConnection() {
			const provider = INSTANCE_AI_SEARCH_PROVIDERS.find(({ id }) => id === searchProvider.value);
			if (!provider) return void 0;
			return {
				type: provider.credentialType,
				data: { [provider.id === "brave" ? "apiKey" : "apiUrl"]: searchInput.value.trim() }
			};
		}
		async function saveVerifiedModel() {
			if (modelConnectionLocked.value) {
				if (!modelNameLocked.value) store.setField("modelName", modelName.value.trim());
			} else {
				store.setField("modelConnection", modelConnection());
				store.setField("modelName", modelName.value.trim());
			}
			if (sandboxEnvManaged.value && store.settings?.sandboxEnabled !== true) store.setField("sandboxEnabled", true);
			const saved = await store.save(false);
			if (saved) await store.refreshInstanceModelCredentials();
			return saved;
		}
		async function saveVerifiedSandbox(connection) {
			store.setField("sandboxConnection", connection);
			store.setField("sandboxProvider", sandboxProvider.value ?? void 0);
			store.setField("sandboxEnabled", true);
			if (sandboxProvider.value === "n8n-sandbox") store.setField("n8nSandboxServiceUrl", sandboxServiceUrl.value.trim());
			const saved = await store.save(false);
			if (saved) await store.refreshCredentials();
			return saved;
		}
		async function saveSearchDecision(connection) {
			if (searchProvider.value === "disabled") store.setField("searchDisabled", true);
			else if (connection) {
				store.setField("searchConnection", connection);
				store.setField("searchDisabled", false);
			}
			const saved = await store.save(false);
			if (saved) await store.refreshCredentials();
			return saved;
		}
		async function saveExistingCredential() {
			const credential = selectedExistingCredential.value;
			if (!credential) return false;
			if (props.step === "model") {
				store.setField("modelCredentialId", credential.id);
				store.setField("modelName", modelName.value.trim());
			} else if (props.step === "sandbox") {
				const provider = credential.type === "daytonaApi" ? "daytona" : "n8n-sandbox";
				store.setField("daytonaCredentialId", provider === "daytona" ? credential.id : null);
				store.setField("n8nSandboxCredentialId", provider === "n8n-sandbox" ? credential.id : null);
				store.setField("sandboxProvider", provider);
				store.setField("sandboxEnabled", true);
				if (provider === "n8n-sandbox") store.setField("n8nSandboxServiceUrl", sandboxServiceUrl.value.trim());
			} else if (props.step === "search") {
				store.setField("searchCredentialId", credential.id);
				store.setField("searchDisabled", false);
			}
			if (!await store.save(false)) return false;
			if (props.step === "model") await store.refreshInstanceModelCredentials();
			else await store.refreshCredentials();
			return true;
		}
		async function verifyExistingCredential() {
			const credential = selectedExistingCredential.value;
			if (!credential) return {
				ok: false,
				failure: "provider_error"
			};
			return await testSavedCredential(credential.id, credential.name, credential.type) ? { ok: true } : {
				ok: false,
				failure: "provider_error",
				error: credentialTestError.value ? sanitizeFailureDetail(credentialTestError.value) : void 0
			};
		}
		async function runVerification() {
			if (selectedExistingCredentialId.value) return await verifyExistingCredential();
			if (props.step === "model") return await store.verifyModel({
				...modelConnectionLocked.value ? {} : { connection: modelConnection() },
				modelName: modelName.value.trim()
			});
			if (props.step === "sandbox") {
				if (sandboxEnvManaged.value) return await store.verifySandbox({ provider: store.settings?.sandboxProvider });
				if (isProxyDaytonaSelection.value) return { ok: true };
				const connection = sandboxConnection();
				if (!connection || !sandboxProvider.value) return null;
				return await store.verifySandbox({
					provider: sandboxProvider.value,
					connection,
					...sandboxProvider.value === "n8n-sandbox" ? { serviceUrl: sandboxServiceUrl.value.trim() } : {}
				});
			}
			if (props.step === "search") {
				if (searchEnvManaged.value || searchProvider.value === "disabled") return { ok: true };
				const connection = searchConnection();
				return connection ? await store.verifySearch({ connection }) : null;
			}
			return { ok: true };
		}
		async function handlePrimary() {
			if (props.step === "done") {
				emit("completed");
				return;
			}
			busy.value = true;
			failure.value = null;
			failureDetail.value = null;
			success.value = null;
			try {
				const result = await runVerification();
				if (!result?.ok) {
					failure.value = result?.failure ?? "provider_error";
					failureDetail.value = result?.ok === false ? result.error ?? null : null;
					return;
				}
				let saved = true;
				if (selectedExistingCredentialId.value) saved = await saveExistingCredential();
				else if (props.step === "model") saved = await saveVerifiedModel();
				else if (props.step === "sandbox") {
					if (sandboxEnvManaged.value) {
						store.setField("sandboxEnabled", true);
						saved = await store.save(false);
					} else if (isProxyDaytonaSelection.value) {
						store.setField("sandboxProvider", "daytona");
						saved = await store.save(false);
					} else {
						const connection = sandboxConnection();
						saved = connection ? await saveVerifiedSandbox(connection) : false;
					}
				} else if (props.step === "search" && !searchEnvManaged.value) saved = await saveSearchDecision(searchConnection());
				if (saved) {
					success.value = result;
					if (props.surface === "onboarding") {
						await nextTick();
						await new Promise((resolve) => window.setTimeout(resolve, SUCCESS_PAUSE_MS));
					}
					emit("advance");
				}
			} catch (error) {
				failure.value = "provider_error";
				failureDetail.value = error instanceof Error && error.message ? sanitizeFailureDetail(error.message) : null;
			} finally {
				busy.value = false;
			}
		}
		function handleOpenChange(value) {
			if (!value && busy.value) return;
			emit("update:open", value);
		}
		function focusDialogInsteadOfFirstField(event) {
			event.preventDefault();
			if (event.target instanceof HTMLElement) event.target.focus();
		}
		const failureKey = computed(() => VERIFICATION_FAILURE_COPY[failure.value ?? "provider_error"]);
		const successMessage = computed(() => {
			if (!success.value) return "";
			if (props.step === "model") return i18n.baseText("instanceAi.onboarding.model.success", { interpolate: { latency: String(success.value.latencyMs ?? 0) } });
			if (props.step === "sandbox") return i18n.baseText("instanceAi.onboarding.sandbox.success", { interpolate: { seconds: ((success.value.startupMs ?? 0) / 1e3).toFixed(1) } });
			return i18n.baseText("instanceAi.onboarding.search.success", { interpolate: { count: String(success.value.resultCount ?? 0) } });
		});
		const modelProviderLabel = (provider) => provider.label ?? i18n.baseText("instanceAi.onboarding.model.customProvider");
		const existingCredentialLabel = (credential) => `${credential.name} · ${credentialProviderLabel(credential)}`;
		const stepTitle = computed(() => {
			if (props.step === "model") return i18n.baseText("instanceAi.onboarding.model.title");
			if (props.step === "sandbox") return i18n.baseText("instanceAi.onboarding.sandbox.title");
			if (props.step === "search") return i18n.baseText("instanceAi.onboarding.search.title");
			return "";
		});
		const stepLede = computed(() => {
			if (props.step === "model") return i18n.baseText("instanceAi.onboarding.model.lede");
			if (props.step === "sandbox") return i18n.baseText("instanceAi.onboarding.sandbox.lede");
			if (props.step === "search") return i18n.baseText("instanceAi.onboarding.search.lede");
			return "";
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: __props.step === "done" && __props.composeFastPath ? "small" : "large",
				"show-close-button": !busy.value && __props.step !== "done",
				"aria-label": unref(i18n).baseText("instanceAi.onboarding.wizard.ariaLabel"),
				"data-test-id": dialogTestId.value,
				"close-on-overlay-click": false,
				"onUpdate:open": handleOpenChange,
				onOpenAutoFocus: focusDialogInsteadOfFirstField
			}, {
				default: withCtx(() => [
					stepTitle.value ? (openBlock(), createBlock(unref(DialogHeader_default), { key: 0 }, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.heading) }, [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(stepTitle.value), 1)]),
							_: 1
						}), stepLede.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							tag: "p",
							class: normalizeClass(_ctx.$style.description)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(stepLede.value), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)], 2)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [
							__props.step === "model" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
								modelConnectionLocked.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "warning"
								}, {
									default: withCtx(() => [
										createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.title")), 1),
										createTextVNode(" " + toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.description")) + " ", 1),
										createVNode(unref(N8nLink_default), {
											to: ENV_DOCS_URL,
											size: "small",
											"new-window": ""
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.docs")), 1)]),
											_: 1
										})
									]),
									_: 1
								})) : createCommentVNode("", true),
								showExistingCredentialSelect.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
									key: 1,
									class: normalizeClass(_ctx.$style.compactLabel),
									label: unref(i18n).baseText("instanceAi.onboarding.existingConnection.label"),
									"input-name": "assistant-existing-model-credential"
								}, {
									default: withCtx(() => [createVNode(unref(N8nSelect_default), {
										id: "assistant-existing-model-credential",
										"model-value": selectedExistingCredentialId.value,
										teleported: true,
										"data-test-id": existingCredentialTestId.value,
										"onUpdate:modelValue": selectExistingCredential
									}, {
										default: withCtx(() => [!readOnly.value ? (openBlock(), createBlock(unref(N8nOption_default), {
											key: 0,
											value: "",
											label: editableConnectionLabel.value
										}, null, 8, ["label"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(compatibleCredentials.value, (credential) => {
											return openBlock(), createBlock(unref(N8nOption_default), {
												key: credential.id,
												value: credential.id,
												label: existingCredentialLabel(credential)
											}, null, 8, ["value", "label"]);
										}), 128))]),
										_: 1
									}, 8, ["model-value", "data-test-id"])]),
									_: 1
								}, 8, ["class", "label"])) : createCommentVNode("", true),
								createBaseVNode("div", { class: normalizeClass(_ctx.$style.fields) }, [
									createVNode(unref(N8nInputLabel_default), {
										class: normalizeClass(_ctx.$style.compactLabel),
										label: unref(i18n).baseText("instanceAi.onboarding.model.provider"),
										"input-name": "assistant-model-provider"
									}, {
										default: withCtx(() => [modelConnectionLocked.value || readOnly.value || selectedExistingCredentialId.value ? (openBlock(), createBlock(unref(Input_default), {
											key: 0,
											id: "assistant-model-provider",
											"model-value": selectedExistingCredential.value ? credentialProviderLabel(selectedExistingCredential.value) : STATIC_SECRET_MASK,
											disabled: "",
											"data-test-id": __props.surface === "settings" ? "n8n-agent-model-provider-input" : void 0
										}, null, 8, ["model-value", "data-test-id"])) : (openBlock(), createBlock(unref(N8nSelect_default), {
											key: 1,
											id: "assistant-model-provider",
											"model-value": modelProvider.value,
											teleported: true,
											"data-test-id": __props.surface === "settings" ? "n8n-agent-model-provider-select" : "assistant-model-provider",
											"onUpdate:modelValue": selectModelProvider
										}, {
											default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(INSTANCE_AI_MODEL_PROVIDERS), (provider) => {
												return openBlock(), createBlock(unref(N8nOption_default), {
													key: provider.id,
													value: provider.id,
													label: modelProviderLabel(provider)
												}, null, 8, ["value", "label"]);
											}), 128))]),
											_: 1
										}, 8, ["model-value", "data-test-id"]))]),
										_: 1
									}, 8, ["class", "label"]),
									modelProvider.value === "custom" && !modelConnectionLocked.value && !selectedExistingCredentialId.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
										key: 0,
										class: normalizeClass(_ctx.$style.compactLabel),
										label: unref(i18n).baseText("instanceAi.onboarding.model.baseUrl"),
										"input-name": "assistant-model-base-url"
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: "assistant-model-base-url",
											modelValue: modelBaseUrl.value,
											"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelBaseUrl.value = $event),
											class: "ph-no-capture",
											type: "text",
											autocomplete: "off",
											spellcheck: false,
											placeholder: "http://ollama.internal:11434/v1",
											"data-test-id": "assistant-model-base-url"
										}, null, 8, ["modelValue"])]),
										_: 1
									}, 8, ["class", "label"])) : createCommentVNode("", true),
									createVNode(unref(N8nInputLabel_default), {
										class: normalizeClass(_ctx.$style.compactLabel),
										label: unref(i18n).baseText("instanceAi.onboarding.model.apiKey"),
										"input-name": "assistant-model-api-key"
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: "assistant-model-api-key",
											modelValue: modelApiKey.value,
											"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => modelApiKey.value = $event),
											class: "ph-no-capture",
											type: "password",
											autocomplete: "off",
											spellcheck: false,
											disabled: modelConnectionLocked.value || readOnly.value || Boolean(selectedExistingCredentialId.value),
											placeholder: modelConnectionLocked.value || readOnly.value || selectedExistingCredentialId.value ? STATIC_SECRET_MASK : modelConfig.value.placeholder,
											"data-test-id": __props.surface === "settings" ? "n8n-agent-model-api-key-input" : "assistant-model-api-key"
										}, null, 8, [
											"modelValue",
											"disabled",
											"placeholder",
											"data-test-id"
										])]),
										_: 1
									}, 8, ["class", "label"]),
									createVNode(unref(N8nInputLabel_default), {
										class: normalizeClass(_ctx.$style.compactLabel),
										label: unref(i18n).baseText("instanceAi.onboarding.model.model"),
										"input-name": "assistant-model-name"
									}, {
										default: withCtx(() => [modelOptions.value.length && !modelNameLocked.value ? (openBlock(), createBlock(unref(N8nSelect_default), {
											key: 0,
											id: "assistant-model-name",
											"model-value": modelName.value,
											teleported: true,
											filterable: "",
											disabled: readOnly.value,
											"data-test-id": __props.surface === "settings" ? "n8n-agent-model-name-input" : "assistant-model-name",
											"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => modelName.value = String($event ?? ""))
										}, {
											default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(modelOptions.value, (model) => {
												return openBlock(), createBlock(unref(N8nOption_default), {
													key: model.id,
													value: model.id,
													label: model.recommended ? `${model.name} · ${unref(i18n).baseText("instanceAi.onboarding.recommended")}` : model.name
												}, null, 8, ["value", "label"]);
											}), 128))]),
											_: 1
										}, 8, [
											"model-value",
											"disabled",
											"data-test-id"
										])) : (openBlock(), createBlock(unref(Input_default), {
											key: 1,
											id: "assistant-model-name",
											modelValue: modelName.value,
											"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => modelName.value = $event),
											class: "ph-no-capture",
											disabled: modelNameLocked.value || readOnly.value,
											placeholder: modelNameLocked.value ? STATIC_SECRET_MASK : "qwen3-coder",
											spellcheck: false,
											"data-test-id": __props.surface === "settings" ? "n8n-agent-model-name-input" : "assistant-model-name"
										}, null, 8, [
											"modelValue",
											"disabled",
											"placeholder",
											"data-test-id"
										]))]),
										_: 1
									}, 8, ["class", "label"]),
									modelProvider.value === "anthropic" && !modelNameLocked.value ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 1,
										step: "xs",
										color: "text-light",
										class: normalizeClass(_ctx.$style.fieldHint)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.model.anthropicHint")), 1)]),
										_: 1
									}, 8, ["class"])) : createCommentVNode("", true)
								], 2),
								modelProvider.value === "custom" && !modelConnectionLocked.value && !selectedExistingCredentialId.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 2,
									theme: "warning",
									icon: "triangle-alert"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.model.weakModelWarning")), 1)]),
									_: 1
								})) : createCommentVNode("", true)
							], 64)) : __props.step === "sandbox" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
								sandboxEnvManaged.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "warning"
								}, {
									default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.title")), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.description")), 1)]),
									_: 1
								})) : createCommentVNode("", true),
								showExistingCredentialSelect.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
									key: 1,
									class: normalizeClass(_ctx.$style.compactLabel),
									label: unref(i18n).baseText("instanceAi.onboarding.existingConnection.label"),
									"input-name": "assistant-existing-sandbox-credential"
								}, {
									default: withCtx(() => [createVNode(unref(N8nSelect_default), {
										id: "assistant-existing-sandbox-credential",
										"model-value": selectedExistingCredentialId.value,
										teleported: true,
										"data-test-id": existingCredentialTestId.value,
										"onUpdate:modelValue": selectExistingCredential
									}, {
										default: withCtx(() => [!readOnly.value ? (openBlock(), createBlock(unref(N8nOption_default), {
											key: 0,
											value: "",
											label: editableConnectionLabel.value
										}, null, 8, ["label"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(compatibleCredentials.value, (credential) => {
											return openBlock(), createBlock(unref(N8nOption_default), {
												key: credential.id,
												value: credential.id,
												label: existingCredentialLabel(credential)
											}, null, 8, ["value", "label"]);
										}), 128))]),
										_: 1
									}, 8, ["model-value", "data-test-id"])]),
									_: 1
								}, 8, ["class", "label"])) : createCommentVNode("", true),
								!sandboxEnvManaged.value && !readOnly.value && !selectedExistingCredentialId.value ? (openBlock(), createBlock(unref(RadioGroup_default), {
									key: 2,
									"model-value": sandboxProvider.value ?? void 0,
									orientation: "vertical",
									class: normalizeClass(_ctx.$style.joinedCards),
									"data-test-id": __props.surface === "settings" ? "n8n-agent-sandbox-provider-select" : void 0,
									"onUpdate:modelValue": selectSandboxProvider
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(INSTANCE_AI_SANDBOX_PROVIDERS), (provider) => {
										return openBlock(), createElementBlock("div", {
											key: provider.id,
											class: normalizeClass(_ctx.$style.optionCard),
											"data-test-id": `assistant-sandbox-${provider.id}`,
											onClick: ($event) => selectSandboxProvider(provider.id)
										}, [createVNode(unref(RadioGroupItem_default), {
											id: `assistant-sandbox-radio-${provider.id}`,
											value: provider.id,
											"aria-label": provider.onboardingLabel,
											class: normalizeClass(_ctx.$style.optionControl)
										}, null, 8, [
											"id",
											"value",
											"aria-label",
											"class"
										]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionCopy) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionTitle) }, [createVNode(unref(N8nText_default), {
											bold: "",
											step: "sm"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(provider.onboardingLabel), 1)]),
											_: 2
										}, 1024), createVNode(unref(N8nBadge_default), {
											variant: provider.id === "n8n-sandbox" ? "secondary" : "outline",
											class: normalizeClass(_ctx.$style.optionBadge)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(provider.id === "n8n-sandbox" ? unref(i18n).baseText("instanceAi.onboarding.sandbox.freeRecommended") : unref(i18n).baseText("instanceAi.onboarding.sandbox.paid")), 1)]),
											_: 2
										}, 1032, ["variant", "class"])], 2), createVNode(unref(N8nText_default), {
											color: "text-base",
											step: "sm",
											class: normalizeClass(_ctx.$style.optionDescription)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(provider.id === "n8n-sandbox" ? unref(i18n).baseText("instanceAi.onboarding.sandbox.n8nDescription") : unref(i18n).baseText("instanceAi.onboarding.sandbox.daytonaDescription")), 1)]),
											_: 2
										}, 1032, ["class"])], 2)], 10, _hoisted_1);
									}), 128))]),
									_: 1
								}, 8, [
									"model-value",
									"class",
									"data-test-id"
								])) : createCommentVNode("", true),
								!sandboxEnvManaged.value && sandboxProvider.value === "n8n-sandbox" ? (openBlock(), createElementBlock("div", {
									key: 3,
									class: normalizeClass(_ctx.$style.fields),
									"data-test-id": __props.surface === "settings" ? "n8n-agent-sandbox-connection-fields" : void 0
								}, [
									createVNode(unref(N8nText_default), { step: "xs" }, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.sandbox.installDescription")) + " ", 1), createVNode(unref(N8nLink_default), {
											to: SANDBOX_DOCS_URL,
											"new-window": ""
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.sandbox.installLink")), 1)]),
											_: 1
										})]),
										_: 1
									}),
									createVNode(unref(N8nInputLabel_default), {
										class: normalizeClass(_ctx.$style.compactLabel),
										label: unref(i18n).baseText("instanceAi.onboarding.sandbox.serviceUrl"),
										"input-name": "assistant-sandbox-url"
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: "assistant-sandbox-url",
											modelValue: sandboxServiceUrl.value,
											"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => sandboxServiceUrl.value = $event),
											class: "ph-no-capture",
											type: "text",
											autocomplete: "off",
											spellcheck: false,
											placeholder: "http://sandbox.internal:3200",
											"data-test-id": "assistant-sandbox-url"
										}, null, 8, ["modelValue"])]),
										_: 1
									}, 8, ["class", "label"]),
									!selectedExistingCredentialId.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
										key: 0,
										class: normalizeClass(_ctx.$style.compactLabel),
										label: unref(i18n).baseText("instanceAi.onboarding.sandbox.apiKey"),
										"input-name": "assistant-sandbox-api-key"
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: "assistant-sandbox-api-key",
											modelValue: sandboxApiKey.value,
											"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => sandboxApiKey.value = $event),
											class: "ph-no-capture",
											type: "password",
											autocomplete: "off",
											spellcheck: false,
											placeholder: unref(i18n).baseText("instanceAi.onboarding.sandbox.apiKeyPlaceholder"),
											"data-test-id": __props.surface === "settings" ? "n8n-agent-sandbox-api-key-input" : "assistant-sandbox-api-key"
										}, null, 8, [
											"modelValue",
											"placeholder",
											"data-test-id"
										])]),
										_: 1
									}, 8, ["class", "label"])) : createCommentVNode("", true)
								], 10, _hoisted_2)) : !sandboxEnvManaged.value && sandboxProvider.value === "daytona" && !selectedExistingCredentialId.value && !isProxyDaytonaSelection.value ? (openBlock(), createElementBlock("div", {
									key: 4,
									class: normalizeClass(_ctx.$style.fields),
									"data-test-id": __props.surface === "settings" ? "n8n-agent-sandbox-connection-fields" : void 0
								}, [createVNode(unref(N8nInputLabel_default), {
									class: normalizeClass(_ctx.$style.compactLabel),
									label: unref(i18n).baseText("instanceAi.onboarding.sandbox.apiKey"),
									"input-name": "assistant-daytona-api-key"
								}, {
									default: withCtx(() => [createVNode(unref(Input_default), {
										id: "assistant-daytona-api-key",
										modelValue: daytonaApiKey.value,
										"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => daytonaApiKey.value = $event),
										class: "ph-no-capture",
										type: "password",
										autocomplete: "off",
										spellcheck: false,
										placeholder: "dtn_…",
										"data-test-id": "assistant-daytona-api-key"
									}, null, 8, ["modelValue"])]),
									_: 1
								}, 8, ["class", "label"]), createVNode(unref(N8nText_default), {
									step: "xs",
									color: "text-light"
								}, {
									default: withCtx(() => [
										createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.sandbox.daytonaKey")) + " ", 1),
										createVNode(unref(N8nLink_default), {
											to: "https://app.daytona.io",
											"new-window": ""
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.sandbox.daytonaDashboard")), 1)]),
											_: 1
										}),
										_cache[10] || (_cache[10] = createTextVNode(". ", -1))
									]),
									_: 1
								})], 10, _hoisted_3)) : createCommentVNode("", true)
							], 64)) : __props.step === "search" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
								searchEnvManaged.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "warning"
								}, {
									default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.title")), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("instanceAi.onboarding.env.description")), 1)]),
									_: 1
								})) : createCommentVNode("", true),
								showExistingCredentialSelect.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
									key: 1,
									class: normalizeClass(_ctx.$style.compactLabel),
									label: unref(i18n).baseText("instanceAi.onboarding.existingConnection.label"),
									"input-name": "assistant-existing-search-credential"
								}, {
									default: withCtx(() => [createVNode(unref(N8nSelect_default), {
										id: "assistant-existing-search-credential",
										"model-value": selectedExistingCredentialId.value,
										teleported: true,
										"data-test-id": existingCredentialTestId.value,
										"onUpdate:modelValue": selectExistingCredential
									}, {
										default: withCtx(() => [!readOnly.value ? (openBlock(), createBlock(unref(N8nOption_default), {
											key: 0,
											value: "",
											label: editableConnectionLabel.value
										}, null, 8, ["label"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(compatibleCredentials.value, (credential) => {
											return openBlock(), createBlock(unref(N8nOption_default), {
												key: credential.id,
												value: credential.id,
												label: existingCredentialLabel(credential)
											}, null, 8, ["value", "label"]);
										}), 128))]),
										_: 1
									}, 8, ["model-value", "data-test-id"])]),
									_: 1
								}, 8, ["class", "label"])) : createCommentVNode("", true),
								!searchEnvManaged.value && !readOnly.value && !selectedExistingCredentialId.value ? (openBlock(), createBlock(unref(RadioGroup_default), {
									key: 2,
									"model-value": searchProvider.value ?? void 0,
									orientation: "vertical",
									class: normalizeClass(_ctx.$style.joinedCards),
									"data-test-id": __props.surface === "settings" ? "n8n-agent-search-provider-select" : void 0,
									"onUpdate:modelValue": selectSearchProvider
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList([...unref(INSTANCE_AI_SEARCH_PROVIDERS), {
										id: "disabled",
										label: unref(i18n).baseText("instanceAi.onboarding.search.disable")
									}], (provider) => {
										return openBlock(), createElementBlock("div", {
											key: provider.id,
											class: normalizeClass(_ctx.$style.optionCard),
											"data-test-id": `assistant-search-${provider.id}`,
											onClick: ($event) => selectSearchProvider(provider.id)
										}, [createVNode(unref(RadioGroupItem_default), {
											id: `assistant-search-radio-${provider.id}`,
											value: provider.id,
											"aria-label": provider.label,
											class: normalizeClass(_ctx.$style.optionControl)
										}, null, 8, [
											"id",
											"value",
											"aria-label",
											"class"
										]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionCopy) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionTitle) }, [createVNode(unref(N8nText_default), {
											bold: "",
											step: "sm"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(provider.label), 1)]),
											_: 2
										}, 1024), provider.id === "searxng" ? (openBlock(), createBlock(unref(N8nBadge_default), {
											key: 0,
											variant: "secondary",
											class: normalizeClass(_ctx.$style.optionBadge)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.free")), 1)]),
											_: 1
										}, 8, ["class"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nText_default), {
											color: "text-base",
											step: "sm",
											class: normalizeClass(_ctx.$style.optionDescription)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(provider.id === "searxng" ? unref(i18n).baseText("instanceAi.onboarding.search.searxngDescription") : provider.id === "brave" ? unref(i18n).baseText("instanceAi.onboarding.search.braveDescription") : unref(i18n).baseText("instanceAi.onboarding.search.disabledDescription")), 1)]),
											_: 2
										}, 1032, ["class"])], 2)], 10, _hoisted_4);
									}), 128))]),
									_: 1
								}, 8, [
									"model-value",
									"class",
									"data-test-id"
								])) : createCommentVNode("", true),
								!searchEnvManaged.value && !selectedExistingCredentialId.value && searchProvider.value && searchProvider.value !== "disabled" ? (openBlock(), createElementBlock("div", {
									key: 3,
									class: normalizeClass(_ctx.$style.fields),
									"data-test-id": __props.surface === "settings" ? "n8n-agent-search-connection-fields" : void 0
								}, [searchProvider.value === "searxng" ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									step: "xs"
								}, {
									default: withCtx(() => [
										createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.installDescription")) + " ", 1),
										createVNode(unref(N8nLink_default), {
											to: SEARCH_DOCS_URL,
											"new-window": ""
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.installLink")), 1)]),
											_: 1
										}),
										createTextVNode(", " + toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.searxngInstallSuffix")), 1)
									]),
									_: 1
								})) : (openBlock(), createBlock(unref(N8nText_default), {
									key: 1,
									step: "xs"
								}, {
									default: withCtx(() => [
										createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.braveKeyDescription")) + " ", 1),
										createVNode(unref(N8nLink_default), {
											to: BRAVE_SEARCH_KEYS_URL,
											"new-window": ""
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.braveKeyLink")), 1)]),
											_: 1
										}),
										createTextVNode(", " + toDisplayString(unref(i18n).baseText("instanceAi.onboarding.search.braveKeySuffix")), 1)
									]),
									_: 1
								})), createVNode(unref(N8nInputLabel_default), {
									class: normalizeClass(_ctx.$style.compactLabel),
									label: searchProvider.value === "brave" ? unref(i18n).baseText("instanceAi.onboarding.search.apiKey") : unref(i18n).baseText("instanceAi.onboarding.search.instanceUrl"),
									"input-name": "assistant-search-value"
								}, {
									default: withCtx(() => [createVNode(unref(Input_default), {
										id: "assistant-search-value",
										modelValue: searchInput.value,
										"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => searchInput.value = $event),
										class: "ph-no-capture",
										type: searchProvider.value === "brave" ? "password" : "text",
										autocomplete: "off",
										spellcheck: false,
										placeholder: searchProvider.value === "brave" ? "BSA…" : "http://searxng.internal:8080",
										"data-test-id": "assistant-search-value"
									}, null, 8, [
										"modelValue",
										"type",
										"placeholder"
									])]),
									_: 1
								}, 8, ["class", "label"])], 10, _hoisted_5)) : createCommentVNode("", true)
							], 64)) : (openBlock(), createElementBlock("div", {
								key: 3,
								class: normalizeClass(_ctx.$style.done)
							}, [
								createVNode(unref(N8nIcon_default), {
									icon: "circle-check",
									size: 32,
									class: normalizeClass(_ctx.$style.successIcon)
								}, null, 8, ["class"]),
								createVNode(unref(DialogTitle_default), null, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.done.title")), 1)]),
									_: 1
								}),
								!__props.composeFastPath ? (openBlock(), createElementBlock("div", {
									key: 0,
									class: normalizeClass(_ctx.$style.summary)
								}, [(openBlock(true), createElementBlock(Fragment, null, renderList([
									{
										id: "model",
										label: unref(i18n).baseText("instanceAi.onboarding.model.label"),
										description: unref(i18n).baseText("instanceAi.onboarding.model.description"),
										value: __props.modelValue
									},
									{
										id: "sandbox",
										label: unref(i18n).baseText("instanceAi.onboarding.sandbox.label"),
										description: unref(i18n).baseText("instanceAi.onboarding.sandbox.description"),
										value: __props.sandboxValue
									},
									{
										id: "search",
										label: unref(i18n).baseText("instanceAi.onboarding.search.label"),
										description: unref(i18n).baseText("instanceAi.onboarding.search.description"),
										value: props.searchValue
									}
								], (item) => {
									return openBlock(), createElementBlock("button", {
										key: item.id,
										type: "button",
										class: normalizeClass(_ctx.$style.summaryRow),
										onClick: ($event) => emit("edit", item.id)
									}, [
										createBaseVNode("span", { class: normalizeClass(_ctx.$style.summaryCopy) }, [createVNode(unref(N8nText_default), { bold: "" }, {
											default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
											_: 2
										}, 1024), createVNode(unref(N8nText_default), {
											step: "xs",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(item.description), 1)]),
											_: 2
										}, 1024)], 2),
										createVNode(unref(N8nText_default), {
											step: "xs",
											color: "text-light",
											class: normalizeClass(_ctx.$style.mono)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(item.value), 1)]),
											_: 2
										}, 1032, ["class"]),
										createVNode(unref(N8nIcon_default), {
											icon: "chevron-right",
											size: "small",
											color: "text-light"
										})
									], 10, _hoisted_6);
								}), 128))], 2)) : createCommentVNode("", true),
								createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light",
									align: "center"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.onboarding.done.footnote")), 1)]),
									_: 1
								}),
								__props.composeFastPath ? (openBlock(), createBlock(unref(N8nButton_default), {
									key: 1,
									variant: "solid",
									label: primaryLabel.value,
									"data-test-id": "wizard-primary",
									class: normalizeClass(_ctx.$style.inlineDoneAction),
									onClick: handlePrimary
								}, null, 8, ["label", "class"])) : createCommentVNode("", true)
							], 2)),
							createVNode(Transition, { name: "onboarding-callout" }, {
								default: withCtx(() => [success.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "success",
									icon: "circle-check",
									"data-test-id": "assistant-verification-success"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(successMessage.value), 1)]),
									_: 1
								})) : createCommentVNode("", true)]),
								_: 1
							}),
							createVNode(Transition, { name: "onboarding-callout" }, {
								default: withCtx(() => [failure.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
									key: 0,
									theme: "danger",
									icon: "circle-x",
									"data-test-id": __props.surface === "settings" ? `${settingsTestPrefix.value}-credential-test-error` : "assistant-verification-error"
								}, {
									default: withCtx(() => [createBaseVNode("div", null, [createTextVNode(toDisplayString(unref(i18n).baseText(failureKey.value)) + " ", 1), failureDetail.value ? (openBlock(), createElementBlock("div", {
										key: 0,
										class: normalizeClass(_ctx.$style.failureDetail),
										"data-test-id": "assistant-verification-error-details"
									}, toDisplayString(unref(i18n).baseText("instanceAi.onboarding.verification.errorDetails", { interpolate: { details: failureDetail.value } })), 3)) : createCommentVNode("", true)])]),
									_: 1
								}, 8, ["data-test-id"])) : createCommentVNode("", true)]),
								_: 1
							})
						], 2)]),
						_: 1
					}),
					!(__props.step === "done" && __props.composeFastPath) ? (openBlock(), createBlock(unref(DialogFooter_default), {
						key: 1,
						class: normalizeClass([_ctx.$style.footer, __props.editMode && _ctx.$style.editFooter])
					}, {
						default: withCtx(() => [
							__props.editMode ? (openBlock(), createBlock(unref(N8nButton_default), {
								key: 0,
								variant: "outline",
								size: "medium",
								label: unref(i18n).baseText("generic.cancel"),
								disabled: busy.value,
								"data-test-id": cancelTestId.value,
								onClick: _cache[8] || (_cache[8] = ($event) => handleOpenChange(false))
							}, null, 8, [
								"label",
								"disabled",
								"data-test-id"
							])) : createCommentVNode("", true),
							canGoBack.value ? (openBlock(), createBlock(unref(N8nButton_default), {
								key: 1,
								variant: "outline",
								size: "medium",
								label: unref(i18n).baseText("generic.back"),
								disabled: busy.value,
								"data-test-id": backTestId.value,
								onClick: _cache[9] || (_cache[9] = ($event) => emit("back"))
							}, null, 8, [
								"label",
								"disabled",
								"data-test-id"
							])) : createCommentVNode("", true),
							__props.step !== "done" && !__props.editMode && visibleSetupSteps.value.length > 1 ? (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass(_ctx.$style.dots),
								"data-test-id": progressTestId.value,
								"aria-hidden": "true"
							}, [(openBlock(true), createElementBlock(Fragment, null, renderList(visibleSetupSteps.value, (setupStep) => {
								return openBlock(), createElementBlock("span", {
									key: setupStep,
									class: normalizeClass([_ctx.$style.dot, setupStep === __props.step && _ctx.$style.activeDot])
								}, null, 2);
							}), 128))], 10, _hoisted_7)) : createCommentVNode("", true),
							createVNode(unref(N8nButton_default), {
								variant: "solid",
								size: "medium",
								label: primaryLabel.value,
								loading: busy.value,
								disabled: primaryDisabled.value,
								"data-test-id": primaryTestId.value,
								onClick: handlePrimary
							}, null, 8, [
								"label",
								"loading",
								"disabled",
								"data-test-id"
							])
						]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"open",
				"size",
				"show-close-button",
				"aria-label",
				"data-test-id"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1xn93_1",
	heading: "_heading_1xn93_11",
	description: "_description_1xn93_19",
	fields: "_fields_1xn93_24",
	compactLabel: "_compactLabel_1xn93_31",
	fieldHint: "_fieldHint_1xn93_35",
	joinedCards: "_joinedCards_1xn93_39",
	optionCard: "_optionCard_1xn93_56",
	optionControl: "_optionControl_1xn93_95",
	optionCopy: "_optionCopy_1xn93_99",
	optionTitle: "_optionTitle_1xn93_107",
	optionBadge: "_optionBadge_1xn93_113",
	optionDescription: "_optionDescription_1xn93_118",
	done: "_done_1xn93_122",
	successIcon: "_successIcon_1xn93_129",
	inlineDoneAction: "_inlineDoneAction_1xn93_133",
	summary: "_summary_1xn93_137",
	summaryRow: "_summaryRow_1xn93_145",
	summaryCopy: "_summaryCopy_1xn93_169",
	mono: "_mono_1xn93_176",
	footer: "_footer_1xn93_180",
	editFooter: "_editFooter_1xn93_192",
	failureDetail: "_failureDetail_1xn93_200",
	dots: "_dots_1xn93_205",
	dot: "_dot_1xn93_205",
	activeDot: "_activeDot_1xn93_221"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useInstanceAiConfiguration.ts
init_runtime_core_esm_bundler();
function useInstanceAiConfiguration() {
	const store = useInstanceAiSettingsStore();
	const configuration = computed(() => deriveInstanceAiConfiguration(store.settings, store.instanceModelCredentials, store.serviceCredentials));
	return {
		modelCredential: computed(() => configuration.value.modelCredential),
		modelConfigured: computed(() => configuration.value.modelConfigured),
		sandboxCredentialId: computed(() => configuration.value.sandboxCredentialId),
		sandboxConfigured: computed(() => configuration.value.sandboxConfigured),
		searchCredential: computed(() => configuration.value.searchCredential),
		searchState: computed(() => configuration.value.searchState),
		setupCompleted: computed(() => configuration.value.setupCompleted),
		hasSetupProgress: computed(() => configuration.value.hasSetupProgress)
	};
}
//#endregion
export { useInstanceCredentialTest as a, INSTANCE_AI_SEARCH_PROVIDERS as i, InstanceAiOnboardingWizard_default as n, INSTANCE_AI_MODEL_PROVIDERS as r, useInstanceAiConfiguration as t };
