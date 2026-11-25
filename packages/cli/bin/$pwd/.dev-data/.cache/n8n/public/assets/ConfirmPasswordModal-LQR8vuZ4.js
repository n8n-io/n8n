import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GA as DialogDescription_default, Jg as useUIStore, KA as Dialog_default, Mw as ResponseError, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, X as CONFIRM_PASSWORD_MODAL_KEY, _C as useUsersStore, _N as N8nText_default, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as confirmPasswordEventBus } from "./auth.eventBus-D5q1zHc5.js";
//#region src/features/core/auth/components/ConfirmPasswordModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["value"];
var WRONG_PASSWORD_MESSAGE = "Unable to update profile. Please check your credentials and try again.";
var ConfirmPasswordModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ConfirmPasswordModal",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const usersStore = useUsersStore();
		const { showError } = useToast();
		const password = ref("");
		const passwordInput = ref(null);
		const isSubmitting = ref(false);
		const rejection = ref();
		const canConfirm = computed(() => password.value.length > 0 && !rejection.value);
		const rejectionMessages = computed(() => ({
			wrongPassword: i18n.baseText("auth.password.wrong"),
			tooManyAttempts: i18n.baseText("mfa.prompt.error.tooManyAttempts")
		}));
		const error = computed(() => rejection.value && rejectionMessages.value[rejection.value]);
		watch(password, () => {
			rejection.value = void 0;
		});
		const close = (payload) => {
			if (isSubmitting.value) return;
			uiStore.closeModal(CONFIRM_PASSWORD_MODAL_KEY);
			confirmPasswordEventBus.emit("closed", payload);
		};
		const onOpenChange = (open) => {
			if (!open) close();
		};
		const onOpenAutoFocus = (event) => {
			event.preventDefault();
			passwordInput.value?.focus();
		};
		function toRejection(e) {
			if (!(e instanceof ResponseError)) return void 0;
			if (e.httpStatusCode === 429) return "tooManyAttempts";
			if (e.httpStatusCode === 400 && e.message === WRONG_PASSWORD_MESSAGE) return "wrongPassword";
		}
		const onSubmit = async () => {
			if (!canConfirm.value || isSubmitting.value) return;
			const sent = { currentPassword: password.value };
			isSubmitting.value = true;
			try {
				await props.data?.submit(sent);
			} catch (e) {
				rejection.value = toRejection(e);
				if (rejection.value) {
					passwordInput.value?.focus();
					passwordInput.value?.select();
					return;
				}
				showError(e, i18n.baseText("settings.personal.personalSettingsUpdatedError"));
			} finally {
				isSubmitting.value = false;
			}
			close(sent);
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: true,
				header: unref(i18n).baseText("auth.confirmPassword.changeEmail.title"),
				size: "medium",
				"onUpdate:open": onOpenChange,
				onOpenAutoFocus
			}, {
				default: withCtx(() => [createBaseVNode("form", {
					novalidate: "",
					"data-test-id": "confirm-password-modal",
					onSubmit: withModifiers(onSubmit, ["prevent"])
				}, [
					createBaseVNode("input", {
						type: "email",
						name: "username",
						autocomplete: "username",
						value: unref(usersStore).currentUser?.email,
						hidden: "",
						readonly: ""
					}, null, 8, _hoisted_1),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.confirmPassword.changeEmail.description")), 1)]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass([_ctx.$style.field, { [_ctx.$style.fieldInvalid]: error.value }]) }, [createVNode(unref(N8nInputLabel_default), {
							"input-name": "confirm-password",
							label: unref(i18n).baseText("auth.confirmPassword.changeEmail.input.label")
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "confirm-password",
								ref_key: "passwordInput",
								ref: passwordInput,
								modelValue: password.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => password.value = $event),
								type: "password",
								name: "current-password",
								autocomplete: "current-password",
								size: "medium",
								"aria-invalid": Boolean(error.value),
								"aria-describedby": error.value ? "confirm-password-error" : void 0,
								"data-test-id": "confirm-password-input"
							}, null, 8, [
								"modelValue",
								"aria-invalid",
								"aria-describedby"
							])]),
							_: 1
						}, 8, ["label"]), error.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							id: "confirm-password-error",
							size: "small",
							color: "danger",
							role: "alert",
							"data-test-id": "confirm-password-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(error.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "confirm-password-cancel-button",
							onClick: _cache[1] || (_cache[1] = ($event) => close())
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							disabled: !canConfirm.value,
							loading: isSubmitting.value,
							"data-test-id": "confirm-password-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.confirmPassword.changeEmail.button")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])]),
						_: 1
					})
				], 32)]),
				_: 1
			}, 8, ["header"]);
		};
	}
}), [["__cssModules", { "$style": {
	field: "_field_hoqfs_1",
	fieldInvalid: "_fieldInvalid_hoqfs_9"
} }]]);
//#endregion
export { ConfirmPasswordModal_default as default };
