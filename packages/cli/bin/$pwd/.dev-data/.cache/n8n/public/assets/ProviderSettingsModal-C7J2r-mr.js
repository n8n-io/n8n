import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Ha as fetchChatModelsApi, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, Mp as useCredentialsStore, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _N as N8nText_default, bC as useRootStore, dC as useToast, dM as N8nSwitch_default, eM as N8nInputNumber_default, fN as N8nTooltip_default, jN as useI18n, pT as PROVIDER_CREDENTIAL_TYPE_MAP, pu as providerDisplayNames, qA as DialogTitle_default, ua as useChatStore, vN as N8nIconButton_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as TagsDropdown_default } from "./TagsDropdown-CTfHF4ee.js";
import { t as CredentialPicker_default } from "./CredentialPicker-QRMIIfvA.js";
//#region src/features/ai/chatHub/components/ProviderSettingsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ProviderSettingsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ProviderSettingsModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const settings = ref(null);
		const loadingSettings = ref(false);
		const loadingModels = ref(false);
		const limitModels = ref(false);
		const availableModels = ref([]);
		const customModels = ref([]);
		const allModels = computed(() => {
			const models = new Map(availableModels.value.reduce((acc, model) => {
				if (model.model.provider !== "custom-agent" && model.model.provider !== "n8n") acc.push([model.model.model, {
					id: model.model.model,
					name: model.name
				}]);
				return acc;
			}, []));
			for (const model of customModels.value) models.set(model, {
				id: model,
				name: model,
				isManual: true
			});
			return Array.from(models.values());
		});
		const modelsById = computed(() => {
			const map = {};
			allModels.value.forEach((model) => {
				map[model.id] = model;
			});
			return map;
		});
		const selectedModels = computed({
			get: () => settings.value?.allowedModels?.map((m) => m.model) || [],
			set: (value) => {
				if (settings.value) {
					settings.value.allowedModels = allModels.value.filter((model) => value.includes(model.id)).map((model) => ({
						model: model.id,
						displayName: model.name,
						isManual: model.isManual
					}));
					customModels.value = settings.value.allowedModels.filter((model) => model.isManual).map((model) => model.model);
				}
			}
		});
		async function addManualModel(name) {
			customModels.value.push(name);
			return {
				id: name,
				name
			};
		}
		const i18n = useI18n();
		const credentialsStore = useCredentialsStore();
		const chatStore = useChatStore();
		const toast = useToast();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		async function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		const credentialType = computed(() => {
			return PROVIDER_CREDENTIAL_TYPE_MAP[props.data.provider];
		});
		function onCredentialSelect(credentialId) {
			if (settings.value) settings.value.credentialId = credentialId;
		}
		function onCredentialDeselect() {
			if (settings.value) {
				settings.value.credentialId = null;
				settings.value.allowedModels = [];
				limitModels.value = false;
			}
		}
		async function onConfirm() {
			if (settings.value) await props.data.onConfirm(settings.value);
			else props.data.onCancel();
			closeDialog();
		}
		function onCancel() {
			props.data.onCancel();
			closeDialog();
		}
		async function loadSettings() {
			settings.value = await chatStore.fetchProviderSettings(props.data.provider);
			limitModels.value = settings.value?.allowedModels.length > 0;
			customModels.value = settings.value.allowedModels.filter((model) => model.isManual).map((model) => model.model);
		}
		async function loadAvailableModels(credentialId) {
			loadingModels.value = true;
			try {
				const credentials = { [props.data.provider]: credentialId };
				const response = await fetchChatModelsApi(useRootStore().restApiContext, { credentials });
				availableModels.value = response[props.data.provider].models || [];
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.chatHub.providers.modal.edit.errorFetchingModels"));
			} finally {
				loadingModels.value = false;
			}
		}
		const isConfirmDisabled = computed(() => {
			if (props.data.disabled) return true;
			if (!settings.value) return true;
			return limitModels.value && settings.value.allowedModels.length === 0;
		});
		function onToggleEnabled(value) {
			if (settings.value) {
				settings.value.enabled = value;
				if (!value) {
					settings.value.credentialId = null;
					settings.value.allowedModels = [];
					limitModels.value = false;
				}
			}
		}
		function onToggleLimitModels(value) {
			if (settings.value) {
				limitModels.value = value;
				if (!value) settings.value.allowedModels = [];
			}
		}
		function onChangeContextWindow(value) {
			if (settings.value) settings.value.contextWindowLength = value;
		}
		onMounted(async () => {
			loadingSettings.value = true;
			await Promise.all([
				loadSettings(),
				credentialsStore.fetchCredentialTypes(false),
				credentialsStore.fetchAllCredentials()
			]);
			loadingSettings.value = false;
		});
		watch(() => settings.value?.credentialId, async (credentialId) => {
			if (credentialId) await loadAvailableModels(credentialId);
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				"data-test-id": `${__props.modalName}-modal`,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.title", { interpolate: { provider: unref(providerDisplayNames)[props.data.provider] } })), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
						default: withCtx(() => [createBaseVNode("label", { class: normalizeClass(_ctx.$style.container) }, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.enabled.label", { interpolate: { provider: unref(providerDisplayNames)[props.data.provider] } })), 1)]),
							_: 1
						}), createVNode(unref(N8nTooltip_default), {
							content: unref(i18n).baseText("settings.chatHub.providers.modal.edit.enabled.tooltip"),
							disabled: props.data.disabled,
							placement: "top"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
								"data-test-id": "chat-provider-enabled-switch",
								size: "large",
								"model-value": settings.value?.enabled ?? false,
								disabled: props.data.disabled || loadingSettings.value,
								"onUpdate:modelValue": onToggleEnabled
							}, null, 8, ["model-value", "disabled"])]),
							_: 1
						}, 8, ["content", "disabled"])], 2), settings.value?.enabled ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createBaseVNode("label", { class: normalizeClass(_ctx.$style.container) }, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.credential.label")), 1)]),
								_: 1
							}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialContainer) }, [createVNode(CredentialPicker_default, {
								class: normalizeClass(_ctx.$style.credentialPicker),
								"app-name": unref(providerDisplayNames)[props.data.provider],
								"credential-type": credentialType.value,
								"selected-credential-id": settings.value.credentialId,
								"hide-create-new": true,
								teleported: false,
								onCredentialSelected: onCredentialSelect,
								onCredentialDeselected: onCredentialDeselect
							}, null, 8, [
								"class",
								"app-name",
								"credential-type",
								"selected-credential-id"
							]), settings.value.credentialId ? (openBlock(), createBlock(unref(N8nIconButton_default), {
								key: 0,
								type: "button",
								variant: "outline",
								title: unref(i18n).baseText("settings.chatHub.providers.modal.edit.credential.clearButton"),
								icon: "x",
								"icon-size": "large",
								onClick: onCredentialDeselect
							}, null, 8, ["title"])) : createCommentVNode("", true)], 2)], 2),
							settings.value.credentialId ? (openBlock(), createElementBlock("label", {
								key: 0,
								class: normalizeClass(_ctx.$style.container)
							}, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.limitModels.label", { interpolate: { provider: unref(providerDisplayNames)[props.data.provider] } })), 1)]),
								_: 1
							}), createVNode(unref(N8nTooltip_default), {
								content: unref(i18n).baseText("settings.chatHub.providers.modal.edit.limitModels.tooltip"),
								disabled: props.data.disabled,
								placement: "top"
							}, {
								default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
									"data-test-id": "chat-provider-limit-models-switch",
									size: "large",
									"model-value": limitModels.value,
									disabled: props.data.disabled || loadingSettings.value,
									"onUpdate:modelValue": onToggleLimitModels
								}, null, 8, ["model-value", "disabled"])]),
								_: 1
							}, 8, ["content", "disabled"])], 2)) : createCommentVNode("", true),
							settings.value.credentialId && limitModels.value ? (openBlock(), createElementBlock("label", {
								key: 1,
								class: normalizeClass(_ctx.$style.container)
							}, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.allowedModels.label")), 1)]),
								_: 1
							}), createVNode(TagsDropdown_default, {
								modelValue: selectedModels.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedModels.value = $event),
								class: normalizeClass(_ctx.$style.modelPicker),
								placeholder: unref(i18n).baseText("settings.chatHub.providers.modal.edit.models.placeholder"),
								"event-bus": null,
								"create-enabled": true,
								"manage-enabled": false,
								"all-tags": allModels.value,
								"is-loading": loadingModels.value,
								"tags-by-id": modelsById.value,
								"create-tag": addManualModel,
								"create-tag-i18n-key": "settings.chatHub.providers.modal.edit.models.create"
							}, null, 8, [
								"modelValue",
								"class",
								"placeholder",
								"all-tags",
								"is-loading",
								"tags-by-id"
							])], 2)) : createCommentVNode("", true),
							__props.data.provider === "openai" ? (openBlock(), createElementBlock("label", {
								key: 2,
								class: normalizeClass(_ctx.$style.container)
							}, [
								createVNode(unref(N8nText_default), { color: "text-dark" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.responsesApi.label")), 1)]),
									_: 1
								}),
								createVNode(unref(N8nText_default), {
									color: "text-light",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.responsesApi.description")), 1)]),
									_: 1
								}),
								createVNode(unref(N8nSwitch_default), {
									size: "large",
									"model-value": settings.value.responsesApiEnabled ?? true,
									disabled: props.data.disabled,
									"onUpdate:modelValue": _cache[1] || (_cache[1] = (v) => {
										settings.value.responsesApiEnabled = v;
									})
								}, null, 8, ["model-value", "disabled"])
							], 2)) : createCommentVNode("", true),
							createBaseVNode("label", { class: normalizeClass(_ctx.$style.container) }, [
								createVNode(unref(N8nText_default), { color: "text-dark" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.contextWindowLength.label")), 1)]),
									_: 1
								}),
								createVNode(unref(N8nText_default), {
									color: "text-light",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.contextWindowLength.description")), 1)]),
									_: 1
								}),
								createVNode(unref(N8nInputNumber_default), {
									"model-value": settings.value.contextWindowLength ?? unref(20),
									min: 1,
									max: 256,
									size: "small",
									disabled: props.data.disabled,
									"onUpdate:modelValue": onChangeContextWindow
								}, null, 8, ["model-value", "disabled"])
							], 2)
						], 64)) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: onCancel
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							variant: "solid",
							onClick: onConfirm,
							disabled: isConfirmDisabled.value
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.chatHub.providers.modal.edit.confirm")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open", "data-test-id"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1q45g_1",
	container: "_container_1q45g_5",
	credentialContainer: "_credentialContainer_1q45g_11",
	credentialPicker: "_credentialPicker_1q45g_18",
	modelPicker: "_modelPicker_1q45g_22"
} }]]);
//#endregion
export { ProviderSettingsModal_default as default };
