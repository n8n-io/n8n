import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { BD as VECTOR_STORE_NAME_REGEX, GA as DialogDescription_default, Hc as CredentialIcon_default, Jg as useUIStore, KM as AiModelSelectorDropdown_default, Mp as useCredentialsStore, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bC as useRootStore, dC as useToast, gM as N8nInputLabel_default, hN as truncateBeforeLast, is as testAgentVectorStore, jN as useI18n, nD as getResourcePermissions, uM as N8nFormInput_default, vm as useProjectsStore, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { a as AGENT_MODEL_PROVIDER_DEFINITIONS, i as ModelSelectorTriggerIcon_default, n as parseMenuItemId, o as getProviderCredentialTypes, r as ModelSelectorItemLeadingIcon_default, t as buildMenuItemId } from "./menuItemId-Beubk_vA.js";
import { t as AgentCredentialSelect_default } from "./AgentCredentialSelect-DlxHWwBS.js";
import { t as AgentModalMultiStep_default } from "./AgentModalMultiStep-83xh6J77.js";
import { a as isAgentEmbeddingProvider, i as getEmbeddingModelsForProvider, n as AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS, r as getEmbeddingModelProvider, t as AGENT_EMBEDDING_PROVIDERS } from "./vector-stores-4QgyIYTL.js";
//#region src/features/agents/components/model-selector/search.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MAX_SEARCH_RESULTS_PER_PROVIDER = 10;
function isSearchableItem(item) {
	return (item.id.includes("::model::") || item.id.includes("::freeCredits::")) && !item.disabled;
}
function collectMatchingItems(item, query, parts, parentMatched = false) {
	const children = item.children ?? [];
	const currentParts = [...parts, item.label];
	const labelMatched = item.label.toLowerCase().includes(query);
	const isMatched = parentMatched || labelMatched;
	if (children.length === 0) {
		const searchText = `${item.data?.fullName ?? item.label}`.toLowerCase();
		if (!isSearchableItem(item) || !isMatched && !searchText.includes(query)) return [];
		return [{
			...item,
			divided: false,
			data: item.data ? {
				...item.data,
				parts: currentParts,
				descriptionTooltipTeleported: true
			} : void 0
		}];
	}
	return children.flatMap((child) => collectMatchingItems(child, query, currentParts, isMatched));
}
/**
* Filters a model selector menu by search query, flattening matches into
* breadcrumb items ("Provider > Model") and grouping overflow per provider
* under a "more results" sub-menu.
*/
function filterAiModelSelectorMenu(menu, searchQuery) {
	const query = searchQuery.trim().toLowerCase();
	if (!query) return menu;
	const i18n = useI18n();
	return menu.flatMap((providerItem) => {
		const results = collectMatchingItems(providerItem, query, []);
		if (results.length <= MAX_SEARCH_RESULTS_PER_PROVIDER) return results;
		return [...results.slice(0, MAX_SEARCH_RESULTS_PER_PROVIDER), {
			...providerItem,
			label: i18n.baseText("agents.modelSelector.moreModels", { interpolate: { provider: providerItem.label } }),
			children: results.slice(MAX_SEARCH_RESULTS_PER_PROVIDER),
			divided: false
		}];
	});
}
/**
* Owns the search-box state for a model selector menu: tracks the query,
* ignores input while disabled, and returns the filtered menu.
*/
function useAiModelSelectorMenu(menu, isDisabled) {
	const searchQuery = ref("");
	function handleSearch(query) {
		if (isDisabled()) return;
		searchQuery.value = query;
	}
	return {
		filteredMenu: computed(() => filterAiModelSelectorMenu(menu.value, searchQuery.value)),
		handleSearch
	};
}
//#endregion
//#region src/features/agents/components/EmbeddingModelSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/agents/components/EmbeddingModelSelector.vue
var EmbeddingModelSelector_default = /* @__PURE__ */ defineComponent({
	__name: "EmbeddingModelSelector",
	props: {
		selectedModel: {},
		selectedCredentialId: {},
		credentialsByType: {},
		canCreateCredentials: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"update:selectedModel",
		"update:selectedCredentialId",
		"create-credential"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		/** Only the model's own name, without the "provider/" prefix. */
		function modelShortName(model) {
			return model.split("/").slice(1).join("/");
		}
		function credentialTypeFor(provider) {
			return getProviderCredentialTypes(provider)[0];
		}
		const selectedProvider = computed(() => __props.selectedModel ? getEmbeddingModelProvider(__props.selectedModel) : null);
		const selectedCredential = computed(() => {
			if (!__props.selectedCredentialId || !selectedProvider.value) return null;
			const credentialType = credentialTypeFor(selectedProvider.value);
			return (__props.credentialsByType[credentialType] ?? []).find((credential) => credential.id === __props.selectedCredentialId) ?? null;
		});
		const selectedLabel = computed(() => __props.selectedModel ? modelShortName(__props.selectedModel) : i18n.baseText("agents.modelSelector.defaultLabel"));
		const selectedCredentialName = computed(() => selectedCredential.value?.name);
		const credentialsMissing = computed(() => Boolean(selectedProvider.value) && !selectedCredential.value);
		const triggerCredentialTypeName = computed(() => selectedProvider.value ? credentialTypeFor(selectedProvider.value) : null);
		function providerToMenuItem(provider) {
			const credentialType = credentialTypeFor(provider);
			const credentialOptions = __props.credentialsByType[credentialType] ?? [];
			const isSelectedProvider = provider === selectedProvider.value;
			const hasProviderCredential = credentialOptions.length > 0;
			const createCredentialItems = __props.canCreateCredentials ? [{
				id: buildMenuItemId(provider, "configure", credentialType),
				label: i18n.baseText("agents.modelSelector.configureCredentials"),
				data: { leadingIcon: "plus" }
			}] : [];
			const credentialItems = credentialOptions.map((credential) => ({
				id: buildMenuItemId(provider, "credential", credential.id),
				label: credential.name,
				checked: isSelectedProvider && credential.id === __props.selectedCredentialId,
				data: { credentialType }
			}));
			const modelItems = hasProviderCredential ? getEmbeddingModelsForProvider(provider).map((option, index) => ({
				id: buildMenuItemId(provider, "model", option.model),
				label: truncateBeforeLast(modelShortName(option.model), 45),
				divided: index === 0,
				data: {
					credentialType,
					fullName: option.model,
					description: i18n.baseText("agents.builder.vectorStores.modal.embeddingModel.dimensions", { interpolate: { dimensions: String(option.dimensions) } }),
					descriptionTooltipTeleported: true
				}
			})) : [];
			return {
				id: provider,
				label: AGENT_MODEL_PROVIDER_DEFINITIONS[provider].displayName,
				data: { credentialType },
				children: [
					...credentialItems,
					...createCredentialItems,
					...modelItems
				]
			};
		}
		const { filteredMenu, handleSearch } = useAiModelSelectorMenu(computed(() => AGENT_EMBEDDING_PROVIDERS.map((provider, index) => ({
			...providerToMenuItem(provider),
			...index === 0 ? { divided: true } : {}
		}))), () => __props.disabled);
		function onSelect(id) {
			if (__props.disabled) return;
			const parsed = parseMenuItemId(id);
			if (!parsed) return;
			const { action, value } = parsed;
			if (action === "configure") {
				emit("create-credential", value);
				return;
			}
			if (!isAgentEmbeddingProvider(parsed.provider)) return;
			const provider = parsed.provider;
			if (action === "credential") {
				emit("update:selectedCredentialId", value);
				if (provider !== selectedProvider.value) {
					const [firstModel] = getEmbeddingModelsForProvider(provider);
					if (firstModel) emit("update:selectedModel", firstModel.model);
				}
				return;
			}
			if (action === "model") {
				emit("update:selectedModel", value);
				const options = __props.credentialsByType[credentialTypeFor(provider)] ?? [];
				if (!options.some((option) => option.id === __props.selectedCredentialId)) {
					const [firstCredential] = options;
					if (firstCredential) emit("update:selectedCredentialId", firstCredential.id);
				}
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AiModelSelectorDropdown_default), {
				items: unref(filteredMenu),
				"selected-label": selectedLabel.value,
				"selected-credential-name": selectedCredentialName.value,
				"credentials-missing": credentialsMissing.value,
				"credentials-missing-label": unref(i18n).baseText("agents.modelSelector.credentialsMissing"),
				"no-match-label": unref(i18n).baseText("agents.modelSelector.noMatch"),
				disabled: __props.disabled,
				"data-test-id": "agent-embedding-model-selector",
				"credential-data-test-id": "agent-embedding-model-selector-credential",
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
				_: 1
			}, 8, [
				"items",
				"selected-label",
				"selected-credential-name",
				"credentials-missing",
				"credentials-missing-label",
				"no-match-label",
				"disabled",
				"onSearch"
			]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentVectorStoresModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["aria-label"];
var AgentVectorStoresModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentVectorStoresModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const { showMessage, showError } = useToast();
		const rootStore = useRootStore();
		const credentialsStore = useCredentialsStore();
		const projectsStore = useProjectsStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const providerOrder = [
			"pinecone",
			"supabase",
			"qdrant",
			"postgres"
		];
		const isEditing = computed(() => Boolean(props.data.vectorStore));
		const selectedProvider = ref(props.data.vectorStore?.provider ?? null);
		const providerDefinition = computed(() => selectedProvider.value ? AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[selectedProvider.value] : null);
		const currentStep = computed(() => selectedProvider.value ? "configure" : "select");
		const modalTitle = computed(() => selectedProvider.value ? name.value : i18n.baseText("agents.builder.vectorStores.modal.title"));
		const existing = props.data.vectorStore;
		const name = ref(existing?.name ?? i18n.baseText("agents.builder.vectorStores.modal.defaultName"));
		const nameTouched = ref(isEditing.value);
		const credential = ref(existing?.credential ?? "");
		const indexName = ref(existing && existing.provider === "pinecone" ? existing.indexName : "");
		const namespace = ref(existing && existing.provider === "pinecone" ? existing.namespace ?? "" : "");
		const collectionName = ref(existing && existing.provider === "qdrant" ? existing.collectionName : "");
		const tableName = ref(existing && (existing.provider === "supabase" || existing.provider === "postgres") ? existing.tableName : "");
		const queryName = ref(existing && existing.provider === "supabase" ? existing.queryName ?? "" : "");
		const embeddingModel = ref(existing?.embedding.model ?? "");
		const embeddingCredential = ref(existing?.embedding.credential ?? "");
		const useWhen = ref(existing?.useWhen ?? "");
		const testing = ref(false);
		const submitted = ref(false);
		const credentialsByType = ref({});
		const credentialsLoading = ref(false);
		const credentialIdsBeforeNew = ref({});
		const pendingCredentialField = ref(null);
		const pendingCredentialType = ref(null);
		const formValidation = reactive({
			locator: false,
			useWhen: false
		});
		function closeModal() {
			uiStore.closeModal(props.modalName);
		}
		function handleInteractOutside(event) {
			if (credentialModalOpen.value) event.preventDefault();
		}
		function selectProvider(provider) {
			submitted.value = false;
			selectedProvider.value = provider;
		}
		function goBack() {
			if (isEditing.value) return;
			submitted.value = false;
			selectedProvider.value = null;
			nameTouched.value = false;
			name.value = i18n.baseText("agents.builder.vectorStores.modal.defaultName");
			credential.value = "";
			indexName.value = "";
			namespace.value = "";
			collectionName.value = "";
			tableName.value = "";
			queryName.value = "";
			embeddingModel.value = "";
			embeddingCredential.value = "";
			useWhen.value = "";
			formValidation.locator = false;
			formValidation.useWhen = false;
		}
		const locatorValue = computed(() => {
			switch (selectedProvider.value) {
				case "pinecone": return indexName.value;
				case "qdrant": return collectionName.value;
				case "supabase":
				case "postgres": return tableName.value;
				default: return "";
			}
		});
		watch(locatorValue, (value) => {
			if (isEditing.value || nameTouched.value) return;
			const locator = value.trim();
			if (!locator) return;
			name.value = locator.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64);
		});
		function onNameInput(value) {
			nameTouched.value = true;
			name.value = value;
		}
		const nameError = computed(() => {
			const trimmed = name.value.trim();
			if (!trimmed) return i18n.baseText("agents.builder.vectorStores.modal.name.validation.required");
			if (!VECTOR_STORE_NAME_REGEX.test(trimmed)) return i18n.baseText("agents.builder.vectorStores.modal.name.validation.pattern");
			const otherNames = props.data.existingNames.filter((otherName) => otherName !== existing?.name);
			const sanitize = (value) => value.replace(/-/g, "_");
			if (otherNames.some((otherName) => sanitize(otherName) === sanitize(trimmed))) return i18n.baseText("agents.builder.vectorStores.modal.name.validation.duplicate");
			return "";
		});
		const visibleNameError = computed(() => submitted.value ? nameError.value : "");
		const useWhenValidationRules = [{
			name: "MAX_LENGTH",
			config: { maximum: 512 }
		}];
		const canTest = computed(() => Boolean(selectedProvider.value) && !nameError.value && Boolean(credential.value) && formValidation.locator && Boolean(embeddingModel.value) && Boolean(embeddingCredential.value) && formValidation.useWhen);
		const storeCredentialOptions = computed(() => providerDefinition.value ? credentialsByType.value[providerDefinition.value.credentialType] ?? [] : []);
		function embeddingCredentialTypeFor(provider) {
			return getProviderCredentialTypes(provider)[0];
		}
		function onEmbeddingModelUpdate(model) {
			embeddingModel.value = model;
			const provider = getEmbeddingModelProvider(model);
			if (!provider) return;
			const requiredType = embeddingCredentialTypeFor(provider);
			if (!(credentialsByType.value[requiredType] ?? []).some((option) => option.id === embeddingCredential.value)) embeddingCredential.value = "";
		}
		async function loadCredentials() {
			credentialsLoading.value = true;
			try {
				const allCredentials = await credentialsStore.fetchUsableCredentials({
					projectId: props.data.projectId,
					forAgent: true
				});
				const types = /* @__PURE__ */ new Set();
				for (const definition of Object.values(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)) types.add(definition.credentialType);
				for (const provider of AGENT_EMBEDDING_PROVIDERS) for (const type of getProviderCredentialTypes(provider)) types.add(type);
				for (const type of types) credentialsByType.value[type] = allCredentials.filter((c) => c.type === type).map((c) => ({
					id: c.id,
					name: c.name,
					typeDisplayName: credentialsStore.getCredentialTypeByName(c.type)?.displayName,
					homeProject: c.homeProject
				}));
			} finally {
				credentialsLoading.value = false;
			}
		}
		const projectForPermissions = computed(() => {
			if (projectsStore.currentProject?.id === props.data.projectId) return projectsStore.currentProject;
			if (projectsStore.personalProject?.id === props.data.projectId) return projectsStore.personalProject;
			return projectsStore.myProjects.find((project) => project.id === props.data.projectId) ?? null;
		});
		const credentialPermissions = computed(() => {
			const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
			return {
				...permissions,
				create: !!permissions.create
			};
		});
		function createCredential(type, field) {
			const currentOptions = credentialsByType.value[type] ?? [];
			credentialIdsBeforeNew.value[type] = new Set(currentOptions.map((option) => option.id));
			pendingCredentialField.value = field;
			pendingCredentialType.value = type;
			uiStore.openNewCredential(type, false, false, props.data.projectId, void 0, void 0, void 0, {
				hideAskAssistant: true,
				appendToBody: true
			});
		}
		function onCreateStoreCredential() {
			if (!providerDefinition.value) return;
			createCredential(providerDefinition.value.credentialType, "credential");
		}
		function onCreateEmbeddingCredential(credentialType) {
			createCredential(credentialType, "embeddingCredential");
		}
		const credentialModalOpen = computed(() => uiStore.isModalActiveById?.["editCredential"] ?? false);
		watch(credentialModalOpen, async (isOpen, wasOpen) => {
			if (!wasOpen || isOpen) return;
			const field = pendingCredentialField.value;
			const type = pendingCredentialType.value;
			pendingCredentialField.value = null;
			pendingCredentialType.value = null;
			if (!field || !type) return;
			const before = credentialIdsBeforeNew.value[type];
			await loadCredentials();
			const after = credentialsByType.value[type] ?? [];
			const newCredential = before ? after.find((option) => !before.has(option.id)) : void 0;
			if (newCredential) {
				if (field === "credential") credential.value = newCredential.id;
				else {
					embeddingCredential.value = newCredential.id;
					const provider = AGENT_EMBEDDING_PROVIDERS.find((candidate) => embeddingCredentialTypeFor(candidate) === type);
					const [firstModelForProvider] = provider ? getEmbeddingModelsForProvider(provider) : [];
					if (firstModelForProvider) embeddingModel.value = firstModelForProvider.model;
				}
			}
			delete credentialIdsBeforeNew.value[type];
		});
		function buildVectorStoreConfig() {
			const base = {
				name: name.value.trim(),
				credential: credential.value,
				useWhen: useWhen.value.trim(),
				embedding: {
					model: embeddingModel.value,
					credential: embeddingCredential.value
				}
			};
			switch (selectedProvider.value) {
				case "pinecone": return {
					provider: "pinecone",
					...base,
					indexName: indexName.value.trim(),
					...namespace.value.trim() ? { namespace: namespace.value.trim() } : {}
				};
				case "qdrant": return {
					provider: "qdrant",
					...base,
					collectionName: collectionName.value.trim()
				};
				case "supabase": return {
					provider: "supabase",
					...base,
					tableName: tableName.value.trim(),
					...queryName.value.trim() ? { queryName: queryName.value.trim() } : {}
				};
				default: return {
					provider: "postgres",
					...base,
					tableName: tableName.value.trim()
				};
			}
		}
		async function onTestAndConnect() {
			submitted.value = true;
			if (!canTest.value || testing.value) return;
			testing.value = true;
			try {
				const vectorStore = buildVectorStoreConfig();
				const result = await testAgentVectorStore(rootStore.restApiContext, props.data.projectId, vectorStore);
				if (!result.success) {
					showMessage({
						title: i18n.baseText("agents.builder.vectorStores.modal.test.failedTitle"),
						message: result.message ?? i18n.baseText("agents.builder.vectorStores.modal.test.genericError"),
						type: "error",
						duration: 0
					});
					return;
				}
				if (result.warning) showMessage({
					title: i18n.baseText("agents.builder.vectorStores.modal.test.successTitle", { interpolate: { name: vectorStore.name } }),
					message: result.warning,
					type: "warning",
					duration: 0
				});
				props.data.onConfirm(vectorStore);
				closeModal();
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.vectorStores.modal.test.failedTitle"));
			} finally {
				testing.value = false;
			}
		}
		function onRemove() {
			if (!existing) return;
			props.data.onRemove?.(existing.name);
			closeModal();
		}
		onMounted(() => {
			loadCredentials();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModalMultiStep_default, {
				open: modalOpen.value,
				step: currentStep.value,
				title: modalTitle.value,
				"editable-title": Boolean(selectedProvider.value),
				"title-placeholder": unref(i18n).baseText("agents.builder.vectorStores.modal.name.placeholder"),
				"title-error": visibleNameError.value,
				"title-max-length": 64,
				"show-back": Boolean(selectedProvider.value) && !isEditing.value,
				"show-footer": Boolean(selectedProvider.value),
				busy: testing.value,
				"trap-focus": !credentialModalOpen.value,
				"disable-outside-pointer-events": !credentialModalOpen.value,
				"data-testid": "agent-vector-stores-modal",
				onInteractOutside: handleInteractOutside,
				"onUpdate:open": _cache[12] || (_cache[12] = ($event) => !$event && closeModal()),
				"onUpdate:title": onNameInput,
				onBack: goBack
			}, createSlots({
				default: withCtx(() => [withDirectives(createBaseVNode("div", null, [!selectedProvider.value ? (openBlock(), createBlock(unref(DialogDescription_default), { key: 0 }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.modal.description")), 1)]),
					_: 1
				})) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.rows) }, [(openBlock(), createElementBlock(Fragment, null, renderList(providerOrder, (provider) => {
					return createBaseVNode("div", {
						key: provider,
						class: normalizeClass(_ctx.$style.row),
						role: "group",
						"aria-label": unref(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)[provider].displayName,
						"data-testid": "agent-vector-stores-modal-row"
					}, [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.iconWrapper) }, [createVNode(CredentialIcon_default, {
							"credential-type-name": unref(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)[provider].credentialType,
							size: 24
						}, null, 8, ["credential-type-name"])], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.rowBody) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-dark",
							class: normalizeClass(_ctx.$style.name)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)[provider].displayName), 1)]),
							_: 2
						}, 1032, ["class"])], 2),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							"data-testid": "agent-vector-stores-modal-connect",
							onClick: ($event) => selectProvider(provider)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.modal.connect")), 1)]),
							_: 1
						}, 8, ["onClick"])], 2)
					], 10, _hoisted_1);
				}), 64))], 2)], 512), [[vShow, !selectedProvider.value]]), selectedProvider.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.content, _ctx.$style.configureContent])
				}, [
					createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.credential.label"),
						required: ""
					}, {
						default: withCtx(() => [createVNode(AgentCredentialSelect_default, {
							modelValue: credential.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => credential.value = $event),
							credentials: storeCredentialOptions.value,
							placeholder: unref(i18n).baseText("agents.builder.vectorStores.modal.credential.placeholder"),
							"credential-permissions": credentialPermissions.value,
							loading: credentialsLoading.value,
							"data-test-id": "agent-vector-stores-modal-credential",
							onCreate: onCreateStoreCredential
						}, null, 8, [
							"modelValue",
							"credentials",
							"placeholder",
							"credential-permissions",
							"loading"
						]), submitted.value && !credential.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "danger",
							"data-testid": "agent-vector-stores-modal-credential-required"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.modal.credential.required")), 1)]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["label"]),
					selectedProvider.value === "pinecone" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nFormInput_default), {
						modelValue: indexName.value,
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => indexName.value = $event),
						name: "indexName",
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.indexName.label"),
						placeholder: unref(i18n).baseText("agents.builder.vectorStores.modal.indexName.placeholder"),
						required: "",
						"show-validation-warnings": submitted.value,
						"data-testid": "agent-vector-stores-modal-index-name",
						onValidate: _cache[2] || (_cache[2] = (valid) => formValidation.locator = valid)
					}, null, 8, [
						"modelValue",
						"label",
						"placeholder",
						"show-validation-warnings"
					]), createVNode(unref(N8nFormInput_default), {
						modelValue: namespace.value,
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => namespace.value = $event),
						name: "namespace",
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.namespace.label"),
						placeholder: unref(i18n).baseText("agents.builder.vectorStores.modal.namespace.placeholder"),
						"data-testid": "agent-vector-stores-modal-namespace"
					}, null, 8, [
						"modelValue",
						"label",
						"placeholder"
					])], 64)) : selectedProvider.value === "qdrant" ? (openBlock(), createBlock(unref(N8nFormInput_default), {
						key: 1,
						modelValue: collectionName.value,
						"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => collectionName.value = $event),
						name: "collectionName",
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.collectionName.label"),
						placeholder: unref(i18n).baseText("agents.builder.vectorStores.modal.collectionName.placeholder"),
						required: "",
						"show-validation-warnings": submitted.value,
						"data-testid": "agent-vector-stores-modal-collection-name",
						onValidate: _cache[5] || (_cache[5] = (valid) => formValidation.locator = valid)
					}, null, 8, [
						"modelValue",
						"label",
						"placeholder",
						"show-validation-warnings"
					])) : selectedProvider.value === "supabase" || selectedProvider.value === "postgres" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nFormInput_default), {
						modelValue: tableName.value,
						"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => tableName.value = $event),
						name: "tableName",
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.tableName.label"),
						placeholder: unref(i18n).baseText("agents.builder.vectorStores.modal.tableName.placeholder"),
						required: "",
						"show-validation-warnings": submitted.value,
						"data-testid": "agent-vector-stores-modal-table-name",
						onValidate: _cache[7] || (_cache[7] = (valid) => formValidation.locator = valid)
					}, null, 8, [
						"modelValue",
						"label",
						"placeholder",
						"show-validation-warnings"
					]), selectedProvider.value === "supabase" ? (openBlock(), createBlock(unref(N8nFormInput_default), {
						key: 0,
						modelValue: queryName.value,
						"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => queryName.value = $event),
						name: "queryName",
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.queryName.label"),
						placeholder: unref(i18n).baseText("agents.builder.vectorStores.modal.queryName.placeholder"),
						"data-testid": "agent-vector-stores-modal-query-name"
					}, null, 8, [
						"modelValue",
						"label",
						"placeholder"
					])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
					createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("agents.builder.vectorStores.modal.embeddingModel.label"),
						"tooltip-text": unref(i18n).baseText("agents.builder.vectorStores.modal.embeddingModel.hint"),
						required: ""
					}, {
						default: withCtx(() => [createVNode(EmbeddingModelSelector_default, {
							"selected-model": embeddingModel.value,
							"selected-credential-id": embeddingCredential.value || null,
							"credentials-by-type": credentialsByType.value,
							"can-create-credentials": credentialPermissions.value.create,
							"onUpdate:selectedModel": onEmbeddingModelUpdate,
							"onUpdate:selectedCredentialId": _cache[9] || (_cache[9] = ($event) => embeddingCredential.value = $event),
							onCreateCredential: onCreateEmbeddingCredential
						}, null, 8, [
							"selected-model",
							"selected-credential-id",
							"credentials-by-type",
							"can-create-credentials"
						]), submitted.value && (!embeddingModel.value || !embeddingCredential.value) ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "danger"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.modal.embeddingModel.required")), 1)]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["label", "tooltip-text"]),
					createVNode(unref(N8nFormInput_default), {
						modelValue: useWhen.value,
						"onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => useWhen.value = $event),
						name: "useWhen",
						label: unref(i18n).baseText("agents.builder.vectorStores.useWhen.label"),
						"tooltip-text": unref(i18n).baseText("agents.builder.vectorStores.useWhen.hint"),
						placeholder: unref(i18n).baseText("agents.builder.vectorStores.useWhen.placeholder"),
						required: "",
						maxlength: unref(512),
						"validation-rules": useWhenValidationRules,
						"show-validation-warnings": submitted.value,
						"data-testid": "agent-vector-stores-modal-use-when",
						onValidate: _cache[11] || (_cache[11] = (valid) => formValidation.useWhen = valid)
					}, null, 8, [
						"modelValue",
						"label",
						"tooltip-text",
						"placeholder",
						"maxlength",
						"show-validation-warnings"
					])
				], 2)) : createCommentVNode("", true)]),
				_: 2
			}, [selectedProvider.value && isEditing.value && __props.data.onRemove ? {
				name: "footerLeft",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					"data-testid": "agent-vector-stores-modal-remove",
					onClick: onRemove
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "trash-2",
						size: 16
					})]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.modal.remove")), 1)]),
					_: 1
				})]),
				key: "0"
			} : void 0, selectedProvider.value ? {
				name: "footerActions",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "solid",
					loading: testing.value,
					disabled: testing.value,
					"data-testid": "agent-vector-stores-modal-confirm",
					onClick: onTestAndConnect
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])]),
				key: "1"
			} : void 0]), 1032, [
				"open",
				"step",
				"title",
				"editable-title",
				"title-placeholder",
				"title-error",
				"show-back",
				"show-footer",
				"busy",
				"trap-focus",
				"disable-outside-pointer-events"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_13aji_1",
	configureContent: "_configureContent_13aji_7",
	rows: "_rows_13aji_11",
	row: "_row_13aji_11",
	iconWrapper: "_iconWrapper_13aji_24",
	rowBody: "_rowBody_13aji_32",
	name: "_name_13aji_40",
	actions: "_actions_13aji_49"
} }]]);
//#endregion
export { AgentVectorStoresModal_default as default };
