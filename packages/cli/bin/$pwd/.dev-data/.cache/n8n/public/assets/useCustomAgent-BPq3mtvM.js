import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { Ea as isAllowedModel, Ia as workflowAgentDefaultIcon, Jg as useUIStore, KM as AiModelSelectorDropdown_default, Ma as personalAgentDefaultIcon, Mp as useCredentialsStore, Pa as stringifyModel, Sa as fromStringToModel, _T as chatHubLLMProviderSchema, cu as LLM_AGGREGATORS, hC as useTelemetry, hN as truncateBeforeLast, jN as useI18n, ka as isLlmProviderModel, nD as getResourcePermissions, nu as CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY, pT as PROVIDER_CREDENTIAL_TYPE_MAP, pu as providerDisplayNames, tu as CHAT_CREDENTIAL_SELECTOR_MODAL_KEY, ua as useChatStore, uu as NEW_AGENT_MENU_ID, va as createFakeAgent, vm as useProjectsStore, xa as flattenModel, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as ChatAgentAvatar_default } from "./ChatAgentAvatar-Cy6J2OZW.js";
//#region src/features/ai/chatHub/components/ChatProviderAvatar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/ai/chatHub/components/ChatProviderAvatar.vue
var ChatProviderAvatar_default = /* @__PURE__ */ defineComponent({
	__name: "ChatProviderAvatar",
	props: {
		provider: {},
		icon: {}
	},
	setup(__props) {
		const agent = computed(() => createFakeAgent(__props.provider === "n8n" ? {
			provider: "n8n",
			workflowId: ""
		} : __props.provider === "custom-agent" ? {
			provider: "custom-agent",
			agentId: ""
		} : {
			provider: __props.provider,
			model: ""
		}, { icon: __props.icon }));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ChatAgentAvatar_default, {
				agent: agent.value,
				size: "sm"
			}, null, 8, ["agent"]);
		};
	}
});
//#endregion
//#region src/features/ai/chatHub/model-selector.utils.ts
/**
* Helper function to check if text matches search query
*/
function matchesSearch(item, query) {
	if (!query) return true;
	return (item.data?.fullName ?? item.label ?? "").toLowerCase().includes(query);
}
/**
* Helper function to check if an item is a special menu item (action or error)
* that should not appear in search results
*/
function isSpecialMenuItem(item) {
	const id = item.id;
	if (id.endsWith("::configure") || id.endsWith("::add-model") || id.endsWith("::error") || id.endsWith("::loading")) return true;
	if (item.disabled) return true;
	if (!item.data?.provider) return true;
	return false;
}
/**
* Helper function to filter menu items with children based on search
*/
function filterMenuItem(item, query, parentMatched = false) {
	if (isSpecialMenuItem(item)) return null;
	if (!query || parentMatched) return item;
	const labelMatches = matchesSearch(item, query);
	const children = item.children ?? [];
	const filteredChildren = children.flatMap((child) => {
		const matched = filterMenuItem(child, query, labelMatches);
		return matched ? [matched] : [];
	});
	if (labelMatches || filteredChildren.length > 0) {
		if (children.length > 0 && filteredChildren.length === 0) return null;
		return {
			...item,
			children: filteredChildren
		};
	}
	return null;
}
function agentToMenuItem(agent, defaultIcon) {
	return {
		id: stringifyModel(agent.model),
		icon: agent.icon ?? defaultIcon ?? void 0,
		label: truncateBeforeLast(agent.name, 45),
		disabled: false,
		data: {
			provider: agent.model.provider,
			description: agent.description ?? void 0,
			fullName: agent.name
		}
	};
}
function buildPersonalAgentsMenuItem(agents, { isLoading, i18n, includeCustomAgents }) {
	if (!includeCustomAgents) return null;
	const customAgents = isLoading ? [] : agents.map((agent) => agentToMenuItem(agent, personalAgentDefaultIcon));
	return {
		id: "custom-agent",
		label: i18n.baseText("chatHub.agent.personalAgents"),
		icon: personalAgentDefaultIcon,
		data: { provider: "custom-agent" },
		children: [...isLoading ? [{
			id: "custom-agent::loading",
			label: i18n.baseText("generic.loadingEllipsis"),
			disabled: true
		}] : customAgents, {
			id: NEW_AGENT_MENU_ID,
			icon: {
				type: "icon",
				value: "plus"
			},
			label: i18n.baseText("chatHub.agent.newAgent"),
			disabled: false,
			divided: isLoading || customAgents.length > 0
		}]
	};
}
function buildGroupedWorkflowAgentMenuItems(agents, i18n) {
	const groupedAgents = /* @__PURE__ */ new Map();
	for (const agent of agents) {
		const groupName = agent.groupName ?? "";
		const entry = groupedAgents.get(groupName) ?? [];
		groupedAgents.set(groupName, [...entry, agent]);
	}
	if (groupedAgents.size < 2) return agents.map((agent) => agentToMenuItem(agent, workflowAgentDefaultIcon));
	return [...groupedAgents].map(([group, groupAgents]) => {
		const displayLabel = group === "" ? i18n.baseText("chatHub.models.selector.personalProject") : group;
		return {
			id: `n8n-project-${group}`,
			label: displayLabel,
			icon: groupAgents[0]?.groupIcon ?? workflowAgentDefaultIcon,
			data: { provider: "n8n" },
			children: groupAgents.map((agent) => agentToMenuItem(agent, workflowAgentDefaultIcon))
		};
	});
}
function buildWorkflowAgentsMenuItem(agents, { includeCustomAgents, i18n, isLoading }) {
	if (!includeCustomAgents) return null;
	const emptyText = i18n.baseText("chatHub.workflowAgents.empty.noAgents");
	const loadingText = i18n.baseText("generic.loadingEllipsis");
	return {
		id: "n8n",
		label: i18n.baseText("chatHub.agent.workflowAgents"),
		icon: workflowAgentDefaultIcon,
		data: { provider: "n8n" },
		children: isLoading ? [{
			id: "n8n::loading",
			label: loadingText,
			disabled: true
		}] : agents.length === 0 ? [{
			id: "n8n::no-agents",
			label: emptyText,
			disabled: true
		}] : buildGroupedWorkflowAgentMenuItems(agents, i18n)
	};
}
function buildLlmProviderMenuItem(provider, { models, error }, options) {
	const { settings, i18n, isLoading, credentials } = options;
	const providerSettings = settings[provider];
	if (providerSettings?.enabled === false) return null;
	const configureMenu = {
		id: `${provider}::configure`,
		icon: {
			type: "icon",
			value: "settings"
		},
		label: i18n.baseText("chatHub.agent.configureCredentials"),
		disabled: false
	};
	if (isLoading) return {
		id: provider,
		label: providerDisplayNames[provider],
		data: { provider },
		children: [configureMenu, {
			id: `${provider}::loading`,
			label: i18n.baseText("generic.loadingEllipsis"),
			disabled: true,
			divided: true
		}]
	};
	const manualModels = (providerSettings?.allowedModels ?? []).flatMap((model) => model.isManual ? [createFakeAgent({
		provider,
		model: model.model
	}, { name: model.displayName })] : []);
	const allModels = [...models, ...manualModels].toSorted((a, b) => (b.metadata.priority ?? 0) - (a.metadata.priority ?? 0));
	const agentOptions = allModels.length > 0 ? allModels.flatMap((agent, index) => {
		if (providerSettings && !isAllowedModel(providerSettings, agent.model)) return [];
		const item = agentToMenuItem(agent);
		return [index === 0 ? {
			...item,
			divided: true
		} : item];
	}).filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index) : error ? [{
		id: `${provider}::error`,
		divided: true,
		disabled: true,
		label: error
	}] : [];
	const children = [
		configureMenu,
		...agentOptions,
		...(agentOptions.length > 0 || !!credentials?.[provider]) && providerSettings?.allowedModels.length === 0 ? [{
			id: `${provider}::add-model`,
			icon: {
				type: "icon",
				value: "plus"
			},
			label: i18n.baseText("chatHub.agent.addModel"),
			disabled: false,
			divided: true
		}] : []
	];
	return {
		id: provider,
		data: { provider },
		label: providerDisplayNames[provider],
		children
	};
}
/**
* Helper function to recursively collect all leaf items (items without children or with data.provider)
*/
function collectFlattenedSearchResults(item, pathPrefix) {
	const children = item.children ?? [];
	const fullPath = [...pathPrefix, item.label];
	if (children.length === 0) return [{
		...item,
		divided: false,
		data: item.data ? {
			...item.data,
			parts: fullPath
		} : void 0
	}];
	return children.flatMap((child) => collectFlattenedSearchResults(child, fullPath));
}
function applySearch(menuItems, query, i18n) {
	if (!query) return menuItems;
	return menuItems.reduce((acc, item) => {
		const matched = filterMenuItem(item, query);
		if (!matched) return acc;
		const results = collectFlattenedSearchResults(matched, []);
		const flattenCount = Math.max(0, 10 - acc.length);
		const provider = matched.data?.provider;
		const providerName = provider ? providerDisplayNames[provider] : "";
		acc.push(...results.slice(0, flattenCount));
		if (results.length > flattenCount) {
			const label = flattenCount > 0 ? i18n.baseText("chatHub.models.selector.moreModels", { interpolate: { providerName } }) : matched.label;
			const rest = results.slice(flattenCount).map((result) => ({
				...result,
				label: truncateBeforeLast(result.data?.fullName ?? "", 45),
				data: result.data ? {
					...result.data,
					parts: void 0
				} : void 0
			}));
			acc.push({
				...matched,
				divided: false,
				label,
				children: rest
			});
		}
		return acc;
	}, []);
}
/**
* Builds the menu items for the model selector dropdown
*/
function buildModelSelectorMenuItems(agents, options) {
	const menuItems = [];
	const personalAgentsItem = buildPersonalAgentsMenuItem(agents["custom-agent"].models, options);
	const n8nAgentsItem = buildWorkflowAgentsMenuItem(agents.n8n.models, options);
	if (personalAgentsItem) menuItems.push(personalAgentsItem);
	if (n8nAgentsItem) menuItems.push(n8nAgentsItem);
	const sortedProviders = chatHubLLMProviderSchema.options.toSorted((a, b) => {
		return (LLM_AGGREGATORS.includes(a) ? 1 : -1) - (LLM_AGGREGATORS.includes(b) ? 1 : -1);
	});
	let dividerInserted = false;
	for (const provider of sortedProviders) {
		if (!agents[provider]) continue;
		const item = buildLlmProviderMenuItem(provider, agents[provider], options);
		if (item) {
			menuItems.push(dividerInserted ? item : {
				...item,
				divided: true
			});
			dividerInserted = true;
		}
	}
	return menuItems;
}
//#endregion
//#region src/features/ai/chatHub/components/ModelSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/chatHub/components/ModelSelector.vue
var ModelSelector_default = /* @__PURE__ */ defineComponent({
	__name: "ModelSelector",
	props: {
		selectedAgent: {},
		includeCustomAgents: {
			type: Boolean,
			default: true
		},
		credentials: {},
		showBorder: {
			type: Boolean,
			default: true
		},
		warnMissingCredentials: {
			type: Boolean,
			default: false
		},
		agents: {},
		isLoading: { type: Boolean },
		stacked: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"change",
		"createCustomAgent",
		"selectCredential"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		function handleSelectCredentials(provider, id) {
			emit("selectCredential", provider, id);
		}
		function handleSelectModelById(provider, modelId) {
			emit("change", {
				provider,
				model: modelId
			});
		}
		const i18n = useI18n();
		const dropdownRef = useTemplateRef("dropdownRef");
		const uiStore = useUIStore();
		const settingStore = useSettingsStore();
		const credentialsStore = useCredentialsStore();
		const projectStore = useProjectsStore();
		const telemetry = useTelemetry();
		const searchQuery = ref("");
		const credentialsName = computed(() => __props.selectedAgent ? credentialsStore.getCredentialById(__props.credentials?.[__props.selectedAgent.model.provider] ?? "")?.name : void 0);
		const isCredentialsRequired = computed(() => isLlmProviderModel(__props.selectedAgent?.model));
		const isCredentialsMissing = computed(() => __props.warnMissingCredentials && isCredentialsRequired.value && __props.selectedAgent?.model.provider && !__props.credentials?.[__props.selectedAgent?.model.provider]);
		const menu = computed(() => buildModelSelectorMenuItems(__props.agents, {
			includeCustomAgents: __props.includeCustomAgents,
			isLoading: __props.isLoading,
			i18n,
			settings: settingStore.moduleSettings?.["chat-hub"]?.providers ?? {},
			credentials: __props.credentials
		}));
		const filteredMenu = computed(() => applySearch(menu.value, searchQuery.value, i18n));
		const selectedLabel = computed(() => __props.selectedAgent?.name ?? i18n.baseText("chatHub.models.selector.defaultLabel"));
		const canCreateCredentials = computed(() => {
			return getResourcePermissions(projectStore.personalProject?.scopes).credential.create;
		});
		function openCredentialsSelectorOrCreate(provider) {
			const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
			if (credentialsStore.getCredentialsByType(credentialType).length === 0 && canCreateCredentials.value) {
				uiStore.openNewCredential(credentialType, false, false, void 0, void 0, void 0, void 0, __props.stacked ? { appendToBody: true } : {});
				return;
			}
			uiStore.openModalWithData({
				name: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
				data: {
					credentialType,
					displayName: providerDisplayNames[provider],
					initialValue: __props.credentials?.[provider] ?? null,
					onSelect: (credentialId) => handleSelectCredentials(provider, credentialId),
					...__props.stacked ? { appendToBody: true } : {}
				}
			});
		}
		function openModelByIdSelector(provider) {
			uiStore.openModalWithData({
				name: CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
				data: {
					provider,
					initialValue: null,
					onSelect: handleSelectModelById,
					...__props.stacked ? { stacked: true } : {}
				}
			});
		}
		function onSelect(id) {
			if (id === "agent::new") {
				emit("createCustomAgent");
				return;
			}
			const [, identifier] = id.split("::");
			const parsedModel = fromStringToModel(id);
			if (!parsedModel) return;
			if (identifier === "configure" && isLlmProviderModel(parsedModel)) {
				openCredentialsSelectorOrCreate(parsedModel.provider);
				return;
			}
			if (identifier === "add-model" && isLlmProviderModel(parsedModel)) {
				openModelByIdSelector(parsedModel.provider);
				return;
			}
			telemetry.track("User selected model or agent", {
				...flattenModel(parsedModel),
				is_custom: parsedModel.provider === "custom-agent"
			});
			emit("change", parsedModel);
		}
		function handleSearch(query) {
			searchQuery.value = query.toLowerCase();
		}
		__expose({
			open: () => dropdownRef.value?.open(),
			openCredentialSelector: (provider) => openCredentialsSelectorOrCreate(provider)
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AiModelSelectorDropdown_default), {
				ref_key: "dropdownRef",
				ref: dropdownRef,
				items: filteredMenu.value,
				"is-loading": __props.isLoading,
				"selected-label": selectedLabel.value,
				"selected-credential-name": credentialsName.value,
				"credentials-missing": isCredentialsMissing.value,
				"no-match-label": unref(i18n).baseText("chatHub.models.selector.noMatch"),
				"show-border": __props.showBorder,
				"data-test-id": "chat-model-selector",
				"credential-data-test-id": "chat-model-selector-credential",
				onSearch: handleSearch,
				onSelect
			}, {
				"trigger-leading": withCtx(({ ui }) => [createVNode(ChatAgentAvatar_default, {
					agent: __props.selectedAgent,
					size: credentialsName.value || !isCredentialsRequired.value ? "md" : "sm",
					class: normalizeClass(ui.class)
				}, null, 8, [
					"agent",
					"size",
					"class"
				])]),
				"item-leading": withCtx(({ item, ui }) => [item.data?.provider ? (openBlock(), createBlock(ChatProviderAvatar_default, {
					key: 0,
					provider: item.data?.provider,
					icon: item.icon,
					class: normalizeClass(ui.class)
				}, null, 8, [
					"provider",
					"icon",
					"class"
				])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"items",
				"is-loading",
				"selected-label",
				"selected-credential-name",
				"credentials-missing",
				"no-match-label",
				"show-border"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/chatHub/composables/useCustomAgent.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useCustomAgent(agentId) {
	const store = useChatStore();
	const isLoading = ref(false);
	const id = computed(() => toValue(agentId));
	const customAgent = computed(() => {
		if (!id.value) return;
		return store.customAgents[id.value];
	});
	watch(id, async (theId) => {
		if (theId) try {
			isLoading.value = true;
			await store.fetchCustomAgent(theId);
		} finally {
			isLoading.value = false;
		}
	}, { immediate: true });
	return {
		isLoading,
		customAgent
	};
}
//#endregion
export { ModelSelector_default as n, useCustomAgent as t };
