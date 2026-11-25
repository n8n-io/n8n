import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { JA as DialogHeader_default, Jg as useUIStore, Jy as VALID_EMAIL_REGEX, KA as Dialog_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _C as useUsersStore, _N as N8nText_default, __ as COMMUNITY_PLUS_DOCS_URL, dC as useToast, hC as useTelemetry, jN as useI18n, qA as DialogTitle_default, uM as N8nFormInput_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useUsageStore } from "./usage.store-CqGOGqOI.js";
//#region src/features/settings/usage/components/CommunityPlusEnrollmentModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var _hoisted_2 = ["href"];
var CommunityPlusEnrollmentModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "CommunityPlusEnrollmentModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const usageStore = useUsageStore();
		const telemetry = useTelemetry();
		const usersStore = useUsersStore();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const isLoading = ref(false);
		const valid = ref(false);
		const email = ref(usersStore.currentUser?.email ?? "");
		const validationRules = ref([{ name: "email" }]);
		const validators = ref({ email: { validate: (value) => {
			if (typeof value !== "string") return false;
			if (!VALID_EMAIL_REGEX.test(value)) return {
				message: "settings.users.invalidEmailError",
				options: { interpolate: { email: value } }
			};
			return false;
		} } });
		function closeDialog() {
			if (uiStore.modalsById[props.modalName]?.open !== true) return;
			telemetry.track("User skipped community plus");
			uiStore.closeModal(props.modalName);
			props.data?.closeCallback?.();
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		const confirm = async () => {
			if (!valid.value || isLoading.value) return;
			isLoading.value = true;
			try {
				const { title, text } = await usageStore.registerCommunityEdition(email.value);
				closeDialog();
				toast.showMessage({
					title: title ?? i18n.baseText("communityPlusModal.success.title"),
					message: text ?? i18n.baseText("communityPlusModal.success.message", { interpolate: { email: email.value } }),
					type: "success",
					duration: 0
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("communityPlusModal.error.title"));
			} finally {
				isLoading.value = false;
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				"aria-label": __props.data?.customHeading ?? unref(i18n).baseText("communityPlusModal.title"),
				"show-close-button": false,
				"close-on-overlay-click": false,
				"close-on-escape": false,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.data?.customHeading ?? unref(i18n).baseText("communityPlusModal.title")), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", { "data-test-id": `${__props.modalName}-modal` }, [createBaseVNode("div", null, [
							createVNode(unref(N8nText_default), { tag: "p" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityPlusModal.description")), 1)]),
								_: 1
							}),
							createBaseVNode("ul", { class: normalizeClass(_ctx.$style.features) }, [
								createBaseVNode("li", null, [_cache[2] || (_cache[2] = createBaseVNode("i", null, "🐞", -1)), createVNode(unref(N8nText_default), null, {
									default: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("communityPlusModal.features.debugging.title")), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("communityPlusModal.features.debugging.description")), 1)]),
									_: 1
								})]),
								createBaseVNode("li", null, [_cache[3] || (_cache[3] = createBaseVNode("i", null, "🔎", -1)), createVNode(unref(N8nText_default), null, {
									default: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("communityPlusModal.features.execution.title")), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("communityPlusModal.features.execution.description")), 1)]),
									_: 1
								})]),
								createBaseVNode("li", null, [_cache[4] || (_cache[4] = createBaseVNode("i", null, " 📁", -1)), createVNode(unref(N8nText_default), null, {
									default: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("communityPlusModal.features.folders.title")), 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("communityPlusModal.features.folders.description")), 1)]),
									_: 1
								})])
							], 2),
							createVNode(unref(N8nFormInput_default), {
								id: "email",
								modelValue: email.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => email.value = $event),
								label: unref(i18n).baseText("communityPlusModal.input.email.label"),
								type: "email",
								name: "email",
								"label-size": "small",
								"tag-size": "small",
								required: "",
								"show-required-asterisk": true,
								"validate-on-blur": false,
								"validation-rules": validationRules.value,
								validators: validators.value,
								onValidate: _cache[1] || (_cache[1] = ($event) => valid.value = $event),
								onKeyup: withKeys(confirm, ["enter"])
							}, null, 8, [
								"modelValue",
								"label",
								"validation-rules",
								"validators"
							])
						])], 8, _hoisted_1), createBaseVNode("div", { class: normalizeClass(_ctx.$style.notice) }, [createVNode(unref(N8nText_default), {
							size: "xsmall",
							tag: "span"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityPlusModal.notice")) + " ", 1), createBaseVNode("a", {
								href: unref(COMMUNITY_PLUS_DOCS_URL),
								target: "_blank"
							}, toDisplayString(unref(i18n).baseText("generic.moreInfo")), 9, _hoisted_2)]),
							_: 1
						})], 2)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), { class: normalizeClass(_ctx.$style.footer) }, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							disabled: isLoading.value,
							onClick: closeDialog
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityPlusModal.button.skip")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							disabled: !valid.value || isLoading.value,
							variant: "solid",
							onClick: confirm
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("communityPlusModal.button.confirm")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					}, 8, ["class"])
				]),
				_: 1
			}, 8, ["open", "aria-label"]);
		};
	}
}), [["__cssModules", { "$style": {
	notice: "_notice_whre1_1",
	footer: "_footer_whre1_5",
	features: "_features_whre1_9"
} }]]);
//#endregion
export { CommunityPlusEnrollmentModal_default as default };
