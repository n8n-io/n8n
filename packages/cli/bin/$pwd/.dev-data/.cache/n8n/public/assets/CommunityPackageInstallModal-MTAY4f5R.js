import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { D_ as COMMUNITY_NODES_RISKS_DOCS_URL, Dr as useQuickConnect, E_ as COMMUNITY_NODES_INSTALLATION_DOCS_URL, Jg as useUIStore, KA as Dialog_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _M as Checkbox_default, _N as N8nText_default, cN as Input_default, gM as N8nInputLabel_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, j_ as NPM_KEYWORD_SEARCH_URL, k_ as COMMUNITY_PACKAGE_INSTALL_MODAL_KEY, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useInstallNode } from "./useInstallNode-8BEUfP2t.js";
//#region src/features/settings/communityNodes/components/CommunityPackageInstallModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var _hoisted_2 = ["textContent"];
var CommunityPackageInstallModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "CommunityPackageInstallModal",
	setup(__props) {
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const { installNode, loading } = useInstallNode();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]?.open === true);
		const modalData = computed(() => uiStore.modalsById[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]?.data);
		const packageName = ref(modalData.value?.packageName ?? "");
		const userAgreed = ref(false);
		const checkboxWarning = ref(false);
		const infoTextErrorMessage = ref("");
		const { getQuickConnectOptionByPackageName } = useQuickConnect();
		const quickConnect = computed(() => getQuickConnectOptionByPackageName(packageName.value));
		const openNPMPage = () => {
			telemetry.track("user clicked cnr browse button", { source: "cnr install modal" });
			window.open(NPM_KEYWORD_SEARCH_URL, "_blank");
		};
		const onInstallClick = async () => {
			if (!userAgreed.value) checkboxWarning.value = true;
			else {
				infoTextErrorMessage.value = "";
				const result = await installNode({
					type: "unverified",
					packageName: packageName.value,
					nodeType: modalData.value?.nodeType,
					telemetry: {
						source: "cnr settings page",
						hasQuickConnect: quickConnect.value !== void 0
					}
				});
				if (result.error && "httpStatusCode" in result.error && result.error.httpStatusCode === 400) infoTextErrorMessage.value = result.error.message;
				if (result.success) closeDialog();
			}
		};
		const onCheckboxChecked = () => {
			checkboxWarning.value = false;
		};
		const onModalClose = () => {
			return !loading.value;
		};
		async function closeDialog() {
			if (onModalClose() === false) return;
			uiStore.closeModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		const onInputBlur = () => {
			packageName.value = packageName.value.replaceAll("npm i ", "").replaceAll("npm install ", "");
		};
		const onMoreInfoTopClick = () => {
			telemetry.track("user clicked cnr docs link", { source: "install package modal top" });
		};
		const onLearnMoreLinkClick = () => {
			telemetry.track("user clicked cnr docs link", { source: "install package modal bottom" });
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "large",
				header: unref(i18n).baseText("settings.communityNodes.installModal.title"),
				"show-close-button": !unref(loading),
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", { "data-test-id": `${unref(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY)}-modal` }, [!modalData.value?.hideSuggestion ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass([_ctx.$style.descriptionContainer, "p-s"])
					}, [createBaseVNode("div", null, [
						createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.communityNodes.installModal.description")), 1)]),
							_: 1
						}),
						_cache[2] || (_cache[2] = createTextVNode(" " + toDisplayString(" ") + " ", -1)),
						createVNode(unref(N8nLink_default), {
							to: unref(COMMUNITY_NODES_INSTALLATION_DOCS_URL),
							onClick: onMoreInfoTopClick
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.moreInfo")), 1)]),
							_: 1
						}, 8, ["to"])
					]), createVNode(unref(N8nButton_default), {
						label: unref(i18n).baseText("settings.communityNodes.browseButton.label"),
						icon: "external-link",
						class: normalizeClass(_ctx.$style.browseButton),
						onClick: openNPMPage
					}, null, 8, ["label", "class"])], 2)) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass([_ctx.$style.formContainer, "mt-m"]) }, [
						createVNode(unref(N8nInputLabel_default), {
							class: normalizeClass(_ctx.$style.labelTooltip),
							label: unref(i18n).baseText("settings.communityNodes.installModal.packageName.label"),
							"tooltip-text": unref(i18n).baseText("settings.communityNodes.installModal.packageName.tooltip", { interpolate: { npmURL: unref(NPM_KEYWORD_SEARCH_URL) } })
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								modelValue: packageName.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => packageName.value = $event),
								name: "packageNameInput",
								type: "text",
								"data-test-id": "package-name-input",
								maxlength: 214,
								placeholder: unref(i18n).baseText("settings.communityNodes.installModal.packageName.placeholder"),
								required: true,
								disabled: unref(loading) || modalData.value?.disableInput,
								onBlur: onInputBlur
							}, null, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						}, 8, [
							"class",
							"label",
							"tooltip-text"
						]),
						createBaseVNode("div", { class: normalizeClass([_ctx.$style.infoText, "mt-4xs"]) }, [createBaseVNode("span", {
							size: "small",
							class: normalizeClass([_ctx.$style.infoText, infoTextErrorMessage.value ? _ctx.$style.error : ""]),
							textContent: toDisplayString(infoTextErrorMessage.value)
						}, null, 10, _hoisted_2)], 2),
						createVNode(unref(Checkbox_default), {
							modelValue: userAgreed.value,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => userAgreed.value = $event),
							class: normalizeClass([
								_ctx.$style.checkbox,
								checkboxWarning.value ? _ctx.$style.error : "",
								"mt-l"
							]),
							disabled: unref(loading),
							"data-test-id": "user-agreement-checkbox",
							onChange: onCheckboxChecked
						}, {
							label: withCtx(() => [
								createVNode(unref(N8nText_default), null, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.communityNodes.installModal.checkbox.label")), 1)]),
									_: 1
								}),
								_cache[3] || (_cache[3] = createBaseVNode("br", null, null, -1)),
								createVNode(unref(N8nLink_default), {
									to: unref(COMMUNITY_NODES_RISKS_DOCS_URL),
									onClick: onLearnMoreLinkClick
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.moreInfo")), 1)]),
									_: 1
								}, 8, ["to"])
							]),
							_: 1
						}, 8, [
							"modelValue",
							"class",
							"disabled"
						])
					], 2)], 8, _hoisted_1)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						loading: unref(loading),
						disabled: !userAgreed.value || packageName.value === "" || unref(loading),
						label: unref(loading) ? unref(i18n).baseText("settings.communityNodes.installModal.installButton.label.loading") : unref(i18n).baseText("settings.communityNodes.installModal.installButton.label"),
						size: "large",
						float: "right",
						"data-test-id": "install-community-package-button",
						onClick: onInstallClick
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"open",
				"header",
				"show-close-button"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	descriptionContainer: "_descriptionContainer_1p626_1",
	formContainer: "_formContainer_1p626_16",
	checkbox: "_checkbox_1p626_22",
	error: "_error_1p626_26"
} }]]);
//#endregion
export { CommunityPackageInstallModal_default as default };
