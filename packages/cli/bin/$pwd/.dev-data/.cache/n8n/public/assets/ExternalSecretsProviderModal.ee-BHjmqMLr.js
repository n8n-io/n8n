import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Kj as N8nNotice_default, LM as N8nCallout_default, PA as useMessage, SN as _plugin_vue_export_helper_default, dC as useToast, dx as MODAL_CONFIRM, hM as N8nLink_default, hr as useExternalSecretsStore, ix as EXTERNAL_SECRETS_PROVIDER_MODAL_KEY, jM as createEventBus, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as ParameterInputExpanded_default } from "./ParameterInputExpanded-COHgQvjR.js";
import { n as ExternalSecretsProviderImage_ee_default, r as useExternalSecretsProvider, t as ExternalSecretsProviderConnectionSwitch_ee_default } from "./ExternalSecretsProviderConnectionSwitch.ee-QvfqedzT.js";
//#region src/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderModal.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "mb-l"
};
var _hoisted_2 = { key: 0 };
var ExternalSecretsProviderModal_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ExternalSecretsProviderModal.ee",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const defaultProviderData = {
			infisical: { siteURL: "https://app.infisical.com" },
			azureKeyVault: { environment: "public" }
		};
		const externalSecretsStore = useExternalSecretsStore();
		const toast = useToast();
		const i18n = useI18n();
		const { confirm } = useMessage();
		const saving = ref(false);
		const eventBus = createEventBus();
		const labelSize = { size: "medium" };
		const provider = computed(() => externalSecretsStore.providers.find((p) => p.name === props.data.name));
		const providerData = ref({});
		const { connectionState, initialConnectionState, normalizedProviderData, shouldDisplayProperty, setConnectionState, testConnection } = useExternalSecretsProvider(provider, providerData);
		const providerDataUpdated = computed(() => {
			return Object.keys(providerData.value).find((key) => {
				return providerData.value[key] !== provider.value?.data?.[key];
			});
		});
		const canSave = computed(() => provider.value?.properties?.filter((property) => property.required && shouldDisplayProperty(property)).every((property) => {
			return !!providerData.value[property.name];
		}) && providerDataUpdated.value);
		onMounted(async () => {
			try {
				const fetchedProvider = await externalSecretsStore.getProvider(props.data.name);
				providerData.value = {
					...defaultProviderData[props.data.name] || {},
					...fetchedProvider.data
				};
				setConnectionState(fetchedProvider.state);
				if (fetchedProvider.connected) initialConnectionState.value = fetchedProvider.state;
				else if (Object.keys(fetchedProvider.data ?? {}).length) await testConnection();
				if (fetchedProvider.state === "connected") externalSecretsStore.reloadProvider(props.data.name);
			} catch (error) {
				toast.showError(error, "Error");
			}
		});
		function onValueChange(updateInformation) {
			providerData.value = {
				...providerData.value,
				[updateInformation.name]: updateInformation.value
			};
		}
		async function save() {
			if (!provider.value) return;
			try {
				saving.value = true;
				await externalSecretsStore.updateProvider(provider.value.name, { data: normalizedProviderData.value });
				setConnectionState(provider.value.state);
			} catch (error) {
				toast.showError(error, "Error");
			}
			await testConnection();
			if (initialConnectionState.value === "initializing" && connectionState.value === "tested") setTimeout(() => {
				eventBus.emit("connect", true);
			}, 100);
			saving.value = false;
		}
		async function onBeforeClose() {
			if (providerDataUpdated.value) return await confirm(i18n.baseText("settings.externalSecrets.provider.closeWithoutSaving.description", { interpolate: { provider: provider.value?.displayName ?? "" } }), {
				title: i18n.baseText("settings.externalSecrets.provider.closeWithoutSaving.title"),
				confirmButtonText: i18n.baseText("settings.externalSecrets.provider.closeWithoutSaving.confirm"),
				cancelButtonText: i18n.baseText("settings.externalSecrets.provider.closeWithoutSaving.cancel")
			}) !== MODAL_CONFIRM;
			return true;
		}
		async function onConnectionStateChange() {
			await testConnection();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				id: "external-secrets-provider-modal",
				width: "812px",
				title: provider.value?.displayName,
				"event-bus": __props.data.eventBus,
				name: unref(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY),
				"before-close": onBeforeClose
			}, {
				header: withCtx(() => [provider.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.header)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.providerTitle) }, [createVNode(ExternalSecretsProviderImage_ee_default, {
					provider: provider.value,
					class: "mr-xs"
				}, null, 8, ["provider"]), createBaseVNode("span", null, toDisplayString(provider.value.displayName), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.providerActions) }, [createVNode(ExternalSecretsProviderConnectionSwitch_ee_default, {
					class: "mr-s",
					disabled: (unref(connectionState) === "initializing" || unref(connectionState) === "error") && !provider.value.connected,
					"event-bus": unref(eventBus),
					provider: provider.value,
					onChange: onConnectionStateChange
				}, null, 8, [
					"disabled",
					"event-bus",
					"provider"
				]), createVNode(unref(N8nButton_default), {
					variant: "solid",
					loading: saving.value,
					disabled: !canSave.value && !saving.value,
					onClick: save
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.externalSecrets.provider.buttons.${saving.value ? "saving" : "save"}`)), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])], 2)], 2)) : createCommentVNode("", true)]),
				content: withCtx(() => [provider.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.container)
				}, [
					_cache[2] || (_cache[2] = createBaseVNode("hr", { class: "mb-l" }, null, -1)),
					unref(connectionState) !== "initializing" ? (openBlock(), createElementBlock("div", _hoisted_1, [unref(connectionState) === "connected" || unref(connectionState) === "tested" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "success"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.externalSecrets.provider.testConnection.success${provider.value.connected ? ".connected" : ""}`, { interpolate: {
							count: `${unref(externalSecretsStore).secrets[provider.value.name]?.length}`,
							provider: provider.value.displayName
						} })) + " ", 1), provider.value.connected ? (openBlock(), createElementBlock("span", _hoisted_2, [
							_cache[1] || (_cache[1] = createBaseVNode("br", null, null, -1)),
							createVNode(unref(I18nT), {
								keypath: "settings.externalSecrets.provider.testConnection.success.connected.usage",
								scope: "global"
							}, {
								code: withCtx(() => [createBaseVNode("code", null, toDisplayString(`\{\{ \$secrets\.${provider.value.name}\.secret_name \}\}`), 1)]),
								_: 1
							}),
							createVNode(unref(N8nLink_default), {
								href: unref(i18n).baseText("settings.externalSecrets.docs.use"),
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.externalSecrets.provider.testConnection.success.connected.docs")), 1)]),
								_: 1
							}, 8, ["href"])
						])) : createCommentVNode("", true)]),
						_: 1
					})) : unref(connectionState) === "error" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "danger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.externalSecrets.provider.testConnection.error${provider.value.connected ? ".connected" : ""}`, { interpolate: { provider: provider.value.displayName } })), 1)]),
						_: 1
					})) : createCommentVNode("", true)])) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment, null, renderList(provider.value.properties, (property) => {
						return withDirectives((openBlock(), createElementBlock("form", {
							key: property.name,
							autocomplete: "off",
							"data-test-id": "external-secrets-provider-properties-form",
							onSubmit: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"]))
						}, [property.type === "notice" ? (openBlock(), createBlock(unref(N8nNotice_default), {
							key: 0,
							content: property.displayName
						}, null, 8, ["content"])) : (openBlock(), createBlock(ParameterInputExpanded_default, {
							key: 1,
							class: "mb-l",
							parameter: property,
							value: providerData.value[property.name],
							label: labelSize,
							"event-source": "external-secrets-provider",
							onUpdate: onValueChange
						}, null, 8, ["parameter", "value"]))], 32)), [[vShow, unref(shouldDisplayProperty)(property)]]);
					}), 128))
				], 2)) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"title",
				"event-bus",
				"name"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1jho7_1",
	header: "_header_1jho7_5",
	providerTitle: "_providerTitle_1jho7_13",
	providerActions: "_providerActions_1jho7_25",
	footer: "_footer_1jho7_32"
} }]]);
//#endregion
export { ExternalSecretsProviderModal_ee_default as default };
