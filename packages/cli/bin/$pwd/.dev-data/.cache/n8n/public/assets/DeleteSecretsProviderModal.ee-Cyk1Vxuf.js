import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { JC as deleteSecretProviderConnection, Jg as useUIStore, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bC as useRootStore, cN as Input_default, dC as useToast, fC as VIEWS, gM as N8nInputLabel_default, hM as N8nLink_default, jM as createEventBus, jN as useI18n, px as SECRETS_PROVIDER_CONNECTION_MODAL_KEY, qC as deleteProjectSecretProviderConnection, qm as getAllCredentials, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/integrations/secretsProviders.ee/components/DeleteSecretsProviderModal.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DeleteSecretsProviderModal_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DeleteSecretsProviderModal.ee",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const uiStore = useUIStore();
		const modalBus = createEventBus();
		const confirmationText = ref("");
		const isDeleting = ref(false);
		const credentialsCount = ref(0);
		const isLoadingCredentials = ref(true);
		const shouldShowConfirmation = computed(() => credentialsCount.value > 0);
		const deleteEnabled = computed(() => !shouldShowConfirmation.value || confirmationText.value === props.data.providerName);
		const credentialsPageUrl = computed(() => ({
			name: VIEWS.CREDENTIALS,
			query: { externalSecretsStore: props.data.providerKey }
		}));
		const secretsLabel = computed(() => {
			const count = props.data.secretsCount;
			if (count === 1) return i18n.baseText("settings.secretsProviderConnections.oneSecret");
			return i18n.baseText("settings.secretsProviderConnections.secrets", { interpolate: { count: count.toString() } });
		});
		const credentialsLabel = computed(() => {
			const count = credentialsCount.value;
			if (count === 1) return i18n.baseText("settings.secretsProviderConnections.delete.impact.oneCredential");
			return i18n.baseText("settings.secretsProviderConnections.delete.impact.credentials", { interpolate: { count: count.toString() } });
		});
		onMounted(async () => {
			isLoadingCredentials.value = true;
			try {
				const credentials = await getAllCredentials(rootStore.restApiContext, {
					includeGlobal: true,
					externalSecretsStore: props.data.providerKey
				});
				credentialsCount.value = credentials.length;
			} catch (error) {
				toast.showError(error, i18n.baseText("error"));
			} finally {
				isLoadingCredentials.value = false;
			}
		});
		async function onConfirmDelete() {
			isDeleting.value = true;
			try {
				if (props.data.projectId) await deleteProjectSecretProviderConnection(rootStore.restApiContext, props.data.projectId, props.data.providerKey);
				else await deleteSecretProviderConnection(rootStore.restApiContext, props.data.providerKey);
				toast.showMessage({
					title: i18n.baseText("settings.secretsProviderConnections.delete.success", { interpolate: { name: props.data.providerName } }),
					type: "success"
				});
				if (props.data.onConfirm) await props.data.onConfirm();
				uiStore.closeModal(props.modalName);
				uiStore.closeModal(SECRETS_PROVIDER_CONNECTION_MODAL_KEY);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.secretsProviderConnections.delete.error"));
			} finally {
				isDeleting.value = false;
			}
		}
		function onCancel() {
			uiStore.closeModal(props.modalName);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: __props.modalName,
				title: unref(i18n).baseText("settings.secretsProviderConnections.delete.title", { interpolate: { name: __props.data.providerName } }),
				"event-bus": unref(modalBus),
				width: "540px"
			}, {
				content: withCtx(() => [shouldShowConfirmation.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.content)
				}, [
					createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.delete.description", { interpolate: {
							name: __props.data.providerName,
							secretsCount: secretsLabel.value
						} })), 1)]),
						_: 1
					}),
					!isLoadingCredentials.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.impact)
					}, [createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.delete.impact.title")), 1)]),
						_: 1
					}), createBaseVNode("ul", null, [createBaseVNode("li", null, [createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-base"
					}, {
						default: withCtx(() => [createVNode(unref(N8nLink_default), {
							"data-test-id": "credentials-link",
							to: credentialsPageUrl.value,
							target: "_blank"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(credentialsLabel.value), 1)]),
							_: 1
						}, 8, ["to"]), createTextVNode(" " + toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.delete.impact.description")), 1)]),
						_: 1
					})])])], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.confirmation) }, [createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("settings.secretsProviderConnections.delete.confirmationLabel", { interpolate: { name: __props.data.providerName } }),
						size: "small"
					}, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							modelValue: confirmationText.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => confirmationText.value = $event),
							placeholder: __props.data.providerName,
							"data-test-id": "delete-confirmation-input"
						}, null, 8, ["modelValue", "placeholder"])]),
						_: 1
					}, 8, ["label"])], 2)
				], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.content)
				}, [createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.secretsProviderConnections.delete.description.noImpact")), 1)]),
					_: 1
				})], 2))]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					onClick: onCancel
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "destructive",
					disabled: !deleteEnabled.value,
					loading: isDeleting.value,
					"data-test-id": "confirm-delete-button",
					onClick: onConfirmDelete
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.delete")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])], 2)]),
				_: 1
			}, 8, [
				"name",
				"title",
				"event-bus"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1qh33_1",
	impact: "_impact_1qh33_7",
	confirmation: "_confirmation_1qh33_13",
	footer: "_footer_1qh33_17"
} }]]);
//#endregion
export { DeleteSecretsProviderModal_ee_default as default };
