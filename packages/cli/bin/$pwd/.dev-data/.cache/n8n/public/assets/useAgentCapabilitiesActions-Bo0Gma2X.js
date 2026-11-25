import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Bl as Slot, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, Yo as useRoute, _p as normalizeClass, bf as useId, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, pd as useDebounceFn, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $a as createAgentSkill, Ao as getProviderModels, BT as resolvePromptCaching, Cm as useRBACStore, Cr as useAiGateway, Dp as SCOPE_LABEL_KEY, Eo as getModelCatalog, FT as NATIVE_WEB_SEARCH_PROVIDER_TOOLS, GD as isAgentModelProvider, GT as skillNameKey, HD as AGENT_MODEL_PROVIDERS, Ho as listAgentsPage, IT as PROVIDER_CAPABILITIES, JM as useDropdownSearch, Jf as RestrictedMenuItemMarker_default, Jg as useUIStore, KM as AiModelSelectorDropdown_default, Kr as useAgentPermissions, LM as N8nCallout_default, Lc as useCreateAgent, Mo as getSkillDetail, Mp as useCredentialsStore, NT as ANTHROPIC_NATIVE_WEB_SEARCH_PROVIDER_TOOLS, OA as MarkdownEditor_default, PT as NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER, RT as getModelPromptCachingCapability, Rw as pinPrioritizedModels, SE as AI_GATEWAY_MANAGED_TAG, SN as _plugin_vue_export_helper_default, WD as AGENT_MODEL_STRING_REGEX, XA as VisuallyHidden_default, Xf as ContactAdminModal_default, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, dC as useToast, eC as DEBOUNCE_TIME, eM as N8nInputNumber_default, eN as DropdownMenuItem_default, fM as Switch_default, fN as N8nTooltip_default, hN as truncateBeforeLast, hu as NodeIcon_default, jN as useI18n, jx as LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS, kj as N8nSegmentControl_default, ko as getNewSkillName, kp as useAiGatewayStore, lh as AGENT_TOOLS_MODAL_KEY, nD as getResourcePermissions, nN as N8nBadge_default, oh as AGENT_SKILL_MODAL_KEY, qM as ContextMenu_default, rp as describeAgentToolRestriction, sh as AGENT_SUB_AGENTS_MODAL_KEY, tp as useTypeAvailability, uf as useNodeTypesStore, uh as AGENT_TOOL_CONFIG_MODAL_KEY, vN as N8nIconButton_default, vj as N8nTag_default, vm as useProjectsStore, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { a as AGENT_MODEL_PROVIDER_DEFINITIONS, i as ModelSelectorTriggerIcon_default, n as parseMenuItemId, o as getProviderCredentialTypes, r as ModelSelectorItemLeadingIcon_default, t as buildMenuItemId } from "./menuItemId-Beubk_vA.js";
import { t as useFreeAiCredits } from "./useFreeAiCredits-D2CXiIAV.js";
import { i as useProjectAgentsList } from "./useProjectAgentsList-yCWZeTO1.js";
import { i as isWarningIssue, n as isRestrictedByInlineTool, r as isRestrictedIssue } from "./validationIssues-CnPTm-2x.js";
import { n as resolveAgentValidationIssueMessageKey, t as getAgentValidationIssueInterpolation } from "./agentValidationIssueMessages-BhJ6yEAa.js";
import { i as mcpServerToNode, l as toolRefToNode } from "./useMcpServerAdapter-xfJVDU-E.js";
import { t as formatToolNameForDisplay } from "./toolDisplayName-C5txb6dB.js";
import { t as AgentCredentialSelect_default } from "./AgentCredentialSelect-DlxHWwBS.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { n as isSkillNameTakenError, r as normalizeAgentSkillForSave } from "./agentSkill-Czni3bZ7.js";
//#region src/features/agents/components/AgentPanelHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$4 = ["id"];
var AgentPanelHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentPanelHeader",
	props: {
		title: {},
		description: {},
		headerId: {},
		headerVisibility: { default: "visible" }
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(__props.headerVisibility === "visually-hidden" && !_ctx.$slots.actions ? _ctx.$style.headingOnly : _ctx.$style.row) }, [__props.headerVisibility === "visually-hidden" ? (openBlock(), createBlock(unref(VisuallyHidden_default), {
				key: 0,
				"as-child": ""
			}, {
				default: withCtx(() => [createBaseVNode("h3", { id: __props.headerId }, toDisplayString(__props.title), 9, _hoisted_1$4)]),
				_: 1
			})) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.copy)
			}, [createVNode(unref(N8nText_default), {
				id: __props.headerId,
				tag: "h3",
				step: "sm",
				bold: true
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
				_: 1
			}, 8, ["id"]), __props.description ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.description), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 2)), _ctx.$slots.actions ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.actions)
			}, [renderSlot(_ctx.$slots, "actions")], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	headingOnly: "_headingOnly_1god0_450",
	row: "_row_1god0_454",
	copy: "_copy_1god0_460",
	actions: "_actions_1god0_482",
	shimmer: "_shimmer_1god0_1",
	spin: "_spin_1god0_1",
	"skeleton-pulse": "_skeleton-pulse_1god0_1",
	opacityPulse: "_opacityPulse_1god0_1",
	popoverIn: "_popoverIn_1god0_1",
	fadeIn: "_fadeIn_1god0_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1god0_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1god0_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1god0_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1god0_1",
	blurSwapIn: "_blurSwapIn_1god0_1",
	blurSwapOut: "_blurSwapOut_1god0_1",
	pulse: "_pulse_1god0_1",
	pulseGlow: "_pulseGlow_1god0_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1god0_1",
	fade: "_fade_1god0_1",
	fadeInUp: "_fadeInUp_1god0_1",
	fadeInDown: "_fadeInDown_1god0_1",
	fadeInLeft: "_fadeInLeft_1god0_1",
	fadeInRight: "_fadeInRight_1god0_1",
	fadeOut: "_fadeOut_1god0_1",
	fadeOutDown: "_fadeOutDown_1god0_1",
	fadeOutUp: "_fadeOutUp_1god0_1",
	fadeOutLeft: "_fadeOutLeft_1god0_1",
	fadeOutRight: "_fadeOutRight_1god0_1",
	ping: "_ping_1god0_1",
	blinkBackground: "_blinkBackground_1god0_1",
	typingBlink: "_typingBlink_1god0_1"
} }]]);
//#endregion
//#region src/features/agents/components/AgentPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = ["aria-labelledby"];
var AgentPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentPanel",
	props: {
		header: {},
		description: { default: void 0 },
		headerVisibility: { default: "visible" },
		containerClass: {}
	},
	setup(__props) {
		const props = __props;
		const headerId = useId();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass([_ctx.$style.panelContainer, props.containerClass]),
				"aria-labelledby": unref(headerId)
			}, [_ctx.$slots.header ? renderSlot(_ctx.$slots, "header", {
				key: 0,
				headerId: unref(headerId)
			}) : (openBlock(), createBlock(AgentPanelHeader_default, {
				key: 1,
				"header-id": unref(headerId),
				title: props.header,
				"header-visibility": props.headerVisibility,
				description: props.description
			}, createSlots({ _: 2 }, [_ctx.$slots["header-actions"] ? {
				name: "actions",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "header-actions")]),
				key: "0"
			} : void 0]), 1032, [
				"header-id",
				"title",
				"header-visibility",
				"description"
			])), renderSlot(_ctx.$slots, "default")], 10, _hoisted_1$3);
		};
	}
}), [["__cssModules", { "$style": { panelContainer: "_panelContainer_1gukj_1" } }]]);
//#endregion
//#region src/features/agents/composables/useAgentProjectId.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Resolves the project an agent belongs to, with a single source of truth:
* an explicit override (e.g. a `projectId` prop) → the route param →
* the user's personal project → empty string.
*
* Centralising this avoids each component re-deriving the project id with
* subtly different fallbacks (which previously caused project-scoped views to
* fall back to personal-project data).
*/
function useAgentProjectId(override) {
	const route = useRoute();
	const projectsStore = useProjectsStore();
	return computed(() => toValue(override) ?? route.params.projectId ?? projectsStore.personalProject?.id ?? "");
}
var agent_panel_module_default = {
	disabled: "_disabled_wg27e_1",
	dataEntryLabel: "_dataEntryLabel_wg27e_6",
	dataEntrySubLabel: "_dataEntrySubLabel_wg27e_12",
	settingRow: "_settingRow_wg27e_18",
	settingLabel: "_settingLabel_wg27e_30",
	settingControl: "_settingControl_wg27e_39",
	settingControlShort: "_settingControlShort_wg27e_45",
	settingControlWide: "_settingControlWide_wg27e_52"
};
//#endregion
//#region src/features/agents/composables/useAgentModelCredentials.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function parseStoredCredentials(value) {
	try {
		const raw = JSON.parse(value);
		if (typeof raw !== "object" || raw === null) return {};
		const credentials = {};
		for (const [provider, credentialId] of Object.entries(raw)) {
			if (!isAgentModelProvider(provider)) continue;
			if (typeof credentialId !== "string" && credentialId !== null) continue;
			credentials[provider] = credentialId;
		}
		return credentials;
	} catch {
		return {};
	}
}
function useAgentModelCredentials(userId, projectId) {
	const credentialsStore = useCredentialsStore();
	const aiGatewayStore = useAiGatewayStore();
	const settingsStore = useSettingsStore();
	function supportsManagedCredits(provider) {
		if (!settingsStore.isAiGatewayEnabled) return false;
		return getProviderCredentialTypes(provider).some((credentialType) => aiGatewayStore.canServeCredentialType(credentialType));
	}
	const selectedCredentials = useLocalStorage(LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS(userId), {}, {
		writeDefaults: false,
		shallow: true,
		serializer: {
			read: parseStoredCredentials,
			write: (value) => JSON.stringify(value)
		}
	});
	const isCredentialsReady = computed(() => credentialsStore.hasUsableCredentialsForScope({
		projectId: toValue(projectId),
		forAgent: true
	}));
	function getCredentialsForProvider(provider) {
		if (!isCredentialsReady.value) return [];
		const credentialsById = /* @__PURE__ */ new Map();
		for (const credentialType of getProviderCredentialTypes(provider)) for (const credential of credentialsStore.getUsableCredentialByType(credentialType)) if (!credentialsById.has(credential.id)) credentialsById.set(credential.id, credential);
		return [...credentialsById.values()].toSorted((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
	}
	const credentialsByProvider = computed(() => {
		if (!isCredentialsReady.value) return null;
		const credentials = {};
		for (const provider of AGENT_MODEL_PROVIDERS) {
			const providerCredentials = getCredentialsForProvider(provider);
			const selectedCredentialId = selectedCredentials.value[provider] ?? null;
			credentials[provider] = selectedCredentialId === "__AI_GATEWAY_MANAGED__" && supportsManagedCredits(provider) ? AI_GATEWAY_MANAGED_TAG : selectedCredentialId && providerCredentials.some((credential) => credential.id === selectedCredentialId) ? selectedCredentialId : supportsManagedCredits(provider) ? AI_GATEWAY_MANAGED_TAG : providerCredentials[0]?.id ?? null;
		}
		return credentials;
	});
	function selectCredential(provider, id) {
		selectedCredentials.value = {
			...selectedCredentials.value,
			[provider]: id
		};
	}
	watch(() => toValue(projectId), async (id) => {
		if (!id) return;
		await Promise.all([credentialsStore.fetchCredentialTypes(false), credentialsStore.fetchUsableCredentials({
			projectId: id,
			forAgent: true
		})]);
	}, { immediate: true });
	return {
		credentialsByProvider,
		getCredentialsForProvider,
		selectCredential
	};
}
//#endregion
//#region src/features/agents/composables/useModelCatalog.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var catalogByProject = ref({});
var fetchPromises = /* @__PURE__ */ new Map();
var loadingProjects = ref(/* @__PURE__ */ new Set());
var verifiedModelsByKey = ref({});
var verifiedDefaultModelsByKey = ref({});
var unavailableByKey = ref({});
var unavailableReasonByKey = ref({});
var verifiedFetchesInFlight = /* @__PURE__ */ new Set();
var verificationStatusByKey = ref({});
function createEmptyModelsResponse() {
	const response = {};
	for (const provider of AGENT_MODEL_PROVIDERS) response[provider] = { models: [] };
	return response;
}
function toAgentModel(provider, model) {
	return {
		provider,
		model: model.id,
		name: model.name,
		description: null,
		createdAt: model.releaseDate ?? null,
		metadata: {
			functionCalling: model.toolCall,
			available: true
		}
	};
}
function useModelCatalog() {
	const rootStore = useRootStore();
	const activeProjectId = ref(null);
	const catalog = computed(() => activeProjectId.value ? catalogByProject.value[activeProjectId.value] ?? {} : {});
	const isLoading = computed(() => activeProjectId.value ? loadingProjects.value.has(activeProjectId.value) : false);
	async function ensureLoaded(projectId) {
		activeProjectId.value = projectId;
		if (catalogByProject.value[projectId]) return;
		let fetchPromise = fetchPromises.get(projectId);
		if (!fetchPromise) {
			loadingProjects.value.add(projectId);
			fetchPromise = getModelCatalog(rootStore.restApiContext, projectId).then((result) => {
				catalogByProject.value = {
					...catalogByProject.value,
					[projectId]: result
				};
			}).catch(() => {
				fetchPromises.delete(projectId);
			}).finally(() => {
				loadingProjects.value.delete(projectId);
			});
			fetchPromises.set(projectId, fetchPromise);
		}
		await fetchPromise;
	}
	function getModelsForProvider(provider) {
		const p = catalog.value[provider];
		if (!p) return [];
		return Object.values(p.models).sort((a, b) => a.name.localeCompare(b.name));
	}
	/**
	* Kick off (once per project+provider+credential) the fetch of the
	* provider-verified model list. Idempotent and guarded, so it is safe to
	* trigger from `getModelsForPicker` — when the response lands, the reactive
	* map updates and computeds re-evaluate with the verified list.
	*/
	function ensureVerifiedModels(projectId, provider, providerCredentialId) {
		const key = `${projectId}|${provider}|${providerCredentialId}`;
		if (key in verifiedModelsByKey.value || verifiedFetchesInFlight.has(key)) return;
		verifiedFetchesInFlight.add(key);
		verificationStatusByKey.value = {
			...verificationStatusByKey.value,
			[key]: "loading"
		};
		getProviderModels(rootStore.restApiContext, projectId, provider, providerCredentialId).then((result) => {
			verifiedModelsByKey.value = {
				...verifiedModelsByKey.value,
				[key]: result.verified ? result.models : null
			};
			verifiedDefaultModelsByKey.value = {
				...verifiedDefaultModelsByKey.value,
				[key]: result.defaultModelId ?? null
			};
			unavailableByKey.value = {
				...unavailableByKey.value,
				[key]: result.unavailable === true
			};
			unavailableReasonByKey.value = {
				...unavailableReasonByKey.value,
				[key]: result.unavailableReason
			};
			verificationStatusByKey.value = {
				...verificationStatusByKey.value,
				[key]: "resolved"
			};
		}).catch(() => {
			verifiedModelsByKey.value = {
				...verifiedModelsByKey.value,
				[key]: null
			};
			verificationStatusByKey.value = {
				...verificationStatusByKey.value,
				[key]: "failed"
			};
		}).finally(() => {
			verifiedFetchesInFlight.delete(key);
		});
	}
	function getVerificationStatus(projectId, provider, credentialId) {
		return verificationStatusByKey.value[`${projectId}|${provider}|${credentialId}`] ?? "idle";
	}
	function getModelsForPicker(credentials) {
		const response = createEmptyModelsResponse();
		for (const provider of AGENT_MODEL_PROVIDERS) {
			const providerCredentialId = credentials?.[provider];
			if (!providerCredentialId) continue;
			let models;
			let unavailable = false;
			let unavailableReason;
			const projectId = activeProjectId.value;
			if (projectId) {
				ensureVerifiedModels(projectId, provider, providerCredentialId);
				const key = `${projectId}|${provider}|${providerCredentialId}`;
				models = verifiedModelsByKey.value[key] ?? void 0;
				unavailable = unavailableByKey.value[key] === true;
				unavailableReason = unavailableReasonByKey.value[key];
			}
			if (!models) {
				const providerInfo = catalog.value[provider];
				if (!providerInfo) continue;
				models = Object.values(providerInfo.models);
			}
			response[provider] = {
				models: pinPrioritizedModels([...models].sort((a, b) => a.name.localeCompare(b.name)), (model) => model.priority).map((model) => toAgentModel(provider, model)),
				...unavailable ? { unavailable: true } : {},
				...unavailableReason ? { unavailableReason } : {}
			};
		}
		return response;
	}
	function getDefaultModelForPicker(credentials, provider) {
		const credentialId = credentials?.[provider];
		const projectId = activeProjectId.value;
		if (!credentialId || !projectId) return null;
		ensureVerifiedModels(projectId, provider, credentialId);
		const defaultModelId = verifiedDefaultModelsByKey.value[`${projectId}|${provider}|${credentialId}`];
		if (!defaultModelId) return null;
		return getModelsForPicker(credentials)[provider]?.models.find((model) => model.model === defaultModelId) ?? null;
	}
	return {
		catalog,
		isLoading,
		ensureLoaded,
		getVerificationStatus,
		getModelsForProvider,
		getModelsForPicker,
		getDefaultModelForPicker
	};
}
//#endregion
//#region src/features/agents/utils/model-string.ts
/**
* Model identifier helpers. The canonical storage format is `"<provider>/<name>"`.
* Centralised here because multiple callers (Agent info panel, memory panel,
* sub-agents panel) used to roll their own and drifted on naming + edge cases.
*/
/** Split `"<provider>/<name>"` on the first `/`. Returns null when malformed. */
function parseModelString(model) {
	if (!AGENT_MODEL_STRING_REGEX.test(model)) return null;
	const slashIndex = model.indexOf("/");
	return {
		provider: model.slice(0, slashIndex),
		name: model.slice(slashIndex + 1)
	};
}
/** Build the canonical string. Pass-through for already-string inputs. */
function modelToString(raw) {
	if (!raw) return "";
	if (typeof raw === "string") return raw;
	return `${raw.provider ?? ""}/${raw.name ?? ""}`;
}
/** Read just the provider, accepting either string or object form. */
function parseProvider(raw) {
	if (!raw) return "";
	if (typeof raw === "object") return raw.provider ?? "";
	return parseModelString(raw)?.provider ?? "";
}
/**
* Normalise provider-specific id quirks. Currently only Google's `"models/"`
* prefix is stripped — other providers pass through unchanged.
*/
function sanitizeModelId(provider, modelId) {
	if (provider === "google") return modelId.replace(/^models\//, "");
	return modelId;
}
//#endregion
//#region src/features/agents/utils/nativeWebSearch.ts
function isFallbackWebSearchProvider(provider) {
	return provider === "brave" || provider === "searxng";
}
function stripNativeWebSearchProviderTools(providerTools) {
	if (!providerTools) return void 0;
	const next = { ...providerTools };
	for (const key of NATIVE_WEB_SEARCH_PROVIDER_TOOLS) delete next[key];
	return next;
}
function getWebSearchMethod(config, hasNativeWebSearch) {
	const configuredProvider = config?.config?.webSearch?.provider;
	if (isFallbackWebSearchProvider(configuredProvider)) return configuredProvider;
	return hasNativeWebSearch ? "native" : "brave";
}
function getNativeWebSearchArgs(config, providerTool) {
	if (!providerTool) return {};
	if (providerTool === "anthropic.web_search") {
		const matchingTool = ANTHROPIC_NATIVE_WEB_SEARCH_PROVIDER_TOOLS.find((tool) => config?.providerTools?.[tool]);
		return { ...matchingTool ? config?.providerTools?.[matchingTool] : {} };
	}
	return { ...config?.providerTools?.[providerTool] ?? {} };
}
function getDefaultNativeWebSearchArgs(providerTool) {
	const defaults = Object.values(NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER).find((defaultsByProvider) => defaultsByProvider.toolName === providerTool);
	return defaults ? { ...defaults.args } : {};
}
function withNativeWebSearchConfig(config, enabled, providerTool, args = {}) {
	const providerTools = { ...stripNativeWebSearchProviderTools(config?.providerTools) ?? {} };
	const changes = { config: {
		...config?.config ?? {},
		webSearch: enabled ? {
			enabled: true,
			provider: "native"
		} : { enabled: false }
	} };
	if (enabled && providerTool) providerTools[providerTool] = {
		...getDefaultNativeWebSearchArgs(providerTool),
		...args
	};
	if (config?.providerTools || enabled && providerTool) changes.providerTools = providerTools;
	return changes;
}
function withWebSearchConfig(config, enabled, method, providerTool, args = {}, credential = "") {
	if (!enabled) return {
		config: {
			...config?.config ?? {},
			webSearch: { enabled: false }
		},
		...config?.providerTools && { providerTools: stripNativeWebSearchProviderTools(config.providerTools) ?? {} }
	};
	if (method === "native" && providerTool) return withNativeWebSearchConfig(config, true, providerTool, args);
	const webSearch = method === "native" ? { enabled: false } : {
		enabled: true,
		provider: method,
		...credential && { credential }
	};
	return {
		config: {
			...config?.config ?? {},
			webSearch
		},
		...config?.providerTools && { providerTools: stripNativeWebSearchProviderTools(config.providerTools) ?? {} }
	};
}
function normalizeWebSearchForModelChange(config, nextProviderTool) {
	const webSearch = config?.config?.webSearch;
	if (!webSearch) return config?.providerTools ? { providerTools: stripNativeWebSearchProviderTools(config.providerTools) ?? {} } : {};
	const method = getWebSearchMethod(config, Boolean(nextProviderTool));
	if (isFallbackWebSearchProvider(webSearch.provider)) return withWebSearchConfig(config, webSearch.enabled, method, nextProviderTool, {}, webSearch.credential);
	if (!webSearch.enabled) return withWebSearchConfig(config, false, "native", nextProviderTool);
	return nextProviderTool ? withNativeWebSearchConfig(config, true, nextProviderTool) : withWebSearchConfig(config, false, "native", nextProviderTool);
}
//#endregion
//#region src/features/agents/utils/promptCaching.ts
/**
* Prompt caching is on by default for supported providers (OpenAI/Anthropic):
* it resolves to `{ enabled: true }` for a newly selected supported provider
* unless the user turned it off, preserves an explicit Anthropic TTL
* across the switch, and strips the field entirely when the newly selected
* provider doesn't support it.
*
* `currentSubConfig` should be the agent's `config.config`, already merged
* with any other in-flight normalization (e.g. web search) for the same
* model change, so this composes without one normalizer clobbering another.
*/
function normalizePromptCachingForModelChange(currentSubConfig, nextPromptCachingCapability) {
	const current = currentSubConfig?.promptCaching;
	const resolved = resolvePromptCaching(current, nextPromptCachingCapability);
	if (!resolved) {
		if (!current) return {};
		const { promptCaching: _promptCaching, ...restConfig } = currentSubConfig ?? {};
		return { config: Object.keys(restConfig).length > 0 ? restConfig : void 0 };
	}
	return { config: {
		...currentSubConfig ?? {},
		promptCaching: resolved
	} };
}
//#endregion
//#region src/features/agents/utils/reasoning.ts
function normalizeReasoningForModelChange(currentSubConfig, supportsReasoning) {
	if (supportsReasoning !== false || currentSubConfig?.reasoning === void 0) return {};
	const { reasoning: _reasoning, ...restConfig } = currentSubConfig;
	return { config: Object.keys(restConfig).length > 0 ? restConfig : void 0 };
}
//#endregion
//#region src/features/agents/components/AgentModelSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var MAX_MODEL_NAME_CHARS = 45;
var MAX_SEARCH_RESULTS_PER_PROVIDER = 10;
var FREE_OPENAI_CREDITS_PROVIDER = "openai";
var FREE_OPENAI_CREDITS_MODEL = "gpt-5-mini";
var AgentModelSelector_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentModelSelector",
	props: {
		selectedModel: {},
		credentials: {},
		modelsByProvider: {},
		isLoading: { type: Boolean },
		projectId: {},
		warnMissingCredentials: {
			type: Boolean,
			default: false
		},
		boundCredentialId: { default: null },
		disabled: {
			type: Boolean,
			default: false
		},
		credentialModalAppendToBody: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"change",
		"selectCredential",
		"configureCredential"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const UNAVAILABLE_REASON_MESSAGES = {
			endpoint_type_unsupported: {
				label: "agents.modelSelector.unavailable.endpointTypeUnsupported",
				hint: "agents.modelSelector.unavailable.endpointTypeUnsupportedHint"
			},
			project_missing: {
				label: "agents.modelSelector.unavailable.projectMissing",
				hint: "agents.modelSelector.unavailable.projectMissingHint"
			},
			project_not_found: {
				label: "agents.modelSelector.unavailable.projectNotFound",
				hint: "agents.modelSelector.unavailable.projectNotFoundHint"
			}
		};
		/** The row shown in place of an empty model list says how to fix it when it can. */
		function emptyModelsMessage(models) {
			if (models?.unavailableReason) return UNAVAILABLE_REASON_MESSAGES[models.unavailableReason];
			if (models?.unavailable) return { label: "agents.modelSelector.modelsUnavailable" };
			return { label: "agents.modelSelector.noModels" };
		}
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const dropdownRef = useTemplateRef("dropdownRef");
		const credentialsStore = useCredentialsStore();
		const projectsStore = useProjectsStore();
		const uiStore = useUIStore();
		const { credentialTypeRestriction } = useTypeAvailability(() => __props.projectId);
		const aiGateway = useAiGateway();
		const { ensureLoaded, getDefaultModelForPicker, getVerificationStatus } = useModelCatalog();
		const pendingDefaultCredential = ref(null);
		const contactAdmin = ref(null);
		const forceModelOptionsDisabled = ref(false);
		const isResolvingDefaultModel = computed(() => pendingDefaultCredential.value !== null || forceModelOptionsDisabled.value);
		const aiGatewayBalancePill = computed(() => {
			const balance = aiGateway.balance.value;
			if (balance === void 0) return void 0;
			const depleted = balance <= 0;
			return {
				text: depleted ? i18n.baseText("aiGateway.wallet.noCredits") : i18n.baseText("aiGateway.wallet.balanceRemaining", { interpolate: { balance: `$${Number(balance).toFixed(2)}` } }),
				type: depleted ? "danger" : "default"
			};
		});
		onMounted(() => {
			aiGateway.fetchConfig();
			if (aiGateway.isEnabled.value) aiGateway.fetchWallet();
		});
		const selectedCredentialId = computed(() => __props.selectedModel ? __props.credentials?.[__props.selectedModel.provider] : void 0);
		const projectHasOpenAiCredential = computed(() => Boolean(__props.credentials?.[FREE_OPENAI_CREDITS_PROVIDER]));
		const { aiCreditsQuota, userCanClaimOpenAiCredits, claimingCredits, claimCreditsAndGetCredential } = useFreeAiCredits({ hasOpenAiCredential: projectHasOpenAiCredential });
		const selectedCredential = computed(() => selectedCredentialId.value ? credentialsStore.getCredentialById(selectedCredentialId.value) : null);
		const isManagedCredential = computed(() => selectedCredentialId.value === AI_GATEWAY_MANAGED_TAG);
		const selectedCredentialName = computed(() => isManagedCredential.value ? i18n.baseText("aiGateway.credentialMode.n8nConnect.title") : selectedCredential.value?.name);
		const isCredentialsMissing = computed(() => __props.credentials !== null && !isManagedCredential.value && __props.warnMissingCredentials && Boolean(__props.selectedModel?.provider) && !(__props.boundCredentialId && credentialsStore.getCredentialById(__props.boundCredentialId)));
		const selectedLabel = computed(() => __props.selectedModel?.name ?? i18n.baseText("agents.modelSelector.defaultLabel"));
		const triggerCredentialTypeName = computed(() => __props.selectedModel ? getProviderCredentialTypes(__props.selectedModel.provider)[0] : null);
		const projectForPermissions = computed(() => {
			if (__props.projectId) {
				if (projectsStore.currentProject?.id === __props.projectId) return projectsStore.currentProject;
				if (projectsStore.personalProject?.id === __props.projectId) return projectsStore.personalProject;
				return projectsStore.myProjects.find((project) => project.id === __props.projectId) ?? null;
			}
			return projectsStore.currentProject ?? projectsStore.personalProject;
		});
		const createCredentialProjectId = computed(() => projectForPermissions.value?.id ?? __props.projectId ?? projectsStore.personalProject?.id);
		const canCreateCredentials = computed(() => {
			return !!getResourcePermissions(projectForPermissions.value?.scopes).credential.create;
		});
		function getCredentialTypeDisplayName(credentialType) {
			return credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
		}
		function getCredentialsForProvider(provider) {
			const credentialsById = /* @__PURE__ */ new Map();
			for (const credentialType of getProviderCredentialTypes(provider)) for (const credential of credentialsStore.getUsableCredentialByType(credentialType)) if (!credentialsById.has(credential.id)) credentialsById.set(credential.id, credential);
			return [...credentialsById.values()].toSorted((a, b) => a.name.localeCompare(b.name));
		}
		const canUseFreeOpenAiCredits = computed(() => __props.credentials !== null && canCreateCredentials.value && userCanClaimOpenAiCredits.value);
		const freeOpenAiCreditsDescription = computed(() => i18n.baseText("agents.modelSelector.freeCredits.description", { interpolate: { credits: aiCreditsQuota.value } }));
		function getProviderRestriction(provider) {
			const restrictions = getProviderCredentialTypes(provider).map((credentialType) => credentialTypeRestriction(credentialType));
			return restrictions.every((restriction) => restriction !== null) ? restrictions[0] ?? null : null;
		}
		const restrictedLabel = computed(() => __props.selectedModel && getProviderRestriction(__props.selectedModel.provider) ? i18n.baseText("agents.modelSelector.restricted") : void 0);
		function restrictedCredentialsName(item) {
			return i18n.baseText("agents.modelSelector.restrictedCredentials", { interpolate: { provider: item.label } });
		}
		function requestContactAdmin(subject, audience) {
			dropdownRef.value?.close();
			contactAdmin.value = {
				subject,
				audience
			};
		}
		function providerToMenuItem(provider) {
			const definition = AGENT_MODEL_PROVIDER_DEFINITIONS[provider];
			const credentialTypes = getProviderCredentialTypes(provider);
			const restriction = getProviderRestriction(provider);
			if (restriction) return {
				id: provider,
				label: definition.displayName,
				disabled: true,
				data: {
					provider,
					credentialType: credentialTypes[0],
					restrictedLabel: i18n.baseText(SCOPE_LABEL_KEY[restriction.scope ?? "instance"]),
					restriction
				}
			};
			const credentialOptions = getCredentialsForProvider(provider);
			const selectedProviderCredentialId = __props.credentials?.[provider] ?? null;
			const models = __props.modelsByProvider[provider]?.models ?? [];
			const isAiGatewayManagedSelected = selectedProviderCredentialId === AI_GATEWAY_MANAGED_TAG;
			const hasProviderCredential = isAiGatewayManagedSelected || selectedProviderCredentialId !== null && credentialOptions.some((credential) => credential.id === selectedProviderCredentialId);
			const credentialItems = credentialOptions.map((credential) => ({
				id: buildMenuItemId(provider, "select", credential.id),
				label: credential.name,
				disabled: false,
				checked: __props.selectedModel?.provider === provider && selectedProviderCredentialId === credential.id,
				keepOpen: true,
				data: { provider }
			}));
			const createCredentialItems = canCreateCredentials.value ? credentialTypes.length === 1 ? [{
				id: buildMenuItemId(provider, "configure", credentialTypes[0]),
				label: i18n.baseText("agents.modelSelector.configureCredentials"),
				disabled: false,
				data: {
					provider,
					leadingIcon: "plus"
				}
			}] : [{
				id: `${provider}::configure`,
				label: i18n.baseText("agents.modelSelector.configureCredentials"),
				disabled: false,
				data: {
					provider,
					leadingIcon: "plus"
				},
				children: credentialTypes.map((credentialType) => ({
					id: buildMenuItemId(provider, "configure", credentialType),
					label: getCredentialTypeDisplayName(credentialType),
					disabled: false,
					data: {
						provider,
						leadingIcon: "plus"
					}
				}))
			}] : [];
			const gatewayServedCredentialType = aiGateway.isEnabled.value ? credentialTypes.find((credentialType) => aiGateway.canServeCredentialType(credentialType)) : void 0;
			const isAiGatewayManagedAvailable = isAiGatewayManagedSelected || gatewayServedCredentialType !== void 0;
			const n8nCreditsItems = isAiGatewayManagedAvailable ? [{
				id: buildMenuItemId(provider, "n8nConnect", gatewayServedCredentialType ?? credentialTypes[0]),
				label: i18n.baseText("aiGateway.credentialMode.n8nConnect.title"),
				disabled: false,
				checked: isAiGatewayManagedSelected,
				keepOpen: true,
				data: {
					provider,
					actionPill: aiGatewayBalancePill.value
				}
			}] : [];
			const freeOpenAiCreditsItems = provider === FREE_OPENAI_CREDITS_PROVIDER && canUseFreeOpenAiCredits.value ? [{
				id: buildMenuItemId(FREE_OPENAI_CREDITS_PROVIDER, "freeCredits", FREE_OPENAI_CREDITS_MODEL),
				icon: {
					type: "icon",
					value: "sparkles"
				},
				label: i18n.baseText("agents.modelSelector.freeCredits.label"),
				disabled: claimingCredits.value,
				data: {
					provider,
					credentialType: credentialTypes[0],
					leadingIcon: "sparkles",
					description: freeOpenAiCreditsDescription.value,
					descriptionTooltipTeleported: false
				}
			}] : [];
			const modelItems = hasProviderCredential ? models.map((model) => ({
				id: buildMenuItemId(provider, "model", model.model),
				label: truncateBeforeLast(model.name, MAX_MODEL_NAME_CHARS),
				disabled: isResolvingDefaultModel.value,
				checked: __props.selectedModel?.provider === provider && __props.selectedModel.model === model.model,
				data: {
					provider,
					loading: isResolvingDefaultModel.value,
					description: model.description ?? void 0,
					descriptionTooltipTeleported: false,
					fullName: `${model.name} ${model.model}`,
					credentialType: credentialTypes[0]
				}
			})) : [];
			const statusItems = !hasProviderCredential ? [] : __props.isLoading ? [{
				id: `${provider}::loading`,
				label: i18n.baseText("generic.loadingEllipsis"),
				disabled: true
			}] : modelItems.length === 0 ? [emptyModelsItem(provider)] : [];
			const connectItems = [
				...freeOpenAiCreditsItems,
				...n8nCreditsItems,
				...credentialItems,
				...createCredentialItems
			];
			const connectHeader = connectItems.length ? [{
				id: `${provider}::header::connect`,
				label: i18n.baseText("agents.modelSelector.connectTo", { interpolate: { provider: definition.displayName } }),
				header: true,
				disabled: true
			}] : [];
			const modelsSection = [...modelItems, ...statusItems];
			const modelsHeader = modelsSection.length ? [{
				id: `${provider}::header::models`,
				label: i18n.baseText("agents.modelSelector.models"),
				header: true,
				disabled: true,
				divided: connectItems.length > 0
			}] : [];
			return {
				id: provider,
				label: definition.displayName,
				data: {
					provider,
					credentialType: credentialTypes[0],
					badgeLabel: provider === FREE_OPENAI_CREDITS_PROVIDER && canUseFreeOpenAiCredits.value ? i18n.baseText("agents.modelSelector.freeCredits.badge") : void 0,
					actionPill: isAiGatewayManagedAvailable ? {
						text: i18n.baseText(aiGateway.creditsLabelKey.value),
						type: aiGateway.creditsLabelKey.value === "generic.freeCredits" ? "default" : "info"
					} : void 0
				},
				children: [
					...connectHeader,
					...connectItems,
					...modelsHeader,
					...modelsSection
				]
			};
		}
		function isAggregatorProvider(provider) {
			return "isAggregator" in AGENT_MODEL_PROVIDER_DEFINITIONS[provider];
		}
		function isAiGatewayProvider(provider) {
			return aiGateway.isEnabled.value && getProviderCredentialTypes(provider).some((credentialType) => aiGateway.canServeCredentialType(credentialType));
		}
		const menu = computed(() => {
			const selectedProvider = __props.selectedModel?.provider ?? null;
			const aiGatewayProviders = [];
			const aggregatorProviders = [];
			const regularProviders = [];
			for (const provider of AGENT_MODEL_PROVIDERS) {
				if (provider === selectedProvider) continue;
				if (isAiGatewayProvider(provider)) aiGatewayProviders.push(provider);
				else if (isAggregatorProvider(provider)) aggregatorProviders.push(provider);
				else regularProviders.push(provider);
			}
			const menuItems = [];
			if (selectedProvider) {
				const item = providerToMenuItem(selectedProvider);
				menuItems.push(item.data?.restrictedLabel ? item : {
					...item,
					data: {
						...item.data,
						connectedLabel: i18n.baseText("agents.modelSelector.connected")
					}
				});
			}
			if (aiGatewayProviders.length) {
				menuItems.push({
					id: "n8nConnect::header",
					label: i18n.baseText("agents.modelSelector.includedInN8n"),
					header: true,
					disabled: true
				});
				menuItems.push(...aiGatewayProviders.map(providerToMenuItem));
			}
			[...regularProviders, ...aggregatorProviders].forEach((provider, index) => {
				const item = providerToMenuItem(provider);
				menuItems.push(index === 0 && aiGatewayProviders.length ? {
					...item,
					divided: true
				} : item);
			});
			return menuItems;
		});
		function isSearchableItem(item) {
			return (item.id.includes("::model::") || item.id.includes("::freeCredits::")) && !item.disabled;
		}
		const { search: searchQuery, filteredItems: matchingModelItems, handleSearch } = useDropdownSearch(menu, {
			flatList: true,
			isSearchable: isSearchableItem,
			searchFields: (item) => [item.label, item.data?.fullName],
			mapResult: (item, path) => ({
				...item,
				divided: false,
				data: item.data ? {
					...item.data,
					parts: path.map((pathItem) => pathItem.label),
					descriptionTooltipTeleported: true
				} : void 0
			})
		});
		const filteredMenu = computed(() => {
			if (!searchQuery.value.trim()) return menu.value;
			return menu.value.flatMap((providerItem) => {
				const results = matchingModelItems.value.filter((item) => item.data?.provider === providerItem.id);
				if (results.length <= MAX_SEARCH_RESULTS_PER_PROVIDER) return results;
				return [...results.slice(0, MAX_SEARCH_RESULTS_PER_PROVIDER), {
					...providerItem,
					label: i18n.baseText("agents.modelSelector.moreModels", { interpolate: { provider: providerItem.label } }),
					children: results.slice(MAX_SEARCH_RESULTS_PER_PROVIDER),
					divided: false,
					data: {
						...providerItem.data,
						badgeLabel: void 0,
						actionPill: void 0
					}
				}];
			});
		});
		function emptyModelsItem(provider) {
			const message = emptyModelsMessage(__props.modelsByProvider[provider]);
			return {
				id: `${provider}::empty`,
				label: i18n.baseText(message.label),
				disabled: true,
				...message.hint ? { data: {
					description: i18n.baseText(message.hint),
					descriptionTooltipTeleported: false
				} } : {}
			};
		}
		function selectCredentialAndResolveDefaultModel(provider, credentialId) {
			ensureLoaded(__props.projectId);
			emit("selectCredential", provider, credentialId);
			pendingDefaultCredential.value = {
				provider,
				credentialId
			};
		}
		function getPendingDefaultModelResolution() {
			const pending = pendingDefaultCredential.value;
			if (!pending) return null;
			const pendingCredentials = {
				...__props.credentials ?? {},
				[pending.provider]: pending.credentialId
			};
			return {
				pending,
				defaultModel: getDefaultModelForPicker(pendingCredentials, pending.provider),
				status: getVerificationStatus(__props.projectId, pending.provider, pending.credentialId)
			};
		}
		function handleDefaultModelResolution(result) {
			if (!result || result.status === "idle" || result.status === "loading") return;
			if (pendingDefaultCredential.value?.provider !== result.pending.provider || pendingDefaultCredential.value.credentialId !== result.pending.credentialId) return;
			pendingDefaultCredential.value = null;
			if (result.status === "resolved" && result.defaultModel) emit("change", {
				provider: result.defaultModel.provider,
				model: result.defaultModel.model
			}, "auto");
		}
		watch(getPendingDefaultModelResolution, handleDefaultModelResolution);
		function openNewCredential(provider, credentialType) {
			if (!__props.disabled && canCreateCredentials.value) uiStore.openNewCredential(credentialType, false, false, createCredentialProjectId.value, void 0, void 0, void 0, {
				hideAskAssistant: true,
				onCredentialCreated: async function selectCreatedCredential(credential) {
					const scopeProjectId = createCredentialProjectId.value;
					try {
						await (scopeProjectId ? credentialsStore.fetchUsableCredentials({
							projectId: scopeProjectId,
							forAgent: true
						}) : credentialsStore.refreshUsableCredentials());
					} catch (error) {
						toast.showError(error, i18n.baseText("agents.builder.credentials.refreshError"));
					}
					selectCredentialAndResolveDefaultModel(provider, credential.id);
				},
				...__props.credentialModalAppendToBody ? { appendToBody: true } : {}
			});
		}
		async function onSelect(id) {
			if (__props.disabled) return;
			const parsed = parseMenuItemId(id);
			if (!parsed || !isAgentModelProvider(parsed.provider)) return;
			const { provider: providerId, action, value } = parsed;
			if (action === "configure") {
				emit("configureCredential", providerId);
				openNewCredential(providerId, value);
				return;
			}
			if (action === "select") {
				selectCredentialAndResolveDefaultModel(providerId, value);
				return;
			}
			if (action === "n8nConnect") {
				selectCredentialAndResolveDefaultModel(providerId, AI_GATEWAY_MANAGED_TAG);
				return;
			}
			if (action === "freeCredits" && providerId === FREE_OPENAI_CREDITS_PROVIDER) {
				if (!canUseFreeOpenAiCredits.value) return;
				const credential = await claimCreditsAndGetCredential("agentBuilderModelSelector", createCredentialProjectId.value);
				if (!credential) return;
				selectCredentialAndResolveDefaultModel(providerId, credential.id);
				return;
			}
			if (action === "model") {
				pendingDefaultCredential.value = null;
				emit("change", {
					provider: providerId,
					model: value
				});
			}
		}
		function openDropdown() {
			if (!__props.disabled) dropdownRef.value?.open();
		}
		function setModelOptionsDisabled(disabled) {}
		__expose({
			open: openDropdown,
			setModelOptionsDisabled
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [createVNode(unref(AiModelSelectorDropdown_default), {
				ref_key: "dropdownRef",
				ref: dropdownRef,
				items: filteredMenu.value,
				"is-loading": __props.isLoading || isResolvingDefaultModel.value,
				"selected-label": selectedLabel.value,
				"selected-credential-name": selectedCredentialName.value,
				"credentials-missing": isCredentialsMissing.value,
				"restricted-label": restrictedLabel.value,
				"no-match-label": unref(i18n).baseText("agents.modelSelector.noMatch"),
				disabled: __props.disabled,
				"data-test-id": "agent-model-selector",
				"credential-data-test-id": "agent-model-selector-credential",
				onSearch: unref(handleSearch),
				onSelect
			}, {
				"trigger-leading": withCtx(({ ui }) => [createVNode(ModelSelectorTriggerIcon_default, {
					"credential-type-name": triggerCredentialTypeName.value,
					class: normalizeClass(ui.class)
				}, null, 8, ["credential-type-name", "class"])]),
				"item-leading": withCtx(({ item, ui }) => [createVNode(ModelSelectorItemLeadingIcon_default, {
					item,
					class: normalizeClass(ui.class)
				}, null, 8, ["item", "class"])]),
				"item-restricted": withCtx(({ item }) => [createVNode(unref(RestrictedMenuItemMarker_default), {
					kind: "credential",
					"node-type-name": restrictedCredentialsName(item),
					restriction: item.data?.restriction,
					onContactAdmin: (audience) => requestContactAdmin(restrictedCredentialsName(item), audience)
				}, null, 8, [
					"node-type-name",
					"restriction",
					"onContactAdmin"
				])]),
				_: 1
			}, 8, [
				"items",
				"is-loading",
				"selected-label",
				"selected-credential-name",
				"credentials-missing",
				"restricted-label",
				"no-match-label",
				"disabled",
				"onSearch"
			]), createVNode(unref(ContactAdminModal_default), {
				kind: "credential",
				"type-name": contactAdmin.value?.subject ?? "",
				audience: contactAdmin.value?.audience ?? "instance",
				open: contactAdmin.value !== null,
				"onUpdate:open": _cache[0] || (_cache[0] = (isOpen) => !isOpen && (contactAdmin.value = null))
			}, null, 8, [
				"type-name",
				"audience",
				"open"
			])], 2);
		};
	}
}), [["__cssModules", { "$style": { root: "_root_17li2_1" } }]]);
//#endregion
//#region src/features/agents/components/AgentInfoPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = {
	key: 0,
	"data-testid": "agent-model-panel"
};
var AgentInfoPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentInfoPanel",
	props: {
		config: {},
		disabled: {
			type: Boolean,
			default: false
		},
		embedded: {
			type: Boolean,
			default: false
		},
		projectId: {},
		showModel: {
			type: Boolean,
			default: true
		},
		showInstructions: {
			type: Boolean,
			default: true
		},
		immediateUpdates: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:config", "draft:config"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const instructionsEditorId = useId();
		const usersStore = useUsersStore();
		const { showError } = useToast();
		const { catalog, ensureLoaded, getModelsForPicker, getDefaultModelForPicker, isLoading } = useModelCatalog();
		const projectId = useAgentProjectId(() => props.projectId);
		const { credentialsByProvider, selectCredential } = useAgentModelCredentials(usersStore.currentUserId ?? "anonymous", projectId);
		watch(projectId, (id) => {
			if (id) ensureLoaded(id);
		}, { immediate: true });
		const configProvider = computed(() => {
			const parsed = parseModelString(modelToString(props.config?.model));
			return parsed && isAgentModelProvider(parsed.provider) ? parsed.provider : null;
		});
		const effectiveCredentials = computed(() => {
			const base = credentialsByProvider.value;
			if (!base) return base;
			const provider = configProvider.value;
			const credential = props.config?.credential;
			if (!provider || !credential) return base;
			return {
				...base,
				[provider]: credential
			};
		});
		const pendingDefaultProvider = ref(null);
		const defaultModelHint = ref(false);
		const filteredAgents = computed(() => getModelsForPicker(effectiveCredentials.value));
		const selectedAgent = computed(() => {
			const modelStr = modelToString(props.config?.model);
			if (!modelStr) return null;
			const parsed = parseModelString(modelStr);
			if (!parsed || !isAgentModelProvider(parsed.provider)) return null;
			const registryEntry = filteredAgents.value[parsed.provider]?.models.find((m) => m.model === parsed.name);
			if (registryEntry) return registryEntry;
			return {
				provider: parsed.provider,
				model: parsed.name,
				name: parsed.name,
				description: null,
				createdAt: null,
				metadata: {
					functionCalling: false,
					available: true
				}
			};
		});
		function onModelChange(selection, source = "user") {
			const credentialId = effectiveCredentials.value?.[selection.provider];
			if (!credentialId) {
				showError(new Error(i18n.baseText("credentials.noResults")), i18n.baseText("error"));
				return;
			}
			const modelName = sanitizeModelId(selection.provider, selection.model);
			const model = `${selection.provider}/${modelName}`;
			const capabilities = PROVIDER_CAPABILITIES[selection.provider];
			const webSearchChanges = normalizeWebSearchForModelChange(props.config, capabilities?.webSearch ?? false);
			const webSearchConfig = "config" in webSearchChanges ? webSearchChanges.config : props.config?.config;
			const promptCachingChanges = normalizePromptCachingForModelChange(webSearchConfig, getModelPromptCachingCapability(model));
			const reasoningChanges = normalizeReasoningForModelChange("config" in promptCachingChanges ? promptCachingChanges.config : webSearchConfig, catalog.value[selection.provider]?.models[modelName]?.reasoning);
			defaultModelHint.value = source === "auto";
			emit("update:config", {
				model,
				credential: credentialId,
				...webSearchChanges,
				...promptCachingChanges,
				...reasoningChanges
			}, source === "auto" ? { source: "auto" } : void 0);
		}
		watch(() => pendingDefaultProvider.value ? getDefaultModelForPicker(effectiveCredentials.value, pendingDefaultProvider.value) : null, (defaultModel) => {
			const currentModel = parseModelString(modelToString(props.config?.model));
			if (!defaultModel || props.disabled || currentModel?.provider === defaultModel.provider && currentModel.name === defaultModel.model) {
				pendingDefaultProvider.value = null;
				return;
			}
			pendingDefaultProvider.value = null;
			onModelChange(defaultModel, "auto");
		});
		const initialDefaultSeeded = ref(false);
		watch([effectiveCredentials, () => props.config], ([credentials, config]) => {
			if (initialDefaultSeeded.value || props.disabled) return;
			if (!credentials || !config || modelToString(config.model)) return;
			const provider = AGENT_MODEL_PROVIDERS.find((candidate) => credentials[candidate] && credentials[candidate] !== "__AI_GATEWAY_MANAGED__") ?? (credentials.openai === "__AI_GATEWAY_MANAGED__" ? "openai" : void 0);
			if (!provider) return;
			initialDefaultSeeded.value = true;
			pendingDefaultProvider.value = provider;
		}, { immediate: true });
		function onSelectCredential(provider, credentialId) {
			selectCredential(provider, credentialId);
			if (parseModelString(modelToString(props.config?.model))?.provider === provider && credentialId) emit("update:config", { credential: credentialId });
		}
		const instructions = ref(props.config?.instructions ?? "");
		const instructionsEditor = ref();
		const modelSelector = ref();
		watch(() => props.config?.instructions ?? "", (value) => {
			if (value !== instructions.value) instructions.value = value;
		});
		const emitInstructionsDebounced = useDebounceFn(() => {
			emit("update:config", { instructions: instructions.value });
		}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));
		function focusInstructions() {
			instructionsEditor.value?.focus();
		}
		function focusModel() {
			modelSelector.value?.open();
		}
		function onInstructionsInput(value) {
			instructions.value = value;
			emit("draft:config");
			if (props.immediateUpdates) {
				emit("update:config", { instructions: value });
				return;
			}
			emitInstructionsDebounced();
		}
		__expose({
			focusInstructions,
			focusModel
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentPanel_default, {
				header: unref(i18n).baseText("agents.builder.agent.title"),
				"header-visibility": "visually-hidden",
				"data-testid": "agent-info-panel"
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.panels) }, [
					props.showModel ? (openBlock(), createElementBlock("div", _hoisted_1$2, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
						createBaseVNode("div", { class: normalizeClass([_ctx.$style.label, props.disabled && unref(agent_panel_module_default).disabled]) }, [createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agent.model.label")) + " ", 1), createVNode(unref(N8nText_default), {
								step: "sm",
								bold: "",
								color: "danger"
							}, {
								default: withCtx(() => [..._cache[1] || (_cache[1] = [createTextVNode("*", -1)])]),
								_: 1
							})]),
							_: 1
						}, 8, ["class"]), createVNode(unref(N8nText_default), {
							step: "sm",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agent.model.description")), 1)]),
							_: 1
						})], 2),
						createVNode(AgentModelSelector_default, {
							ref_key: "modelSelector",
							ref: modelSelector,
							disabled: props.disabled,
							"selected-model": selectedAgent.value,
							credentials: effectiveCredentials.value,
							"models-by-provider": filteredAgents.value,
							"is-loading": unref(isLoading),
							"project-id": unref(projectId),
							"warn-missing-credentials": true,
							"bound-credential-id": props.config?.credential ?? null,
							"data-testid": "agent-model-selector",
							onChange: onModelChange,
							onSelectCredential
						}, null, 8, [
							"disabled",
							"selected-model",
							"credentials",
							"models-by-provider",
							"is-loading",
							"project-id",
							"bound-credential-id"
						]),
						defaultModelHint.value && !props.disabled ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "info",
							slim: "",
							class: normalizeClass(_ctx.$style.defaultHint),
							"data-testid": "agent-default-model-hint"
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultHintBody) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.defaultHintText) }, [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("agents.builder.agent.model.defaultSelected.title")), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.agent.model.defaultSelected.description")), 1)], 2), createVNode(unref(N8nIconButton_default), {
								icon: "x",
								variant: "ghost",
								size: "small",
								title: unref(i18n).baseText("agents.builder.agent.model.defaultSelected.dismiss"),
								"data-testid": "agent-default-model-hint-dismiss",
								onClick: _cache[0] || (_cache[0] = ($event) => defaultModelHint.value = false)
							}, null, 8, ["title"])], 2)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					], 2)])) : createCommentVNode("", true),
					props.showModel && props.showInstructions ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.divider),
						"aria-hidden": "true"
					}, null, 2)) : createCommentVNode("", true),
					props.showInstructions ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.field),
						"data-testid": "agent-instructions-panel"
					}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.label, props.disabled && unref(agent_panel_module_default).disabled]) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agent.instructions.label")) + " ", 1), createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							color: "danger"
						}, {
							default: withCtx(() => [..._cache[2] || (_cache[2] = [createTextVNode("*", -1)])]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						step: "sm",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agent.instructions.description")), 1)]),
						_: 1
					})], 2), createVNode(unref(MarkdownEditor_default), {
						ref_key: "instructionsEditor",
						ref: instructionsEditor,
						id: unref(instructionsEditorId),
						class: normalizeClass(_ctx.$style.instructionsDocument),
						"model-value": instructions.value,
						disabled: props.disabled,
						placeholder: unref(i18n).baseText("agents.builder.agent.instructions.placeholder"),
						"show-toolbar": "floating",
						expandedViewToolbarMode: "always",
						variant: "contained",
						allowExpandedView: "",
						"data-testid": "agent-instructions-document",
						"onUpdate:modelValue": onInstructionsInput
					}, null, 8, [
						"id",
						"class",
						"model-value",
						"disabled",
						"placeholder"
					])], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, ["header"]);
		};
	}
}), [["__cssModules", { "$style": {
	panels: "_panels_21ks1_2",
	instructionsDocument: "_instructionsDocument_21ks1_15",
	field: "_field_21ks1_25",
	label: "_label_21ks1_31",
	defaultHint: "_defaultHint_21ks1_38",
	defaultHintBody: "_defaultHintBody_21ks1_42",
	defaultHintText: "_defaultHintText_21ks1_49",
	divider: "_divider_21ks1_54"
} }]]);
//#endregion
//#region src/features/agents/composables/useAgentCapabilityIssueMessages.ts
function useAgentCapabilityIssueMessages(getValidationIssues) {
	const i18n = useI18n();
	function issueMessage(issue) {
		return i18n.baseText(resolveAgentValidationIssueMessageKey(issue), { interpolate: getAgentValidationIssueInterpolation(issue) });
	}
	function issueMessages(issues) {
		return [...new Set(issues.map(issueMessage))];
	}
	function groupIssueMessages(kind, keyOf, include = () => true) {
		const byKey = /* @__PURE__ */ new Map();
		for (const issue of getValidationIssues()) {
			if (issue.capability.kind !== kind || !include(issue)) continue;
			const key = keyOf(issue);
			if (key === void 0) continue;
			const existing = byKey.get(key);
			if (existing) existing.push(issue);
			else byKey.set(key, [issue]);
		}
		return new Map([...byKey].map(([key, issues]) => [key, issueMessages(issues)]));
	}
	return { groupIssueMessages };
}
/** One translated sentence, so a locale owns its wording and order. */
function chipRestrictionText(restriction) {
	return restriction.message ?? describeAgentToolRestriction(restriction.typeLabel, { scope: restriction.scope });
}
function toUngroupedToolRow(row) {
	const item = {
		index: row.index,
		enabled: row.enabled,
		label: row.label,
		nodeType: row.nodeType,
		openTarget: row.openTarget,
		invalid: row.invalid,
		invalidReasons: row.invalidReasons,
		restriction: row.restriction
	};
	return {
		index: row.index,
		enabled: row.enabled,
		label: row.label,
		typeLabel: row.typeLabel,
		nodeType: row.nodeType,
		fallbackIcon: row.fallbackIcon,
		invalid: row.invalid,
		invalidReasons: row.invalidReasons,
		warning: row.warning,
		warningReasons: row.warningReasons,
		restriction: row.restriction,
		isGrouped: false,
		tool: item
	};
}
function toGroupedToolRow(group) {
	const [first] = group;
	return {
		index: first.index,
		enabled: group.some((row) => row.enabled),
		label: `${group.length} ${first.typeLabel}`,
		typeLabel: first.typeLabel,
		nodeType: first.nodeType,
		fallbackIcon: first.fallbackIcon,
		invalid: group.some((row) => row.invalid),
		invalidReasons: [...new Set(group.flatMap((row) => row.invalidReasons))],
		warning: group.some((row) => row.warning),
		warningReasons: [...new Set(group.flatMap((row) => row.warningReasons))],
		restriction: first.restriction,
		isGrouped: true,
		tools: group.map((row) => ({
			index: row.index,
			enabled: row.enabled,
			label: row.label,
			nodeType: row.nodeType,
			openTarget: row.openTarget,
			invalid: row.invalid,
			invalidReasons: row.invalidReasons,
			restriction: row.restriction
		}))
	};
}
function buildToolRows(rows) {
	const groupedRows = [];
	const nodeGroups = /* @__PURE__ */ new Map();
	for (const row of rows) {
		/**
		* Only node tools with a resolved node type are eligible for grouping.
		* Workflow tools, custom tools, and unresolved node tools stay ungrouped
		* because this grouping logic relies on nodeType.name as the canonical key
		* and on the resolved node type for the grouped label/icon.
		*/
		if (row.toolType !== "node" || !row.nodeType) {
			groupedRows.push(toUngroupedToolRow(row));
			continue;
		}
		/**
		* Restricted state joins the key. A node type usually decides it for every tool of that
		* type, but a tool that embeds an inline agent is restricted by what it holds, so two
		* tools of one type can differ. Grouping them would dim a tool that is perfectly usable.
		*/
		const key = `${row.nodeType.name}|${row.restriction ? "restricted" : "allowed"}`;
		const group = nodeGroups.get(key);
		if (group) {
			group.push(row);
			continue;
		}
		nodeGroups.set(key, [row]);
	}
	for (const group of nodeGroups.values()) {
		if (group.length >= 2) {
			groupedRows.push(toGroupedToolRow(group));
			continue;
		}
		groupedRows.push(...group.map(toUngroupedToolRow));
	}
	return groupedRows.sort((left, right) => left.index - right.index);
}
//#endregion
//#region src/features/agents/components/AgentChipButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["disabled", "aria-description"];
var AgentChipButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentChipButton",
	props: {
		icon: {},
		disabled: {
			type: Boolean,
			default: false
		},
		deactivated: {
			type: Boolean,
			default: false
		},
		variant: { default: "default" },
		active: {
			type: Boolean,
			default: false
		},
		invalid: {
			type: Boolean,
			default: false
		},
		invalidReasons: { default: () => [] },
		invalidIcon: { default: void 0 },
		warning: {
			type: Boolean,
			default: false
		},
		warningReasons: { default: () => [] },
		restriction: { default: null },
		clickable: {
			type: Boolean,
			default: true
		}
	},
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const i18n = useI18n();
		const reasons = computed(() => props.invalid ? props.invalidReasons : props.warningReasons);
		const showAlertIcon = computed(() => !props.deactivated && !props.restriction && (props.invalid || props.warning));
		const restrictionText = computed(() => props.restriction ? chipRestrictionText(props.restriction) : "");
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("button", {
				type: "button",
				class: normalizeClass([
					_ctx.$style.chip,
					props.variant === "suggestion" ? _ctx.$style.suggestion : _ctx.$style.default,
					{
						[_ctx.$style.active]: props.active,
						[_ctx.$style.deactivated]: props.deactivated,
						[_ctx.$style.restricted]: !!props.restriction,
						[_ctx.$style.invalid]: props.invalid && !props.deactivated && !props.restriction,
						[_ctx.$style.warning]: props.warning && !props.invalid && !props.deactivated && !props.restriction,
						[_ctx.$style.nonClickable]: !props.clickable
					}
				]),
				disabled: props.disabled,
				"aria-description": props.deactivated ? unref(i18n).baseText("agents.builder.capabilities.deactivated") : void 0,
				onClick: _cache[1] || (_cache[1] = ($event) => emit("click", $event))
			}, [
				props.icon || _ctx.$slots.icon ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.iconWrapper)
				}, [renderSlot(_ctx.$slots, "icon", {}, () => [props.icon ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: props.icon,
					size: 16,
					class: normalizeClass([_ctx.$style.icon, { [_ctx.$style.suggestionIcon]: props.variant === "suggestion" }])
				}, null, 8, ["icon", "class"])) : createCommentVNode("", true)])], 2)) : createCommentVNode("", true),
				createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark",
					class: normalizeClass(_ctx.$style.text)
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, ["class"]),
				props.restriction ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(restrictionText.value), 1)]),
					default: withCtx(() => [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.lock),
						onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
					}, [createVNode(unref(N8nIcon_default), {
						icon: "lock",
						size: "xsmall",
						class: normalizeClass(_ctx.$style.lockIcon),
						"data-test-id": "node-restricted-icon"
					}, null, 8, ["class"])], 2)]),
					_: 1
				})) : createCommentVNode("", true),
				showAlertIcon.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 2,
					disabled: reasons.value.length === 0,
					placement: "top"
				}, {
					content: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(reasons.value, (reason) => {
						return openBlock(), createElementBlock("div", { key: reason }, toDisplayString(reason), 1);
					}), 128))]),
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: props.invalid && props.invalidIcon ? props.invalidIcon : "triangle-alert",
						size: 14,
						class: normalizeClass([_ctx.$style.alertIcon, {
							[_ctx.$style.warningIcon]: !props.invalid,
							[_ctx.$style.errorIcon]: props.invalid && props.invalidIcon
						}]),
						"data-testid": props.invalid ? "agent-chip-invalid-icon" : "agent-chip-warning-icon"
					}, null, 8, [
						"icon",
						"class",
						"data-testid"
					])]),
					_: 1
				}, 8, ["disabled"])) : createCommentVNode("", true)
			], 10, _hoisted_1$1);
		};
	}
}), [["__cssModules", { "$style": {
	chip: "_chip_pm567_3",
	"default": "_default_pm567_21",
	deactivated: "_deactivated_pm567_21",
	invalid: "_invalid_pm567_30",
	lock: "_lock_pm567_38",
	lockIcon: "_lockIcon_pm567_44",
	restricted: "_restricted_pm567_48",
	iconWrapper: "_iconWrapper_pm567_48",
	text: "_text_pm567_49",
	warning: "_warning_pm567_53",
	alertIcon: "_alertIcon_pm567_57",
	warningIcon: "_warningIcon_pm567_62",
	errorIcon: "_errorIcon_pm567_66",
	nonClickable: "_nonClickable_pm567_70",
	suggestion: "_suggestion_pm567_74",
	suggestionSlideIn: "_suggestionSlideIn_pm567_1",
	active: "_active_pm567_88",
	icon: "_icon_pm567_48",
	suggestionIcon: "_suggestionIcon_pm567_112"
} }]]);
//#endregion
//#region src/features/agents/components/AgentChipRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["inert"];
var AgentChipRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentChipRow",
	props: {
		label: {},
		itemCount: {},
		addLabel: {},
		addButtonTestId: { default: void 0 },
		disabled: {
			type: Boolean,
			default: false
		},
		showLabel: {
			type: Boolean,
			default: true
		}
	},
	emits: ["add"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.row),
				inert: props.disabled || void 0
			}, [props.showLabel && props.itemCount > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				bold: "",
				class: normalizeClass(_ctx.$style.label)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(props.label), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.chips) }, [renderSlot(_ctx.$slots, "default"), props.itemCount > 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: props.addLabel,
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "medium",
					"icon-only": "",
					"aria-label": props.addLabel,
					disabled: props.disabled,
					"data-testid": props.addButtonTestId,
					onClick: _cache[0] || (_cache[0] = ($event) => emit("add"))
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "plus",
						size: 16,
						color: "text-light"
					})]),
					_: 1
				}, 8, [
					"aria-label",
					"disabled",
					"data-testid"
				])]),
				_: 1
			}, 8, ["content"])) : (openBlock(), createBlock(unref(N8nButton_default), {
				key: 1,
				class: normalizeClass(_ctx.$style.emptyAddButton),
				variant: "ghost",
				size: "medium",
				disabled: props.disabled,
				"data-testid": props.addButtonTestId,
				onClick: _cache[1] || (_cache[1] = ($event) => emit("add"))
			}, {
				icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "plus",
					size: 16
				})]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(props.addLabel), 1)]),
				_: 1
			}, 8, [
				"class",
				"disabled",
				"data-testid"
			]))], 2), _ctx.$slots.extra ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.extra)
			}, [renderSlot(_ctx.$slots, "extra")], 2)) : createCommentVNode("", true)], 2)], 10, _hoisted_1);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_xqjys_1",
	label: "_label_xqjys_7",
	content: "_content_xqjys_15",
	chips: "_chips_xqjys_22",
	emptyAddButton: "_emptyAddButton_xqjys_30",
	extra: "_extra_xqjys_41"
} }]]);
//#endregion
//#region src/features/agents/components/AgentItemContextMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var AgentItemContextMenu_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AgentItemContextMenu",
	props: {
		disabled: { type: Boolean },
		enabled: {
			type: Boolean,
			default: void 0
		}
	},
	emits: ["remove", "update:enabled"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const open = ref(false);
		const items = computed(() => {
			const actions = [];
			if (props.enabled !== void 0) actions.push({
				type: "item",
				id: "toggle-activation",
				label: i18n.baseText(props.enabled ? "agents.builder.contextMenu.deactivate" : "agents.builder.contextMenu.activate"),
				icon: {
					type: "icon",
					value: props.enabled ? "timer" : "play"
				},
				disabled: props.disabled
			});
			actions.push({
				type: "group",
				id: "destructive",
				children: [{
					type: "item",
					id: "remove",
					label: i18n.baseText("agents.builder.contextMenu.remove"),
					icon: {
						type: "icon",
						value: "trash-2"
					},
					variant: "destructive",
					disabled: props.disabled
				}]
			});
			return actions;
		});
		function select(action) {
			if (props.disabled) return;
			if (action === "remove") emit("remove");
			else if (action === "toggle-activation" && props.enabled !== void 0) emit("update:enabled", !props.enabled);
		}
		function preventEditWhileOpen(event) {
			if (!open.value) return;
			event.preventDefault();
			event.stopPropagation();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ContextMenu_default), {
				items: items.value,
				disabled: __props.disabled,
				onSelect: select,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => open.value = $event)
			}, {
				trigger: withCtx(() => [createVNode(unref(Slot), mergeProps(_ctx.$attrs, {
					class: _ctx.$style.trigger,
					onClickCapture: preventEditWhileOpen
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["class"])]),
				_: 3
			}, 8, ["items", "disabled"]);
		};
	}
}), [["__cssModules", { "$style": { trigger: "_trigger_me8ub_2" } }]]);
//#endregion
//#region src/features/agents/components/AgentSkillsSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentSkillsSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSkillsSection",
	props: {
		skills: {},
		disabled: {
			type: Boolean,
			default: false
		},
		showLabel: {
			type: Boolean,
			default: true
		},
		validationIssues: { default: () => [] },
		outdatedSkillIds: { default: () => [] }
	},
	emits: [
		"open-skill",
		"add-skill",
		"remove-skill"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { groupIssueMessages } = useAgentCapabilityIssueMessages(() => props.validationIssues);
		const skillIssueMessages = computed(() => groupIssueMessages("skill", (issue) => issue.capability.id));
		const outdatedSkillIds = computed(() => new Set(props.outdatedSkillIds));
		const outdatedWarning = computed(() => [i18n.baseText("agents.builder.skills.outdated.warning")]);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentChipRow_default, {
				label: unref(i18n).baseText("agents.builder.skills.title"),
				"item-count": __props.skills.length,
				"add-label": unref(i18n).baseText("agents.builder.skills.add"),
				"add-button-test-id": "agent-capabilities-add-skill",
				disabled: props.disabled,
				"show-label": props.showLabel,
				onAdd: _cache[0] || (_cache[0] = ($event) => emit("add-skill"))
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.skills, ({ id, skill }) => {
					return openBlock(), createElementBlock("div", {
						key: id,
						class: normalizeClass(_ctx.$style.chipGroup)
					}, [createVNode(AgentItemContextMenu_default, {
						disabled: props.disabled,
						onRemove: ($event) => emit("remove-skill", id)
					}, {
						default: withCtx(() => [createVNode(AgentChipButton_default, {
							icon: "book-open",
							invalid: (skillIssueMessages.value.get(id) ?? []).length > 0,
							"invalid-reasons": skillIssueMessages.value.get(id) ?? [],
							warning: outdatedSkillIds.value.has(id),
							"warning-reasons": outdatedSkillIds.value.has(id) ? outdatedWarning.value : [],
							disabled: props.disabled,
							class: normalizeClass(_ctx.$style.skillChip),
							"data-testid": "agent-capabilities-skill-row",
							onClick: ($event) => emit("open-skill", id)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(skill.name || id), 1)]),
							_: 2
						}, 1032, [
							"invalid",
							"invalid-reasons",
							"warning",
							"warning-reasons",
							"disabled",
							"class",
							"onClick"
						])]),
						_: 2
					}, 1032, ["disabled", "onRemove"])], 2);
				}), 128))]),
				_: 1
			}, 8, [
				"label",
				"item-count",
				"add-label",
				"disabled",
				"show-label"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	chipGroup: "_chipGroup_2zv1u_1",
	skillChip: "_skillChip_2zv1u_9"
} }]]);
//#endregion
//#region src/features/agents/components/AgentWebSearchSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ANTHROPIC_WEB_SEARCH_DEFAULT_MAX_USES = 5;
var AgentWebSearchSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentWebSearchSection",
	props: {
		config: {},
		disabled: {
			type: Boolean,
			default: false
		},
		projectId: {}
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const credentialsStore = useCredentialsStore();
		const projectsStore = useProjectsStore();
		const uiStore = useUIStore();
		const aiGateway = useAiGateway();
		onMounted(() => {
			aiGateway.fetchConfig();
			if (aiGateway.isEnabled.value) aiGateway.fetchWallet();
		});
		const DEFAULT_CAPABILITIES = { webSearch: false };
		const searchContextSizeSegments = computed(function getSearchContextSizeSegments() {
			return [
				{
					label: i18n.baseText("agents.builder.advanced.webSearch.contextSize.low"),
					value: "low"
				},
				{
					label: i18n.baseText("agents.builder.advanced.webSearch.contextSize.medium"),
					value: "medium"
				},
				{
					label: i18n.baseText("agents.builder.advanced.webSearch.contextSize.high"),
					value: "high"
				}
			];
		});
		const provider = computed(() => parseProvider(props.config?.model));
		const capabilities = computed(() => PROVIDER_CAPABILITIES[provider.value] ?? DEFAULT_CAPABILITIES);
		const hasNativeWebSearch = computed(() => Boolean(capabilities.value.webSearch));
		const nativeWebSearchLabel = computed(() => isAgentModelProvider(provider.value) ? AGENT_MODEL_PROVIDER_DEFINITIONS[provider.value].displayName : provider.value);
		const webSearchMenuItems = computed(() => [
			{
				id: "off",
				label: i18n.baseText("agents.builder.advanced.webSearch.method.off"),
				checked: webSearchMethod.value === "off"
			},
			...capabilities.value.webSearch ? [{
				id: "native",
				label: nativeWebSearchLabel.value,
				checked: webSearchMethod.value === "native"
			}] : [],
			{
				id: "brave",
				label: i18n.baseText("agents.builder.advanced.webSearch.fallbackProvider.brave"),
				checked: webSearchMethod.value === "brave",
				divided: true
			},
			{
				id: "searxng",
				label: i18n.baseText("agents.builder.advanced.webSearch.fallbackProvider.searxng"),
				checked: webSearchMethod.value === "searxng"
			}
		]);
		const selectedWebSearchLabel = computed(() => webSearchMenuItems.value.find((item) => item.checked)?.label ?? "");
		const webSearchEnabled = ref(props.config?.config?.webSearch?.enabled === true);
		const webSearchMethod = ref(webSearchEnabled.value ? getWebSearchMethod(props.config, hasNativeWebSearch.value) : "off");
		const webSearchArgs = ref(getNativeWebSearchArgs(props.config, capabilities.value.webSearch));
		const webSearchMaxUses = ref("");
		const webSearchExternalAccess = ref(true);
		const webSearchContextSize = ref("medium");
		const fallbackWebSearchProvider = ref(props.config?.config?.webSearch?.provider === "searxng" ? "searxng" : "brave");
		const fallbackWebSearchCredential = ref(props.config?.config?.webSearch?.credential ?? "");
		function syncWebSearchOptions(args) {
			webSearchMaxUses.value = typeof args.maxUses === "number" ? String(args.maxUses) : String(ANTHROPIC_WEB_SEARCH_DEFAULT_MAX_USES);
			webSearchExternalAccess.value = typeof args.externalWebAccess === "boolean" ? args.externalWebAccess : true;
			webSearchContextSize.value = args.searchContextSize === "low" || args.searchContextSize === "medium" || args.searchContextSize === "high" ? args.searchContextSize : "medium";
		}
		syncWebSearchOptions(webSearchArgs.value);
		watch(() => props.config, (cfg) => {
			if (!cfg) return;
			webSearchEnabled.value = cfg.config?.webSearch?.enabled === true;
			webSearchMethod.value = webSearchEnabled.value ? getWebSearchMethod(cfg, hasNativeWebSearch.value) : "off";
			webSearchArgs.value = getNativeWebSearchArgs(cfg, capabilities.value.webSearch);
			fallbackWebSearchProvider.value = webSearchMethod.value === "searxng" ? "searxng" : "brave";
			fallbackWebSearchCredential.value = cfg.config?.webSearch?.credential ?? "";
			syncWebSearchOptions(webSearchArgs.value);
		}, { deep: true });
		const fallbackCredentialType = computed(() => webSearchMethod.value === "searxng" ? "searXngApi" : "braveSearchApi");
		const balancePill = computed(() => {
			const balance = aiGateway.balance.value;
			if (balance === void 0) return void 0;
			const depleted = balance <= 0;
			return {
				text: depleted ? i18n.baseText("aiGateway.wallet.noCredits") : i18n.baseText("aiGateway.wallet.balanceRemaining", { interpolate: { balance: `$${Number(balance).toFixed(2)}` } }),
				type: depleted ? "danger" : "default"
			};
		});
		const managedCredentialOption = computed(() => {
			if (!aiGateway.isEnabled.value || !aiGateway.canServeCredentialType(fallbackCredentialType.value)) return null;
			return {
				value: AI_GATEWAY_MANAGED_TAG,
				label: i18n.baseText("aiGateway.credentialMode.n8nConnect.title"),
				...balancePill.value && { pill: balancePill.value }
			};
		});
		const fallbackCredentials = computed(() => credentialsStore.getUsableCredentialByType(fallbackCredentialType.value).map((credential) => ({
			id: credential.id,
			name: credential.name,
			typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
			homeProject: credential.homeProject
		})));
		const projectForPermissions = computed(() => {
			if (projectsStore.currentProject?.id === props.projectId) return projectsStore.currentProject;
			if (projectsStore.personalProject?.id === props.projectId) return projectsStore.personalProject;
			return projectsStore.myProjects.find((project) => project.id === props.projectId) ?? null;
		});
		const credentialPermissions = computed(() => {
			const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
			return {
				...permissions,
				create: !!permissions.create
			};
		});
		function buildWebSearchArgs() {
			const tool = capabilities.value.webSearch;
			if (!tool || webSearchMethod.value !== "native") return {};
			if (tool === "anthropic.web_search") {
				const maxUses = Number(webSearchMaxUses.value);
				return { ...Number.isFinite(maxUses) && maxUses > 0 && { maxUses } };
			}
			if (tool === "openai.web_search") return {
				externalWebAccess: webSearchExternalAccess.value,
				searchContextSize: webSearchContextSize.value
			};
			return {};
		}
		function emitWebSearchConfig() {
			if (!webSearchEnabled.value) return;
			const method = webSearchMethod.value === "off" ? "native" : webSearchMethod.value;
			emit("update:config", withWebSearchConfig(props.config, true, method, capabilities.value.webSearch, buildWebSearchArgs(), fallbackWebSearchCredential.value));
		}
		function onWebSearchOptionInput() {
			emitWebSearchConfig();
		}
		function onWebSearchContextSizeChange(value) {
			webSearchContextSize.value = value;
			onWebSearchOptionInput();
		}
		function onWebSearchMethodChange(value) {
			webSearchMethod.value = value;
			webSearchEnabled.value = value !== "off";
			const method = value === "off" ? "native" : value;
			const nextFallbackProvider = value === "brave" || value === "searxng" ? value : null;
			if (nextFallbackProvider && nextFallbackProvider !== fallbackWebSearchProvider.value) fallbackWebSearchCredential.value = "";
			if (nextFallbackProvider) fallbackWebSearchProvider.value = nextFallbackProvider;
			emit("update:config", withWebSearchConfig(props.config, webSearchEnabled.value, method, capabilities.value.webSearch, buildWebSearchArgs(), fallbackWebSearchCredential.value));
		}
		function onFallbackCredentialChange(value) {
			fallbackWebSearchCredential.value = value;
			emit("update:config", withWebSearchConfig(props.config, webSearchEnabled.value, webSearchMethod.value === "off" ? "native" : webSearchMethod.value, capabilities.value.webSearch, buildWebSearchArgs(), value));
		}
		function onCreateFallbackCredential() {
			if (props.disabled || !credentialPermissions.value.create) return;
			uiStore.openNewCredential(fallbackCredentialType.value, false, false, props.projectId, void 0, void 0, void 0, {
				hideAskAssistant: true,
				onCredentialCreated: async (credential) => {
					try {
						await (props.projectId ? credentialsStore.fetchUsableCredentials({
							projectId: props.projectId,
							forAgent: true
						}) : credentialsStore.refreshUsableCredentials());
					} catch (error) {
						toast.showError(error, i18n.baseText("agents.builder.credentials.refreshError"));
					}
					onFallbackCredentialChange(credential.id);
				}
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.content),
				"data-testid": "agent-web-search-content"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingGroup) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
				step: "sm",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.label")), 1)]),
				_: 1
			}), createVNode(unref(N8nText_default), {
				step: "sm",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.hint")), 1)]),
				_: 1
			})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.methodControl) }, [createVNode(unref(DropdownMenu_default), {
				class: normalizeClass(_ctx.$style.methodMenu),
				items: webSearchMenuItems.value,
				disabled: props.disabled,
				placement: "bottom-end",
				"data-testid": "agent-web-search-method",
				onSelect: onWebSearchMethodChange
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					disabled: props.disabled,
					class: normalizeClass(_ctx.$style.methodTrigger)
				}, {
					default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.dropdownTriggerLabel) }, toDisplayString(selectedWebSearchLabel.value), 3), createVNode(unref(N8nIcon_default), {
						icon: "chevron-down",
						size: "small",
						color: "text-light"
					})]),
					_: 1
				}, 8, ["disabled", "class"])]),
				_: 1
			}, 8, [
				"class",
				"items",
				"disabled"
			])], 2)], 2), webSearchEnabled.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.subSettings),
				"data-testid": "agent-web-search-settings"
			}, [
				webSearchMethod.value === "native" && capabilities.value.webSearch === "anthropic.web_search" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(unref(agent_panel_module_default).settingRow)
				}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
					step: "sm",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.maxUses.label")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					step: "sm",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.maxUses.hint")), 1)]),
					_: 1
				})], 2), createVNode(unref(N8nInputNumber_default), {
					"model-value": Number(webSearchMaxUses.value),
					min: 1,
					precision: 0,
					controls: false,
					disabled: props.disabled,
					class: normalizeClass(unref(agent_panel_module_default).settingControlShort),
					"data-testid": "agent-web-search-max-uses",
					"onUpdate:modelValue": _cache[0] || (_cache[0] = (v) => {
						webSearchMaxUses.value = String(v);
						onWebSearchOptionInput();
					})
				}, null, 8, [
					"model-value",
					"disabled",
					"class"
				])], 2)) : createCommentVNode("", true),
				webSearchMethod.value === "native" && capabilities.value.webSearch === "openai.web_search" ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(unref(agent_panel_module_default).settingRow)
				}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
					step: "sm",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.externalAccess.label")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					step: "sm",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.externalAccess.hint")), 1)]),
					_: 1
				})], 2), createVNode(unref(Switch_default), {
					"model-value": webSearchExternalAccess.value,
					disabled: props.disabled,
					class: normalizeClass([_ctx.$style.switchControl, unref(agent_panel_module_default).settingControl]),
					"data-testid": "agent-web-search-external-access",
					"onUpdate:modelValue": _cache[1] || (_cache[1] = (v) => {
						webSearchExternalAccess.value = Boolean(v);
						onWebSearchOptionInput();
					})
				}, null, 8, [
					"model-value",
					"disabled",
					"class"
				])], 2)) : createCommentVNode("", true),
				webSearchMethod.value === "native" && capabilities.value.webSearch === "openai.web_search" ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(unref(agent_panel_module_default).settingRow)
				}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
					step: "sm",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.contextSize.label")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					step: "sm",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.contextSize.hint")), 1)]),
					_: 1
				})], 2), createVNode(unref(N8nSegmentControl_default), {
					"model-value": webSearchContextSize.value,
					options: searchContextSizeSegments.value,
					size: "default",
					disabled: props.disabled,
					class: normalizeClass(unref(agent_panel_module_default).settingControl),
					"data-testid": "agent-web-search-context-size",
					"onUpdate:modelValue": onWebSearchContextSizeChange
				}, null, 8, [
					"model-value",
					"options",
					"disabled",
					"class"
				])], 2)) : createCommentVNode("", true),
				webSearchMethod.value !== "native" ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(unref(agent_panel_module_default).settingRow)
				}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
					step: "sm",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.credential.label")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					step: "sm",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.webSearch.credential.hint")), 1)]),
					_: 1
				})], 2), createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingControlWide) }, [createVNode(AgentCredentialSelect_default, {
					"model-value": fallbackWebSearchCredential.value,
					credentials: fallbackCredentials.value,
					"managed-option": managedCredentialOption.value,
					placeholder: unref(i18n).baseText("agents.builder.advanced.webSearch.credential.placeholder"),
					"credential-permissions": credentialPermissions.value,
					disabled: props.disabled,
					"data-test-id": "agent-web-search-fallback-credential",
					"onUpdate:modelValue": onFallbackCredentialChange,
					onCreate: onCreateFallbackCredential
				}, null, 8, [
					"model-value",
					"credentials",
					"managed-option",
					"placeholder",
					"credential-permissions",
					"disabled"
				])], 2)], 2)) : createCommentVNode("", true)
			], 2)) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1wwvx_2",
	settingGroup: "_settingGroup_1wwvx_9",
	subSettings: "_subSettings_1wwvx_15",
	methodControl: "_methodControl_1wwvx_24",
	methodMenu: "_methodMenu_1wwvx_31",
	methodTrigger: "_methodTrigger_1wwvx_36",
	dropdownTriggerLabel: "_dropdownTriggerLabel_1wwvx_41",
	switchControl: "_switchControl_1wwvx_47"
} }]]);
//#endregion
//#region src/features/agents/components/AgentCapabilitiesSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentCapabilitiesSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentCapabilitiesSection",
	props: {
		config: {},
		tools: {},
		customTools: {},
		skills: {},
		supportsActivation: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		projectId: {},
		agentId: {},
		isPublished: { type: Boolean },
		taskRefs: { default: () => [] },
		reloadKey: {},
		agentUnsaved: { type: Boolean },
		validationIssues: { default: () => [] },
		sections: { default: () => [
			"tools",
			"skills",
			"subAgents",
			"tasks"
		] }
	},
	emits: [
		"open-tool",
		"open-skill",
		"add-tool",
		"add-skill",
		"remove-tool",
		"remove-skill",
		"toggle-task",
		"tasks-changed",
		"update:config"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const visibleSections = computed(() => new Set(props.sections));
		function showSection(section) {
			return visibleSections.value.has(section);
		}
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const { createAgent } = useCreateAgent();
		const openToolGroup = ref(null);
		const projectIdRef = computed(() => props.projectId);
		const { canCreate: canCreateAgent } = useAgentPermissions(projectIdRef);
		const { list: projectAgents, ensureLoaded: ensureProjectAgentsLoaded, refresh: refreshProjectAgents } = useProjectAgentsList(projectIdRef);
		const mcpServers = computed(() => props.config?.mcpServers ?? []);
		const selectedSubAgentRefs = computed(() => props.config?.subAgents?.agents ?? []);
		const selectedSubAgentIds = computed(() => selectedSubAgentRefs.value.map(({ agentId }) => agentId));
		const selectedSubAgentIdSet = computed(() => new Set(selectedSubAgentIds.value));
		const availableSubAgents = computed(() => (projectAgents.value ?? []).filter((agent) => agent.id !== props.agentId));
		const archivedSubAgents = ref([]);
		const selectedSubAgents = computed(() => selectedSubAgentRefs.value.map(({ agentId, useWhen, enabled }) => {
			const agent = projectAgents.value?.find((candidate) => candidate.id === agentId) ?? archivedSubAgents.value.find((candidate) => candidate.id === agentId);
			const validationReasons = enabled === false ? [] : subAgentIssueMessages.value.get(agentId) ?? [];
			const reasons = validationReasons.length > 0 || agent || projectAgents.value === null || enabled === false ? validationReasons : [i18n.baseText("agents.builder.validation.issue.subAgent.missingReference")];
			return {
				id: agentId,
				enabled: enabled !== false,
				name: agent?.name ?? i18n.baseText("agents.builder.subAgents.unavailable"),
				isArchived: agent?.isArchived === true,
				useWhen: useWhen ?? "",
				invalid: reasons.length > 0,
				invalidReasons: reasons
			};
		}));
		const { groupIssueMessages } = useAgentCapabilityIssueMessages(() => props.validationIssues);
		const toolIssueMessages = computed(() => groupIssueMessages("tool", (issue) => issue.capability.index, (issue) => !isWarningIssue(issue)));
		const toolWarningMessages = computed(() => groupIssueMessages("tool", (issue) => issue.capability.index, isWarningIssue));
		const mcpServerIssueMessages = computed(() => groupIssueMessages("mcpServer", (issue) => issue.capability.id));
		const subAgentIssueMessages = computed(() => groupIssueMessages("subAgent", (issue) => issue.capability.id));
		/**
		* The restricted capabilities, from the validation issues: the backend reports what its own
		* publish gate would refuse, so the reported lock and the blocked Publish agree. Tools key on
		* their position, MCP servers on their name. While an edit is unsaved the builder drops the
		* stale result, so a lock can disappear until the next validation.
		*/
		const restrictedIssues = computed(() => {
			const tools = /* @__PURE__ */ new Map();
			const mcpServers = /* @__PURE__ */ new Map();
			for (const issue of props.validationIssues) {
				if (!isRestrictedIssue(issue)) continue;
				const { kind, index, id } = issue.capability;
				if (kind === "tool" && index !== void 0) tools.set(index, issue);
				if (kind === "mcpServer" && id !== void 0) mcpServers.set(id, issue);
			}
			return {
				tools,
				mcpServers
			};
		});
		function toolRestriction(entry, nodeType = toolNodeType(entry)) {
			const issue = entry.kind === "mcpServer" ? restrictedIssues.value.mcpServers.get(entry.server.name) : restrictedIssues.value.tools.get(entry.index);
			if (!issue) return null;
			if (isRestrictedByInlineTool(issue)) return {
				typeLabel: toolTypeLabel(entry, nodeType),
				message: i18n.baseText("agents.builder.validation.issue.restrictedByInlineTool")
			};
			const deniedType = issue.restriction?.nodeType;
			const denied = deniedType ? nodeTypesStore.getNodeType(deniedType) : null;
			return {
				scope: issue.restriction?.scope,
				typeLabel: denied?.displayName.replace(/ Tool$/, "") ?? deniedType ?? toolTypeLabel(entry, nodeType)
			};
		}
		let subAgentNamesRequest = 0;
		async function ensureSubAgentNamesLoaded() {
			const request = ++subAgentNamesRequest;
			const agents = await ensureProjectAgentsLoaded();
			const known = knownArchivedSubAgents();
			const knownIds = new Set([...agents, ...known].map((agent) => agent.id));
			const isResolved = selectedSubAgentIds.value.every((agentId) => knownIds.has(agentId));
			let archived = known;
			if (!isResolved) archived = await fetchArchivedSubAgents(await refreshProjectAgents());
			if (request === subAgentNamesRequest) archivedSubAgents.value = archived;
		}
		function knownArchivedSubAgents() {
			return archivedSubAgents.value.filter((agent) => agent.projectId === props.projectId && selectedSubAgentIdSet.value.has(agent.id));
		}
		async function fetchArchivedSubAgents(listedAgents) {
			const listedIds = new Set(listedAgents.map((agent) => agent.id));
			const ids = selectedSubAgentIds.value.filter((agentId) => !listedIds.has(agentId));
			if (ids.length === 0) return [];
			const { data } = await listAgentsPage(rootStore.restApiContext, props.projectId, { filter: {
				ids,
				includeArchived: true
			} });
			return data.filter((agent) => agent.isArchived);
		}
		onMounted(() => {
			if (showSection("subAgents")) ensureSubAgentNamesLoaded().catch(() => {});
		});
		watch([() => props.projectId, selectedSubAgentIds], () => {
			if (showSection("subAgents")) ensureSubAgentNamesLoaded().catch(() => {});
		});
		function toToolOpenTarget(tool) {
			if (tool.type === "custom") return {
				kind: "tool",
				toolType: "custom",
				id: tool.id
			};
			if (tool.type === "workflow") return {
				kind: "tool",
				toolType: "workflow",
				id: tool.workflow
			};
			return {
				kind: "tool",
				toolType: "node",
				id: tool.name
			};
		}
		const capabilityTools = computed(() => [...props.tools.map((tool, index) => ({
			kind: "tool",
			index,
			tool,
			openTarget: toToolOpenTarget(tool)
		})), ...mcpServers.value.map((server, index) => ({
			kind: "mcpServer",
			index: props.tools.length + index,
			server,
			openTarget: {
				kind: "mcpServer",
				serverName: server.name
			}
		}))]);
		function toolLabel(entry) {
			if (entry.kind === "mcpServer") return formatToolNameForDisplay(entry.server.name);
			const { tool, index } = entry;
			if (tool.type === "custom") return formatToolNameForDisplay((tool.id ? props.customTools?.[tool.id]?.descriptor.name : void 0) ?? tool.id ?? `${tool.type}-${index + 1}`);
			if (tool.type === "workflow") return formatToolNameForDisplay(tool.name ?? tool.workflow ?? `${tool.type}-${index + 1}`);
			return formatToolNameForDisplay(tool.name ?? `${tool.type}-${index + 1}`);
		}
		function toolIcon(entry) {
			if (entry.kind === "mcpServer") return "mcp";
			const { tool } = entry;
			if (tool.type === "workflow") return "workflow";
			if (tool.type === "custom") return "code";
			return "globe";
		}
		function toolNodeType(entry) {
			if (entry.kind === "mcpServer") {
				const preferredTypeName = entry.server.metadata?.nodeTypeName ?? "@n8n/n8n-nodes-langchain.mcpClientTool";
				return nodeTypesStore.getNodeType(preferredTypeName) ?? nodeTypesStore.getNodeType("@n8n/n8n-nodes-langchain.mcpClientTool") ?? null;
			}
			const { tool } = entry;
			const node = toolRefToNode(tool);
			if (!node) return null;
			return nodeTypesStore.getNodeType(node.type, node.typeVersion) ?? null;
		}
		function toolTypeLabel(entry, nodeType = toolNodeType(entry)) {
			if (entry.kind === "mcpServer") return nodeType?.displayName ?? toolLabel(entry);
			const { tool } = entry;
			if (tool.type === "node") return nodeType?.displayName.replace(/ Tool$/, "") ?? toolLabel(entry);
			if (tool.type === "workflow") return i18n.baseText("agents.builder.tools.type.workflow");
			if (tool.type === "custom") return i18n.baseText("agents.builder.tools.type.custom");
			return toolLabel(entry);
		}
		function toolEntryReasons(entry) {
			if (entry.kind === "mcpServer") return mcpServerIssueMessages.value.get(entry.server.name) ?? [];
			if (entry.tool.enabled === false) return [];
			return toolIssueMessages.value.get(entry.index) ?? [];
		}
		function buildCapabilityToolRows(entries) {
			return buildToolRows(entries.map((entry) => {
				const nodeType = toolNodeType(entry);
				const reasons = toolEntryReasons(entry);
				const warningReasons = entry.kind === "tool" && entry.tool.enabled !== false ? toolWarningMessages.value.get(entry.index) ?? [] : [];
				return {
					index: entry.index,
					enabled: entry.kind === "mcpServer" || entry.tool.enabled !== false,
					label: toolLabel(entry),
					typeLabel: toolTypeLabel(entry, nodeType),
					nodeType,
					fallbackIcon: toolIcon(entry),
					toolType: entry.kind === "tool" ? entry.tool.type : "mcpServer",
					openTarget: entry.openTarget,
					invalid: reasons.length > 0,
					invalidReasons: reasons,
					warning: warningReasons.length > 0,
					warningReasons,
					restriction: toolRestriction(entry, nodeType)
				};
			}));
		}
		const toolRows = computed(() => buildCapabilityToolRows(capabilityTools.value.filter((entry) => entry.kind === "mcpServer" || entry.tool.type !== "workflow")));
		const workflowRows = computed(() => buildCapabilityToolRows(capabilityTools.value.filter((entry) => entry.kind === "tool" && entry.tool.type === "workflow")).filter((row) => !row.isGrouped));
		const capabilityRowItemCounts = computed(() => ({
			tools: toolRows.value.length,
			workflows: workflowRows.value.length,
			skills: props.skills.length,
			subAgents: selectedSubAgents.value.length
		}));
		const orderedCapabilityRows = computed(() => {
			const rows = props.sections.flatMap((section) => {
				if (section === "tasks") return [];
				if (section === "tools") return ["tools", "workflows"];
				return [section];
			});
			return [...rows.filter((row) => capabilityRowItemCounts.value[row] > 0), ...rows.filter((row) => capabilityRowItemCounts.value[row] === 0)];
		});
		function toTargetKey(target) {
			if (target.kind === "mcpServer") return `mcpServer:${encodeURIComponent(target.serverName)}`;
			return `tool:${target.toolType}:${encodeURIComponent(target.id)}`;
		}
		function fromTargetKey(key) {
			const [scope, toolType, ...rest] = key.split(":");
			if (scope === "mcpServer") {
				const encodedServerName = toolType;
				if (!encodedServerName) return null;
				return {
					kind: "mcpServer",
					serverName: decodeURIComponent(encodedServerName)
				};
			}
			if (scope !== "tool") return null;
			if (toolType !== "node" && toolType !== "workflow" && toolType !== "custom") return null;
			const encodedId = rest.join(":");
			if (!encodedId) return null;
			return {
				kind: "tool",
				toolType,
				id: decodeURIComponent(encodedId)
			};
		}
		function toolMenuItems(tool) {
			if (!tool.isGrouped) return [];
			return tool.tools.map((item) => ({
				id: toTargetKey(item.openTarget),
				label: item.label,
				data: {
					index: item.index,
					enabled: item.enabled,
					nodeType: item.nodeType,
					openTarget: item.openTarget,
					invalid: item.invalid,
					invalidReasons: item.invalidReasons,
					restriction: item.restriction
				}
			}));
		}
		function onToolMenuSelect(key) {
			openToolGroup.value = null;
			if (props.disabled) return;
			const target = fromTargetKey(key);
			if (!target) return;
			emit("open-tool", target);
		}
		function removeTool(index) {
			if (props.disabled) return;
			openToolGroup.value = null;
			emit("remove-tool", index);
		}
		function toggleTool(index, enabled) {
			if (props.disabled || !props.supportsActivation || !props.tools[index]) return;
			openToolGroup.value = null;
			emit("update:config", { tools: props.tools.map((ref, i) => i === index ? {
				...ref,
				enabled
			} : ref) });
		}
		function toggleSubAgent(agentId, enabled) {
			if (props.disabled || !props.supportsActivation) return;
			emitSubAgentRefs(selectedSubAgentRefs.value.map((ref) => ref.agentId === agentId ? {
				...ref,
				enabled
			} : ref));
		}
		function removeToolGroup(group) {
			if (props.disabled) return;
			openToolGroup.value = null;
			const indices = new Set(group.tools.map(({ index }) => index));
			emit("update:config", { tools: props.tools.filter((_, index) => !indices.has(index)) });
		}
		function removeSubAgent(agentId) {
			if (props.disabled) return;
			emitSubAgentRefs(selectedSubAgentRefs.value.filter((ref) => ref.agentId !== agentId));
		}
		function emitSubAgentRefs(agents) {
			emit("update:config", { subAgents: {
				...props.config?.subAgents ?? {},
				agents
			} });
		}
		function toSubAgentRef(agentId, useWhen) {
			const current = selectedSubAgentRefs.value.find((ref) => ref.agentId === agentId);
			return {
				agentId,
				...useWhen ? { useWhen } : {},
				...current?.enabled !== void 0 ? { enabled: current.enabled } : {}
			};
		}
		async function openSubAgentsModal() {
			try {
				await ensureProjectAgentsLoaded();
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.subAgents.loadError"));
				return;
			}
			uiStore.openModalWithData({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: {
					agents: availableSubAgents.value.map(({ id, name, personalisation }) => {
						const selectedRef = selectedSubAgentRefs.value.find((ref) => ref.agentId === id);
						return {
							id,
							name,
							personalisation: personalisation ?? void 0,
							added: Boolean(selectedRef),
							useWhen: selectedRef?.useWhen,
							invalidReasons: subAgentIssueMessages.value.get(id) ?? [],
							agentHref: `/projects/${encodeURIComponent(props.projectId)}/agents/${encodeURIComponent(id)}`
						};
					}),
					onCreateAgent: canCreateAgent.value ? () => createAgent("button", props.projectId) : void 0,
					onConfirm: ({ agentId, useWhen }) => {
						const nextRef = toSubAgentRef(agentId, useWhen);
						if (selectedSubAgentIdSet.value.has(agentId)) {
							emitSubAgentRefs(selectedSubAgentRefs.value.map((ref) => ref.agentId === agentId ? nextRef : ref));
							return;
						}
						emitSubAgentRefs([...selectedSubAgentRefs.value, nextRef]);
					},
					onRemove: removeSubAgent
				}
			});
		}
		function openExistingSubAgentModal(subAgent) {
			uiStore.openModalWithData({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: {
					selectedAgent: {
						id: subAgent.id,
						name: subAgent.name
					},
					agentHref: `/projects/${encodeURIComponent(props.projectId)}/agents/${encodeURIComponent(subAgent.id)}`,
					useWhen: subAgent.useWhen,
					invalidReasons: subAgent.invalidReasons,
					onConfirm: ({ agentId, useWhen }) => {
						emitSubAgentRefs(selectedSubAgentRefs.value.map((ref) => ref.agentId === agentId ? toSubAgentRef(agentId, useWhen) : ref));
					},
					onRemove: removeSubAgent
				}
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.section),
				"data-testid": "agent-capabilities-section"
			}, [
				(openBlock(true), createElementBlock(Fragment, null, renderList(orderedCapabilityRows.value, (section) => {
					return openBlock(), createElementBlock(Fragment, { key: section }, [section === "tools" ? (openBlock(), createBlock(AgentChipRow_default, {
						key: 0,
						label: unref(i18n).baseText("agents.builder.tools.title"),
						"item-count": toolRows.value.length,
						"add-label": unref(i18n).baseText("agents.builder.tools.add"),
						"add-button-test-id": "agent-capabilities-add-tool",
						disabled: props.disabled,
						onAdd: _cache[0] || (_cache[0] = ($event) => emit("add-tool", "tools"))
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(toolRows.value, (tool) => {
							return openBlock(), createElementBlock("div", {
								key: `tool-${tool.index}`,
								class: normalizeClass(_ctx.$style.chipGroup)
							}, [tool.isGrouped ? (openBlock(), createBlock(unref(DropdownMenu_default), {
								key: 0,
								"model-value": openToolGroup.value === tool.index,
								items: toolMenuItems(tool),
								disabled: props.disabled,
								placement: "bottom-start",
								"data-testid": "agent-capabilities-tool-group",
								"onUpdate:modelValue": ($event) => openToolGroup.value = $event ? tool.index : null
							}, {
								trigger: withCtx(() => [createVNode(AgentItemContextMenu_default, {
									disabled: props.disabled,
									onRemove: ($event) => removeToolGroup(tool)
								}, {
									default: withCtx(() => [createVNode(AgentChipButton_default, {
										invalid: tool.invalid,
										deactivated: !tool.enabled,
										"invalid-reasons": tool.invalidReasons,
										warning: tool.warning,
										"warning-reasons": tool.warningReasons,
										restriction: tool.restriction,
										disabled: props.disabled,
										class: normalizeClass(_ctx.$style.capabilityChip),
										"data-testid": "agent-capabilities-tool-row"
									}, {
										icon: withCtx(() => [createVNode(NodeIcon_default, {
											"node-type": tool.nodeType,
											size: 16
										}, null, 8, ["node-type"])]),
										default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.groupChipLabel) }, [createTextVNode(toDisplayString(tool.label) + " ", 1), createVNode(unref(N8nIcon_default), {
											icon: "chevron-down",
											size: 12,
											color: "text-light"
										})], 2)]),
										_: 2
									}, 1032, [
										"invalid",
										"deactivated",
										"invalid-reasons",
										"warning",
										"warning-reasons",
										"restriction",
										"disabled",
										"class"
									])]),
									_: 2
								}, 1032, ["disabled", "onRemove"])]),
								item: withCtx(({ item }) => [item.data ? (openBlock(), createBlock(AgentItemContextMenu_default, {
									key: 0,
									disabled: props.disabled,
									enabled: props.supportsActivation ? item.data.enabled : void 0,
									"onUpdate:enabled": ($event) => toggleTool(item.data.index, $event),
									onRemove: ($event) => removeTool(item.data.index)
								}, {
									default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(DropdownMenuItem_default), mergeProps({ ref_for: true }, item, {
										class: { [_ctx.$style.deactivatedTool]: !item.data.enabled },
										onSelect: onToolMenuSelect
									}), {
										"item-leading": withCtx(({ ui }) => [item.data?.nodeType ? (openBlock(), createBlock(NodeIcon_default, {
											key: 0,
											"node-type": item.data.nodeType,
											size: 16,
											class: normalizeClass(ui.class)
										}, null, 8, ["node-type", "class"])) : createCommentVNode("", true)]),
										"item-trailing": withCtx(() => [!item.data.enabled ? (openBlock(), createBlock(unref(N8nTag_default), {
											key: 0,
											text: unref(i18n).baseText("agents.builder.capabilities.deactivated"),
											clickable: false
										}, null, 8, ["text"])) : item.data?.restriction ? (openBlock(), createBlock(unref(N8nTooltip_default), {
											key: 1,
											placement: "left"
										}, {
											content: withCtx(() => [createTextVNode(toDisplayString(unref(chipRestrictionText)(item.data.restriction)), 1)]),
											default: withCtx(() => [createVNode(unref(N8nIcon_default), {
												icon: "lock",
												size: "xsmall",
												"data-test-id": "node-restricted-icon"
											})]),
											_: 2
										}, 1024)) : item.data?.invalid ? (openBlock(), createBlock(unref(N8nTooltip_default), {
											key: 2,
											disabled: (item.data.invalidReasons ?? []).length === 0,
											placement: "top"
										}, {
											content: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(item.data.invalidReasons, (reason) => {
												return openBlock(), createElementBlock("div", { key: reason }, toDisplayString(reason), 1);
											}), 128))]),
											default: withCtx(() => [createVNode(unref(N8nIcon_default), {
												icon: "triangle-alert",
												size: 14,
												"data-testid": "agent-capabilities-tool-menu-invalid-icon"
											})]),
											_: 2
										}, 1032, ["disabled"])) : createCommentVNode("", true)]),
										_: 2
									}, 1040, ["class"])])]),
									_: 2
								}, 1032, [
									"disabled",
									"enabled",
									"onUpdate:enabled",
									"onRemove"
								])) : createCommentVNode("", true)]),
								_: 2
							}, 1032, [
								"model-value",
								"items",
								"disabled",
								"onUpdate:modelValue"
							])) : (openBlock(), createBlock(AgentItemContextMenu_default, {
								key: 1,
								disabled: props.disabled,
								enabled: props.supportsActivation && tool.tool.openTarget.kind === "tool" ? tool.enabled : void 0,
								"onUpdate:enabled": ($event) => toggleTool(tool.index, $event),
								onRemove: ($event) => removeTool(tool.index)
							}, {
								default: withCtx(() => [tool.nodeType ? (openBlock(), createBlock(AgentChipButton_default, {
									key: 0,
									deactivated: !tool.enabled,
									invalid: tool.invalid,
									"invalid-reasons": tool.invalidReasons,
									warning: tool.warning,
									"warning-reasons": tool.warningReasons,
									restriction: tool.restriction,
									disabled: props.disabled,
									class: normalizeClass(_ctx.$style.capabilityChip),
									"data-testid": "agent-capabilities-tool-row",
									onClick: ($event) => emit("open-tool", tool.tool.openTarget)
								}, {
									icon: withCtx(() => [createVNode(NodeIcon_default, {
										"node-type": tool.nodeType,
										size: 16
									}, null, 8, ["node-type"])]),
									default: withCtx(() => [createTextVNode(" " + toDisplayString(tool.label), 1)]),
									_: 2
								}, 1032, [
									"deactivated",
									"invalid",
									"invalid-reasons",
									"warning",
									"warning-reasons",
									"restriction",
									"disabled",
									"class",
									"onClick"
								])) : (openBlock(), createBlock(AgentChipButton_default, {
									key: 1,
									icon: tool.fallbackIcon,
									deactivated: !tool.enabled,
									invalid: tool.invalid,
									"invalid-reasons": tool.invalidReasons,
									warning: tool.warning,
									"warning-reasons": tool.warningReasons,
									restriction: tool.restriction,
									disabled: props.disabled,
									class: normalizeClass(_ctx.$style.capabilityChip),
									"data-testid": "agent-capabilities-tool-row",
									onClick: ($event) => emit("open-tool", tool.tool.openTarget)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(tool.label), 1)]),
									_: 2
								}, 1032, [
									"icon",
									"deactivated",
									"invalid",
									"invalid-reasons",
									"warning",
									"warning-reasons",
									"restriction",
									"disabled",
									"class",
									"onClick"
								]))]),
								_: 2
							}, 1032, [
								"disabled",
								"enabled",
								"onUpdate:enabled",
								"onRemove"
							]))], 2);
						}), 128))]),
						_: 1
					}, 8, [
						"label",
						"item-count",
						"add-label",
						"disabled"
					])) : section === "workflows" ? (openBlock(), createBlock(AgentChipRow_default, {
						key: 1,
						label: unref(i18n).baseText("generic.workflows"),
						"item-count": workflowRows.value.length,
						"add-label": unref(i18n).baseText("workflows.add"),
						"add-button-test-id": "agent-capabilities-add-workflow",
						disabled: props.disabled,
						onAdd: _cache[1] || (_cache[1] = ($event) => emit("add-tool", "workflows"))
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(workflowRows.value, (workflow) => {
							return openBlock(), createElementBlock("div", {
								key: `workflow-${workflow.index}`,
								class: normalizeClass(_ctx.$style.chipGroup)
							}, [createVNode(AgentItemContextMenu_default, {
								disabled: props.disabled,
								enabled: props.supportsActivation ? workflow.enabled : void 0,
								"onUpdate:enabled": ($event) => toggleTool(workflow.index, $event),
								onRemove: ($event) => removeTool(workflow.index)
							}, {
								default: withCtx(() => [createVNode(AgentChipButton_default, {
									icon: workflow.fallbackIcon,
									deactivated: !workflow.enabled,
									invalid: workflow.invalid,
									"invalid-reasons": workflow.invalidReasons,
									warning: workflow.warning,
									"warning-reasons": workflow.warningReasons,
									disabled: props.disabled,
									class: normalizeClass(_ctx.$style.capabilityChip),
									"data-testid": "agent-capabilities-workflow-row",
									onClick: ($event) => emit("open-tool", workflow.tool.openTarget)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(workflow.label), 1)]),
									_: 2
								}, 1032, [
									"icon",
									"deactivated",
									"invalid",
									"invalid-reasons",
									"warning",
									"warning-reasons",
									"disabled",
									"class",
									"onClick"
								])]),
								_: 2
							}, 1032, [
								"disabled",
								"enabled",
								"onUpdate:enabled",
								"onRemove"
							])], 2);
						}), 128))]),
						_: 1
					}, 8, [
						"label",
						"item-count",
						"add-label",
						"disabled"
					])) : section === "skills" ? (openBlock(), createBlock(AgentSkillsSection_default, {
						key: 2,
						skills: __props.skills,
						disabled: props.disabled,
						"validation-issues": props.validationIssues,
						onOpenSkill: _cache[2] || (_cache[2] = ($event) => emit("open-skill", $event)),
						onAddSkill: _cache[3] || (_cache[3] = ($event) => emit("add-skill")),
						onRemoveSkill: _cache[4] || (_cache[4] = ($event) => emit("remove-skill", $event))
					}, null, 8, [
						"skills",
						"disabled",
						"validation-issues"
					])) : (openBlock(), createBlock(AgentChipRow_default, {
						key: 3,
						label: unref(i18n).baseText("agents.builder.subAgents.title"),
						"item-count": selectedSubAgents.value.length,
						"add-label": unref(i18n).baseText("agents.builder.subAgents.add"),
						"add-button-test-id": "agent-capabilities-add-sub-agent",
						disabled: props.disabled,
						onAdd: openSubAgentsModal
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(selectedSubAgents.value, (subAgent) => {
							return openBlock(), createElementBlock("div", {
								key: subAgent.id,
								class: normalizeClass(_ctx.$style.chipGroup)
							}, [createVNode(AgentItemContextMenu_default, {
								disabled: props.disabled,
								enabled: props.supportsActivation ? subAgent.enabled : void 0,
								"onUpdate:enabled": ($event) => toggleSubAgent(subAgent.id, $event),
								onRemove: ($event) => removeSubAgent(subAgent.id)
							}, {
								default: withCtx(() => [createVNode(AgentChipButton_default, {
									deactivated: !subAgent.enabled,
									icon: "bot",
									invalid: subAgent.invalid,
									"invalid-reasons": subAgent.invalidReasons,
									disabled: props.disabled,
									class: normalizeClass(_ctx.$style.capabilityChip),
									"data-testid": "agent-capabilities-sub-agent-row",
									onClick: ($event) => openExistingSubAgentModal(subAgent)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(subAgent.name) + " ", 1), subAgent.isArchived ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 0,
										class: "ml-3xs",
										variant: "outline",
										"data-testid": "agent-capabilities-sub-agent-archived"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.item.archived")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 2
								}, 1032, [
									"deactivated",
									"invalid",
									"invalid-reasons",
									"disabled",
									"class",
									"onClick"
								])]),
								_: 2
							}, 1032, [
								"disabled",
								"enabled",
								"onUpdate:enabled",
								"onRemove"
							])], 2);
						}), 128))]),
						_: 1
					}, 8, [
						"label",
						"item-count",
						"add-label",
						"disabled"
					]))], 64);
				}), 128)),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.divider),
					"aria-hidden": "true"
				}, null, 2),
				createVNode(AgentWebSearchSection_default, {
					config: props.config,
					disabled: props.disabled,
					"project-id": props.projectId,
					"onUpdate:config": _cache[5] || (_cache[5] = ($event) => emit("update:config", $event))
				}, null, 8, [
					"config",
					"disabled",
					"project-id"
				])
			], 2)]);
		};
	}
}), [["__cssModules", { "$style": {
	deactivatedTool: "_deactivatedTool_10x67_1",
	section: "_section_10x67_5",
	chipGroup: "_chipGroup_10x67_12",
	capabilityChip: "_capabilityChip_10x67_21",
	groupChipLabel: "_groupChipLabel_10x67_25",
	divider: "_divider_10x67_31"
} }]]);
//#endregion
//#region src/features/agents/composables/useAgentConfigAutosave.ts
init_reactivity_esm_bundler();
/** True only when the save persisted. A skipped, stale,
* or outdated result means the server still holds the prior state. */
function isPersistedSave(result) {
	return result === void 0;
}
/**
* Owns the debounced autosave loop for the agent builder.
*
* Hand-rolled timers (instead of `useDebounceFn`) so the route-leave guard can
* both cancel a pending save AND await one in flight — important to avoid a
* scheduled save that fires after publish, bumping versionId and immediately
* re-marking the agent as having unpublished changes.
*
* `scheduleAutosave` snapshots its argument at call time; later switches to a
* different agent therefore can't bleed an in-flight save onto the new agent.
*/
function useAgentConfigAutosave(params) {
	const saveStatus = ref("idle");
	const hasPendingSave = ref(false);
	/** A debounced snapshot is queued but hasn't fired yet — distinct from `hasPendingSave`,
	* which is also true once that snapshot moves in flight. Lets a caller detect "there's
	* a queued edit I can still merge into" before it's sent. */
	const hasQueuedSnapshot = ref(false);
	const debounceMs = params.debounceMs ?? 500;
	const savedHoldMs = params.savedHoldMs ?? 2e3;
	let autosaveTimer = null;
	let autosaveInFlight = null;
	let saveStatusResetTimer = null;
	let pendingSnapshot = null;
	let pendingSnapshotRevision = 0;
	let pendingSnapshotGeneration = 0;
	let latestSnapshotRevision = 0;
	const latestRevisionByGeneration = /* @__PURE__ */ new Map();
	const staleThroughRevisionByGeneration = /* @__PURE__ */ new Map();
	let lastSaveError = null;
	let lastSettledResult = void 0;
	/**
	* Bumped by `reset()`. A save captures the generation at the start of `runSave`
	* and re-checks it after each `await` before touching `saveStatus`, so a save
	* that was in-flight for agent A when the builder switched to B can still
	* finish persisting A's snapshot but cannot flip B's save indicator.
	*/
	let generation = 0;
	function toError(error) {
		return error instanceof Error ? error : new Error(String(error));
	}
	function syncPendingState() {
		hasPendingSave.value = pendingSnapshot !== null || autosaveInFlight !== null;
		hasQueuedSnapshot.value = pendingSnapshot !== null;
	}
	async function runSave(snapshot, snapshotRevision, snapshotGeneration, rethrow) {
		if (snapshotRevision <= (staleThroughRevisionByGeneration.get(snapshotGeneration) ?? 0)) return "stale";
		const gen = snapshotGeneration;
		if (gen === generation) {
			saveStatus.value = "saving";
			lastSaveError = null;
			if (saveStatusResetTimer !== null) {
				clearTimeout(saveStatusResetTimer);
				saveStatusResetTimer = null;
			}
		}
		try {
			const result = await params.save(snapshot);
			const detached = gen !== generation;
			if (!detached) lastSettledResult = result;
			if (result === "stale") {
				const staleThroughRevision = latestRevisionByGeneration.get(gen) ?? snapshotRevision;
				staleThroughRevisionByGeneration.set(gen, staleThroughRevision);
				if (pendingSnapshot !== null && pendingSnapshotGeneration === gen && pendingSnapshotRevision <= staleThroughRevision) cancelPendingAutosave();
				if (!detached) saveStatus.value = "idle";
				return result;
			}
			if (result === "skipped" || result === "outdated") {
				if (!detached) saveStatus.value = "idle";
				return result;
			}
			params.onSaved?.(snapshot);
			if (detached) return result;
			saveStatus.value = "saved";
			saveStatusResetTimer = setTimeout(() => {
				if (gen !== generation) {
					saveStatusResetTimer = null;
					return;
				}
				saveStatus.value = "idle";
				saveStatusResetTimer = null;
			}, savedHoldMs);
			return result;
		} catch (error) {
			const detached = gen !== generation;
			params.onError?.(error);
			if (!detached) {
				lastSaveError = toError(error);
				saveStatus.value = "idle";
			}
			if (rethrow) throw toError(error);
			return;
		}
	}
	async function chainSave(snapshot, snapshotRevision, snapshotGeneration, rethrow) {
		const slot = (autosaveInFlight ?? Promise.resolve()).then(async () => await runSave(snapshot, snapshotRevision, snapshotGeneration, rethrow));
		const trackedSlot = slot.then(() => void 0, () => void 0);
		autosaveInFlight = trackedSlot;
		syncPendingState();
		trackedSlot.finally(() => {
			if (autosaveInFlight === trackedSlot) {
				autosaveInFlight = null;
				syncPendingState();
			}
		});
		return await slot;
	}
	function scheduleAutosave(snapshot) {
		pendingSnapshot = snapshot;
		pendingSnapshotRevision = ++latestSnapshotRevision;
		pendingSnapshotGeneration = generation;
		latestRevisionByGeneration.set(generation, pendingSnapshotRevision);
		syncPendingState();
		if (autosaveTimer !== null) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => {
			autosaveTimer = null;
			const target = pendingSnapshot;
			const targetRevision = pendingSnapshotRevision;
			const targetGeneration = pendingSnapshotGeneration;
			pendingSnapshot = null;
			pendingSnapshotRevision = 0;
			pendingSnapshotGeneration = 0;
			syncPendingState();
			chainSave(target, targetRevision, targetGeneration, false);
		}, getDebounceTime(debounceMs));
	}
	async function settleAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}
		if (autosaveInFlight) await autosaveInFlight;
	}
	/**
	* Drains the queued snapshot now and resolves with its save outcome —
	* `undefined` when it persisted, otherwise why the server state was kept.
	* Rejects when the save itself failed.
	*/
	async function flushAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}
		const target = pendingSnapshot;
		const targetRevision = pendingSnapshotRevision;
		const targetGeneration = pendingSnapshotGeneration;
		pendingSnapshot = null;
		pendingSnapshotRevision = 0;
		pendingSnapshotGeneration = 0;
		syncPendingState();
		if (target !== null) try {
			return await chainSave(target, targetRevision, targetGeneration, true);
		} catch (error) {
			if (targetGeneration === generation && latestSnapshotRevision === targetRevision && pendingSnapshot === null) {
				pendingSnapshot = target;
				pendingSnapshotRevision = targetRevision;
				pendingSnapshotGeneration = targetGeneration;
				syncPendingState();
			}
			throw error;
		}
		if (autosaveInFlight) await autosaveInFlight;
		if (lastSaveError) throw lastSaveError;
		return lastSettledResult;
	}
	function cancelPendingAutosave() {
		if (autosaveTimer !== null) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}
		pendingSnapshot = null;
		pendingSnapshotRevision = 0;
		pendingSnapshotGeneration = 0;
		syncPendingState();
	}
	/**
	* Detach this loop from `saveStatus`/`lastSaveError` for a new target.
	* Drops pending snapshots, clears the `saved` hold timer, and bumps
	* `generation` so an in-flight save for A can still persist A's snapshot
	* but cannot mutate B's indicator. Call on every genuine A→B switch,
	* including drain failure; stale overlapping inits must not reset.
	*
	* Also call it when a save is rejected as stale, before reloading: every
	* snapshot scheduled so far predates the reload, while edits made during
	* the reload land in the new generation and are still saved.
	*/
	function reset() {
		cancelPendingAutosave();
		if (saveStatusResetTimer !== null) {
			clearTimeout(saveStatusResetTimer);
			saveStatusResetTimer = null;
		}
		lastSaveError = null;
		lastSettledResult = void 0;
		generation += 1;
		saveStatus.value = "idle";
	}
	return {
		saveStatus,
		hasPendingSave,
		hasQueuedSnapshot,
		scheduleAutosave,
		settleAutosave,
		flushAutosave,
		cancelPendingAutosave,
		reset
	};
}
//#endregion
//#region src/features/agents/composables/useAgentCapabilitiesActions.ts
init_runtime_core_esm_bundler();
/**
* The set of capability-action handlers wired to `AgentCapabilitiesSection`
* (tools, skills, tasks, triggers). Extracted from `AgentBuilderView` so a
* second surface (the agent node's NDV) can reuse them with its own
* config-update funnel + telemetry adapter.
*/
function useAgentCapabilitiesActions(deps) {
	const { localConfig, agent, projectId, agentId, connectedTriggers, scheduleConfigUpdate, scheduleSkillSave, localSkills, supportsToolApproval, ensureAgentPersisted, flushConfigSave, flushSkillSave, beforeAgentMutation, refreshAgentAfterMutation, validationIssues, telemetry } = deps;
	const locale = useI18n();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const rbacStore = useRBACStore();
	const { showError, showMessage } = useToast();
	const { projectName } = useAgentProjectBreadcrumb(computed(() => projectId.value));
	const skillRefsEnabled = computed(() => !localSkills);
	function onOpenAddToolModal(mode = "tools") {
		const targetAgentId = agentId.value;
		uiStore.openModalWithData({
			name: AGENT_TOOLS_MODAL_KEY,
			data: {
				mode,
				tools: localConfig.value?.tools ?? [],
				mcpServers: localConfig.value?.mcpServers ?? [],
				projectId: projectId.value,
				agentId: targetAgentId,
				supportsToolApproval,
				onConfirm: (payload) => {
					if (agentId.value !== targetAgentId) return;
					scheduleConfigUpdate({
						...payload.tools && { tools: payload.tools },
						...payload.mcpServers && { mcpServers: payload.mcpServers }
					});
				}
			}
		});
	}
	function onOpenToolFromList(target) {
		const tools = localConfig.value?.tools ?? [];
		const toolIndex = typeof target === "number" ? target : tools.findIndex((tool) => {
			if (target.kind !== "tool") return false;
			if (tool.type !== target.toolType) return false;
			if (tool.type === "node") return tool.name === target.id;
			if (tool.type === "workflow") return tool.workflow === target.id;
			return tool.id === target.id;
		});
		const tool = toolIndex >= 0 ? tools[toolIndex] : void 0;
		if (tool) {
			const customTool = tool.type === "custom" && tool.id ? agent.value?.tools?.[tool.id] : void 0;
			telemetry?.trackOpenedToolFromList?.(tool.type);
			uiStore.openModalWithData({
				name: AGENT_TOOL_CONFIG_MODAL_KEY,
				data: {
					toolRef: tool,
					customTool,
					projectId: projectId.value,
					agentId: agentId.value,
					supportsToolApproval,
					validationIssues: () => validationIssues?.value.filter((issue) => issue.capability.kind === "tool" && issue.capability.index === toolIndex) ?? [],
					existingToolNames: tools.map((toolRef, i) => i === toolIndex || toolRef.type === "custom" ? null : toolRef.name).filter((name) => !!name),
					onConfirm: (updatedTool) => {
						const nextTools = [...localConfig.value?.tools ?? []];
						nextTools[toolIndex] = updatedTool;
						scheduleConfigUpdate({ tools: nextTools });
					},
					onRemove: () => {
						if (!localConfig.value?.tools?.[toolIndex]) return;
						onRemoveTool(toolIndex);
					}
				}
			});
			return;
		}
		const mcpServers = localConfig.value?.mcpServers ?? [];
		const mcpServerIndex = typeof target === "number" ? target - tools.length : target.kind === "mcpServer" ? mcpServers.findIndex((server) => server.name === target.serverName) : -1;
		const mcpServer = mcpServers[mcpServerIndex];
		if (!mcpServer) return;
		if (mcpServer.metadata?.nodeTypeName) {
			const targetAgentId = agentId.value;
			telemetry?.trackOpenedToolFromList?.("mcpServer");
			uiStore.openModalWithData({
				name: AGENT_TOOL_CONFIG_MODAL_KEY,
				data: {
					kind: "registryMcpServer",
					mcpServer,
					projectId: projectId.value,
					supportsToolApproval,
					existingToolNames: mcpServers.filter((_, index) => index !== mcpServerIndex).map((server) => server.name),
					onConfirm: (updatedServer) => {
						if (agentId.value !== targetAgentId) return;
						const nextMcpServers = [...localConfig.value?.mcpServers ?? []];
						nextMcpServers[mcpServerIndex] = updatedServer;
						scheduleConfigUpdate({ mcpServers: nextMcpServers });
					},
					onRemove: () => {
						if (agentId.value !== targetAgentId) return;
						const nextMcpServers = (localConfig.value?.mcpServers ?? []).filter((_, index) => index !== mcpServerIndex);
						scheduleConfigUpdate({ mcpServers: nextMcpServers });
					}
				}
			});
			return;
		}
		const preferredNodeTypeName = mcpServer.metadata?.nodeTypeName ?? "@n8n/n8n-nodes-langchain.mcpClientTool";
		const nodeType = nodeTypesStore.getNodeType(preferredNodeTypeName) ?? nodeTypesStore.getNodeType("@n8n/n8n-nodes-langchain.mcpClientTool");
		if (!nodeType) return;
		telemetry?.trackOpenedToolFromList?.("mcpServer");
		uiStore.openModalWithData({
			name: AGENT_TOOL_CONFIG_MODAL_KEY,
			data: {
				kind: "mcpServer",
				mcpServer,
				initialNode: mcpServerToNode(mcpServer, nodeType),
				projectId: projectId.value,
				agentId: agentId.value,
				supportsToolApproval,
				existingToolNames: mcpServers.filter((_, i) => i !== mcpServerIndex).map((server) => server.name),
				onConfirm: (updatedServer) => {
					const nextMcpServers = [...localConfig.value?.mcpServers ?? []];
					nextMcpServers[mcpServerIndex] = updatedServer;
					scheduleConfigUpdate({ mcpServers: nextMcpServers });
				},
				onRemove: () => onRemoveTool((localConfig.value?.tools ?? []).length + mcpServerIndex)
			}
		});
	}
	const appliedSkills = computed(() => {
		const rawRefs = localConfig.value?.skills;
		const refs = Array.isArray(rawRefs) ? rawRefs : [];
		const bodies = localSkills?.bodies.value ?? agent.value?.skills ?? {};
		const seen = /* @__PURE__ */ new Set();
		const out = [];
		for (const skillRef of refs) {
			if (typeof skillRef?.id !== "string" || !skillRef.id || seen.has(skillRef.id)) continue;
			seen.add(skillRef.id);
			out.push({
				id: skillRef.id,
				skill: (Object.hasOwn(bodies, skillRef.id) ? bodies[skillRef.id] : void 0) ?? {
					name: skillRef.id,
					description: "",
					instructions: ""
				}
			});
		}
		return out;
	});
	function onOpenSkillFromList(id, options = {}) {
		const skill = appliedSkills.value.find((s) => s.id === id)?.skill;
		if (!skill) return;
		telemetry?.trackOpenedSkillFromList?.(id);
		const targetAgentId = agentId.value;
		uiStore.openModalWithData({
			name: AGENT_SKILL_MODAL_KEY,
			data: {
				projectId: projectId.value,
				agentId: targetAgentId,
				skill,
				skillId: id,
				existingSkillNames: appliedSkillNames(id),
				skillRefsEnabled: skillRefsEnabled.value,
				outdated: skillRefsEnabled.value && (agent.value?.outdatedSkillIds ?? []).includes(id),
				latestVersion: skillRefsEnabled.value ? agent.value?.skillVersions?.[id]?.latest : void 0,
				agentVersions: skillRefsEnabled.value ? agent.value?.skillVersions?.[id] : void 0,
				initialVersionsOpen: options.showVersions,
				onUseVersion: (skillId, version) => {
					if (agentId.value !== targetAgentId) return;
					pinSkillVersion(skillId, version);
				},
				projectLabel: projectName.value ?? void 0,
				agentName: agent.value?.name,
				canCreateInstanceSkills: rbacStore.hasScope("skill:create"),
				onUseLatestVersion: (skillId) => {
					if (agentId.value !== targetAgentId) return;
					useLatestSkillVersion(skillId);
				},
				onRemove: (skillId) => {
					if (agentId.value !== targetAgentId) return;
					onRemoveSkill(skillId);
				},
				onConfirm: async ({ id: skillId, skill: updatedSkill, availableTo, restoredFrom }) => {
					if (!skillId) return;
					if (agentId.value !== targetAgentId) return;
					const sanitizedSkill = normalizeAgentSkillForSave(updatedSkill);
					if (localSkills) {
						if (hasDuplicateSkillName(sanitizedSkill.name, skillId)) {
							showDuplicateSkillNameError(sanitizedSkill.name);
							return;
						}
						localSkills.updateSkill(skillId, sanitizedSkill);
						return;
					}
					if (agent.value?.id !== targetAgentId) return;
					agent.value = {
						...agent.value,
						skills: {
							...agent.value.skills ?? {},
							[skillId]: sanitizedSkill
						}
					};
					scheduleSkillSave({
						skillId,
						skill: sanitizedSkill,
						...availableTo ? { availableTo } : {}
					});
					if (restoredFrom === void 0 || !flushSkillSave) return;
					return isPersistedSave(await flushSkillSave()) ? void 0 : { saved: false };
				}
			}
		});
	}
	/** Names the skill modal validates against: every applied skill except the one being edited. */
	function appliedSkillNames(excludeId) {
		return appliedSkills.value.filter(({ id }) => id !== excludeId).map(({ skill }) => skill.name);
	}
	/**
	* Authoring-time mirror of the backend's `assertSkillNameIsUnique` for
	* local-skill hosts. The modal validates against `existingSkillNames` before closing
	*/
	/** The scope of the new-name lookup for an "available to" choice. */
	function newNameTarget(availableTo, targetProjectId) {
		if (availableTo === "instance") return { scope: "instance" };
		return {
			scope: "project",
			projectId: targetProjectId
		};
	}
	function hasDuplicateSkillName(name, excludeId) {
		const key = skillNameKey(name);
		return appliedSkillNames(excludeId).some((existing) => skillNameKey(existing) === key);
	}
	function showDuplicateSkillNameError(name) {
		showMessage({
			title: locale.baseText("agents.builder.skills.duplicateName.error", { interpolate: { name: name.trim() } }),
			type: "error"
		});
	}
	function onRemoveTool(index) {
		const currentTools = localConfig.value?.tools ?? [];
		if (index < 0) return;
		if (index < currentTools.length) {
			scheduleConfigUpdate({ tools: currentTools.filter((_, i) => i !== index) });
			return;
		}
		const mcpServers = localConfig.value?.mcpServers ?? [];
		const mcpServerIndex = index - currentTools.length;
		if (mcpServerIndex >= mcpServers.length) return;
		scheduleConfigUpdate({ mcpServers: mcpServers.filter((_, i) => i !== mcpServerIndex) });
	}
	function onRemoveSkill(id) {
		const nextSkills = (localConfig.value?.skills ?? []).filter((skillRef) => skillRef.id !== id);
		scheduleConfigUpdate({ skills: nextSkills });
	}
	function onToggleTask(payload) {
		const nextTasks = (localConfig.value?.tasks ?? []).map((taskRef) => taskRef.id === payload.id ? {
			...taskRef,
			enabled: payload.enabled
		} : taskRef);
		scheduleConfigUpdate({ tasks: nextTasks });
	}
	async function onOpenAddSkillModal() {
		telemetry?.trackOpenedAddSkillModal?.();
		const targetProjectId = projectId.value;
		const targetAgentId = agentId.value;
		const isCurrentTarget = () => projectId.value === targetProjectId && agentId.value === targetAgentId;
		if (skillRefsEnabled.value && ensureAgentPersisted) {
			try {
				await ensureAgentPersisted();
			} catch (error) {
				showError(error, locale.baseText("agents.builder.skills.picker.loadError"));
				return;
			}
			if (!isCurrentTarget()) return;
		}
		uiStore.openModalWithData({
			name: AGENT_SKILL_MODAL_KEY,
			data: {
				projectId: targetProjectId,
				agentId: targetAgentId,
				existingSkillNames: appliedSkillNames(),
				skillRefsEnabled: skillRefsEnabled.value,
				getAttachedSkills: () => appliedSkills.value.map(({ id, skill }) => ({
					id,
					name: skill.name
				})),
				projectLabel: projectName.value ?? void 0,
				agentName: agent.value?.name,
				canCreateInstanceSkills: rbacStore.hasScope("skill:create"),
				...skillRefsEnabled.value ? { getDefaultName: async (availableTo) => await getNewSkillName(rootStore.restApiContext, {
					...newNameTarget(availableTo, targetProjectId),
					name: locale.baseText("agents.builder.skills.defaultName")
				}) } : {},
				onRemove: (skillId) => {
					if (!isCurrentTarget()) return;
					onRemoveSkill(skillId);
				},
				onAttach: async (librarySkill) => await attachSkillRef(isCurrentTarget, async () => await getSkillDetail(rootStore.restApiContext, librarySkill.id)),
				onConfirm: async ({ skill, availableTo, method }) => {
					if (localSkills) {
						if (!isCurrentTarget()) return void 0;
						const sanitizedSkill = normalizeAgentSkillForSave(skill);
						if (hasDuplicateSkillName(sanitizedSkill.name)) {
							showDuplicateSkillNameError(sanitizedSkill.name);
							return;
						}
						localSkills.createSkill(sanitizedSkill);
						return;
					}
					const sanitizedSkill = normalizeAgentSkillForSave(skill);
					try {
						await beforeAgentMutation?.();
					} catch {
						return { saved: false };
					}
					if (!isCurrentTarget()) return void 0;
					let result;
					try {
						await ensureAgentPersisted?.();
						if (!isCurrentTarget()) return void 0;
						result = await createAgentSkill(rootStore.restApiContext, targetProjectId, targetAgentId, sanitizedSkill, availableTo, method);
					} catch (error) {
						if (isSkillNameTakenError(error)) return {
							saved: false,
							nameError: locale.baseText("settings.context.skills.error.nameTaken")
						};
						showError(error, locale.baseText("agents.builder.skills.create.error"));
						return { saved: false };
					}
					(async () => {
						const { id: skillId, skill: created, skillHash, versionId } = result;
						if (!isCurrentTarget() || agent.value?.id !== targetAgentId) return;
						agent.value = {
							...agent.value,
							versionId,
							skillHashes: {
								...agent.value.skillHashes ?? {},
								[skillId]: skillHash
							},
							skills: {
								...agent.value.skills ?? {},
								[skillId]: created
							}
						};
						let refreshed = true;
						try {
							refreshed = await refreshAgentAfterMutation?.(targetProjectId, targetAgentId) ?? true;
						} catch (error) {
							showError(error, locale.baseText("agents.builder.loadError"));
							return;
						}
						if (refreshed && isCurrentTarget() && localConfig.value) localConfig.value = {
							...localConfig.value,
							skills: [...(localConfig.value.skills ?? []).filter((ref) => ref.id !== skillId), {
								type: "skill",
								id: skillId
							}]
						};
					})();
				}
			}
		});
	}
	async function attachSkillRef(isCurrentTarget, loadSkill) {
		let detail;
		try {
			detail = await loadSkill();
		} catch (error) {
			showError(error, locale.baseText("agents.builder.skills.attach.error"));
			return;
		}
		if (!isCurrentTarget() || !agent.value || !localConfig.value) return;
		if (hasDuplicateSkillName(detail.skill.name)) {
			showDuplicateSkillNameError(detail.skill.name);
			return;
		}
		agent.value = {
			...agent.value,
			skillHashes: {
				...agent.value.skillHashes ?? {},
				[detail.id]: detail.skillHash
			},
			skills: {
				...agent.value.skills ?? {},
				[detail.id]: detail.skill
			}
		};
		scheduleConfigUpdate({ skills: [...(localConfig.value.skills ?? []).filter((ref) => ref.id !== detail.id), {
			type: "skill",
			id: detail.id
		}] });
		if (!flushConfigSave) return;
		try {
			await flushConfigSave();
		} catch {
			if (isCurrentTarget()) undoRefusedAttach(detail.id);
		}
	}
	function undoRefusedAttach(skillId) {
		if (!agent.value || !localConfig.value) return;
		const withoutSkill = (byId) => Object.fromEntries(Object.entries(byId ?? {}).filter(([id]) => id !== skillId));
		agent.value = {
			...agent.value,
			skills: withoutSkill(agent.value.skills),
			skillHashes: withoutSkill(agent.value.skillHashes)
		};
		scheduleConfigUpdate({ skills: (localConfig.value.skills ?? []).filter((ref) => ref.id !== skillId) });
	}
	async function useLatestSkillVersion(skillId) {
		const targetAgentId = agentId.value;
		let detail;
		try {
			detail = await getSkillDetail(rootStore.restApiContext, skillId);
		} catch (error) {
			showError(error, locale.baseText("agents.builder.skills.useLatest.error"));
			return;
		}
		if (agentId.value !== targetAgentId) return;
		await applySkillVersion(skillId, {
			skill: detail.skill,
			skillHash: detail.skillHash,
			version: detail.latestVersion
		});
	}
	/**
	* Pins the agent draft to one saved version of a skill. The draft runs that version and the
	* published agent keeps its own until the next publish.
	*/
	async function pinSkillVersion(skillId, version) {
		await applySkillVersion(skillId, {
			skill: version.skill,
			version: version.version,
			versionId: version.id
		});
	}
	/**
	* Puts one skill back as it was before a version change. Only this skill's entry and ref
	* change, so edits made to the agent while the save ran stay.
	*/
	function restoreSkillVersion(skillId, previous) {
		if (!agent.value || !localConfig.value) return;
		const outdatedSkillIds = (agent.value.outdatedSkillIds ?? []).filter((id) => id !== skillId);
		const { [skillId]: _hash, ...otherHashes } = agent.value.skillHashes ?? {};
		agent.value = {
			...agent.value,
			...previous.skill ? { skills: {
				...agent.value.skills,
				[skillId]: previous.skill
			} } : {},
			skillHashes: previous.skillHash !== void 0 ? {
				...otherHashes,
				[skillId]: previous.skillHash
			} : otherHashes,
			outdatedSkillIds: previous.outdated ? [...outdatedSkillIds, skillId] : outdatedSkillIds,
			...previous.versions ? { skillVersions: {
				...agent.value.skillVersions,
				[skillId]: previous.versions
			} } : {}
		};
		const previousRef = previous.ref;
		if (!previousRef) return;
		scheduleConfigUpdate({ skills: (localConfig.value.skills ?? []).map((ref) => ref.id === skillId ? previousRef : ref) });
	}
	/**
	* Points the draft ref at a version of the skill: pinned with `versionId`, else following
	* the latest. Saves, then shows it in the open editor with the Versions panel shown.
	*/
	async function applySkillVersion(skillId, target) {
		const targetAgentId = agentId.value;
		if (agent.value?.id !== targetAgentId || !localConfig.value) return;
		const pinned = target.versionId !== void 0;
		const versions = agent.value.skillVersions?.[skillId];
		const previous = {
			skill: agent.value.skills?.[skillId],
			skillHash: agent.value.skillHashes?.[skillId],
			outdated: (agent.value.outdatedSkillIds ?? []).includes(skillId),
			versions,
			ref: localConfig.value.skills?.find((ref) => ref.id === skillId)
		};
		agent.value = {
			...agent.value,
			skills: {
				...agent.value.skills ?? {},
				[skillId]: target.skill
			},
			...target.skillHash ? { skillHashes: {
				...agent.value.skillHashes ?? {},
				[skillId]: target.skillHash
			} } : {},
			...pinned ? {} : { outdatedSkillIds: (agent.value.outdatedSkillIds ?? []).filter((id) => id !== skillId) },
			...versions ? { skillVersions: {
				...agent.value.skillVersions,
				[skillId]: {
					...versions,
					draft: target.version,
					pinned
				}
			} } : {}
		};
		scheduleConfigUpdate({ skills: (localConfig.value.skills ?? []).map((ref) => ref.id !== skillId ? ref : pinned ? {
			type: "skill",
			id: skillId,
			versionId: target.versionId
		} : {
			type: "skill",
			id: skillId
		}) });
		if (flushConfigSave) {
			let persisted;
			try {
				persisted = await flushConfigSave() === void 0;
			} catch {
				persisted = false;
			}
			if (!persisted) {
				if (agentId.value === targetAgentId) restoreSkillVersion(skillId, previous);
				return;
			}
		}
		try {
			await beforeAgentMutation?.();
		} catch {
			return;
		}
		if (agentId.value !== targetAgentId || !uiStore.modalsById["agentSkillModal"]?.open) return;
		onOpenSkillFromList(skillId, { showVersions: true });
	}
	function onConnectedTriggersUpdate(triggers) {
		connectedTriggers.value = triggers;
	}
	function onTriggerAdded(payload) {
		connectedTriggers.value = payload.triggers;
		telemetry?.trackTriggerAdded?.(payload);
	}
	function onTriggerRemoved(payload) {
		connectedTriggers.value = payload.triggers;
		telemetry?.trackTriggerRemoved?.(payload);
	}
	return {
		appliedSkills,
		onOpenAddToolModal,
		onOpenToolFromList,
		onRemoveTool,
		onOpenAddSkillModal,
		onOpenSkillFromList,
		onRemoveSkill,
		onToggleTask,
		onConnectedTriggersUpdate,
		onTriggerAdded,
		onTriggerRemoved
	};
}
//#endregion
export { useAgentProjectId as _, AgentSkillsSection_default as a, AgentChipButton_default as c, modelToString as d, parseModelString as f, agent_panel_module_default as g, useAgentModelCredentials as h, AgentCapabilitiesSection_default as i, AgentInfoPanel_default as l, useModelCatalog as m, isPersistedSave as n, AgentItemContextMenu_default as o, sanitizeModelId as p, useAgentConfigAutosave as r, AgentChipRow_default as s, useAgentCapabilitiesActions as t, AgentModelSelector_default as u, AgentPanel_default as v };
