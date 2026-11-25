import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Rl as CollapsibleRoot_default, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GA as DialogDescription_default, Jg as useUIStore, KA as Dialog_default, Mw as ResponseError, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, XA as VisuallyHidden_default, Y as CHANGE_PASSWORD_MODAL_KEY, _C as useUsersStore, _N as N8nText_default, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, jN as useI18n, pj as AnimatedCollapsibleContent_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/core/auth/components/ChangePasswordModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["value"];
var _hoisted_2 = ["data-test-id", "data-met"];
var PASSWORD_MAX_LENGTH = 64;
var WRONG_PASSWORD_MESSAGE = "Provided current password is incorrect.";
var ChangePasswordModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ChangePasswordModal",
	setup(__props) {
		const MFA_CODE_PATTERN = new RegExp(`^\\d{6}$`);
		const i18n = useI18n();
		const { showMessage, showError } = useToast();
		const uiStore = useUIStore();
		const usersStore = useUsersStore();
		const minLength = useSettingsStore().userManagement.passwordMinLength ?? 8;
		const isMfaEnabled = usersStore.currentUser?.mfaEnabled ?? false;
		const step = ref("newPassword");
		const newPassword = ref("");
		const confirmPassword = ref("");
		const currentPassword = ref("");
		const mfaCode = ref("");
		const isConfirmRevealed = ref(false);
		const isConfirmTouched = ref(false);
		const isMfaCodeTouched = ref(false);
		const rejection = ref();
		const isSubmitting = ref(false);
		const newPasswordInput = ref(null);
		const confirmPasswordInput = ref(null);
		const currentPasswordInput = ref(null);
		const mfaCodeInput = ref(null);
		const requirements = computed(() => [
			{
				key: "length",
				label: i18n.baseText("auth.changePassword.requirements.length", { interpolate: { minimum: minLength } }),
				met: newPassword.value.length >= minLength
			},
			{
				key: "number",
				label: i18n.baseText("auth.changePassword.requirements.number"),
				met: /\d/.test(newPassword.value)
			},
			{
				key: "uppercase",
				label: i18n.baseText("auth.changePassword.requirements.uppercase"),
				met: /[A-Z]/.test(newPassword.value)
			}
		]);
		const isTooLong = computed(() => newPassword.value.length > PASSWORD_MAX_LENGTH);
		const isNewPasswordValid = computed(() => requirements.value.every((requirement) => requirement.met) && !isTooLong.value);
		const passwordsMatch = computed(() => confirmPassword.value !== "" && confirmPassword.value === newPassword.value);
		const showMismatch = computed(() => confirmPassword.value !== "" && !passwordsMatch.value && (isConfirmTouched.value || !newPassword.value.startsWith(confirmPassword.value)));
		const canContinue = computed(() => isNewPasswordValid.value && passwordsMatch.value);
		const isMfaCodeComplete = computed(() => MFA_CODE_PATTERN.test(mfaCode.value));
		const canChangePassword = computed(() => currentPassword.value !== "" && (!isMfaEnabled || isMfaCodeComplete.value) && !rejection.value);
		const rejectionMessages = computed(() => ({
			wrongPassword: i18n.baseText("auth.password.wrong"),
			wrongMfaCode: i18n.baseText("mfa.prompt.error.wrongCode"),
			tooManyAttempts: i18n.baseText("mfa.prompt.error.tooManyAttempts")
		}));
		const currentPasswordError = computed(() => {
			if (rejection.value === "wrongPassword") return rejectionMessages.value.wrongPassword;
			if (rejection.value === "tooManyAttempts" && !isMfaEnabled) return rejectionMessages.value.tooManyAttempts;
		});
		const mfaCodeError = computed(() => {
			if (rejection.value === "wrongMfaCode" || rejection.value === "tooManyAttempts") return rejectionMessages.value[rejection.value];
			if (isMfaCodeTouched.value && mfaCode.value && !isMfaCodeComplete.value) return i18n.baseText("mfa.prompt.error.format.code");
		});
		const copy = computed(() => step.value === "newPassword" ? {
			title: i18n.baseText("auth.changePassword"),
			description: i18n.baseText("auth.changePassword.description")
		} : {
			title: i18n.baseText("auth.changePassword.verify.title"),
			description: isMfaEnabled ? i18n.baseText("auth.changePassword.verify.descriptionWithMfa") : i18n.baseText("auth.changePassword.verify.description")
		});
		watch(isNewPasswordValid, (isValid) => {
			if (isValid) isConfirmRevealed.value = true;
		});
		watch(currentPassword, () => {
			if (rejection.value === "wrongPassword" || rejection.value === "tooManyAttempts") rejection.value = void 0;
		});
		watch(mfaCode, () => {
			if (rejection.value === "wrongMfaCode" || rejection.value === "tooManyAttempts") {
				rejection.value = void 0;
				isMfaCodeTouched.value = false;
			}
		});
		const close = () => {
			if (isSubmitting.value) return;
			uiStore.closeModal(CHANGE_PASSWORD_MODAL_KEY);
		};
		const onOpenChange = (open) => {
			if (!open) close();
		};
		const onOpenAutoFocus = (event) => {
			event.preventDefault();
			newPasswordInput.value?.focus();
		};
		const onNewPasswordEnter = async (event) => {
			if (canContinue.value || !isConfirmRevealed.value) return;
			event.preventDefault();
			await nextTick();
			confirmPasswordInput.value?.focus();
		};
		const onCurrentPasswordEnter = (event) => {
			if (!isMfaEnabled || isMfaCodeComplete.value) return;
			event.preventDefault();
			mfaCodeInput.value?.focus();
		};
		const goToVerify = async () => {
			isConfirmTouched.value = true;
			if (!canContinue.value) return;
			step.value = "verify";
			await nextTick();
			currentPasswordInput.value?.focus();
		};
		const goBack = async () => {
			if (isSubmitting.value) return;
			step.value = "newPassword";
			await nextTick();
			newPasswordInput.value?.focus();
		};
		function toRejection(e) {
			if (!(e instanceof ResponseError)) return void 0;
			if (e.httpStatusCode === 429) return "tooManyAttempts";
			if (e.httpStatusCode === 403 && isMfaEnabled) return "wrongMfaCode";
			if (e.httpStatusCode === 400 && e.message === WRONG_PASSWORD_MESSAGE) return "wrongPassword";
		}
		const focusRejectedField = () => {
			const input = rejection.value === "wrongPassword" || !isMfaEnabled ? currentPasswordInput.value : mfaCodeInput.value;
			input?.focus();
			input?.select();
		};
		const changePassword = async () => {
			isMfaCodeTouched.value = true;
			if (!canChangePassword.value || isSubmitting.value) return;
			isSubmitting.value = true;
			try {
				await usersStore.updateCurrentUserPassword({
					currentPassword: currentPassword.value,
					newPassword: newPassword.value,
					mfaCode: isMfaEnabled ? mfaCode.value : void 0
				});
			} catch (e) {
				rejection.value = toRejection(e);
				if (rejection.value) focusRejectedField();
				else showError(e, i18n.baseText("auth.changePassword.error"));
				return;
			} finally {
				isSubmitting.value = false;
			}
			close();
			showMessage({
				type: "success",
				title: i18n.baseText("auth.changePassword.success")
			});
		};
		const onSubmit = async () => {
			if (step.value === "newPassword") await goToVerify();
			else await changePassword();
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: true,
				header: copy.value.title,
				size: "medium",
				"onUpdate:open": onOpenChange,
				onOpenAutoFocus
			}, {
				default: withCtx(() => [createBaseVNode("form", {
					novalidate: "",
					"data-test-id": "change-password-modal",
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
						default: withCtx(() => [
							createVNode(unref(DialogDescription_default), null, {
								default: withCtx(() => [createTextVNode(toDisplayString(copy.value.description), 1)]),
								_: 1
							}),
							withDirectives(createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.field, { [_ctx.$style.fieldInvalid]: isTooLong.value }]) }, [
								createVNode(unref(N8nInputLabel_default), {
									"input-name": "change-password-new",
									label: unref(i18n).baseText("auth.newPassword")
								}, {
									default: withCtx(() => [createVNode(unref(Input_default), {
										id: "change-password-new",
										ref_key: "newPasswordInput",
										ref: newPasswordInput,
										modelValue: newPassword.value,
										"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => newPassword.value = $event),
										type: "password",
										name: "new-password",
										autocomplete: "new-password",
										size: "medium",
										"aria-invalid": isTooLong.value,
										"aria-describedby": isTooLong.value ? "change-password-requirements change-password-too-long" : "change-password-requirements",
										"data-test-id": "change-password-new-input",
										onKeydown: withKeys(onNewPasswordEnter, ["enter"])
									}, null, 8, [
										"modelValue",
										"aria-invalid",
										"aria-describedby"
									])]),
									_: 1
								}, 8, ["label"]),
								createBaseVNode("ul", {
									id: "change-password-requirements",
									class: normalizeClass(_ctx.$style.checklist)
								}, [(openBlock(true), createElementBlock(Fragment, null, renderList(requirements.value, (requirement) => {
									return openBlock(), createElementBlock("li", {
										key: requirement.key,
										class: normalizeClass([_ctx.$style.check, { [_ctx.$style.checkMet]: requirement.met }]),
										"data-test-id": `change-password-requirement-${requirement.key}`,
										"data-met": requirement.met
									}, [
										createVNode(Transition, {
											"enter-active-class": _ctx.$style.checkIconEnter,
											"leave-active-class": _ctx.$style.checkIconLeave
										}, {
											default: withCtx(() => [requirement.met ? (openBlock(), createElementBlock("span", {
												key: 0,
												class: normalizeClass(_ctx.$style.checkIcon),
												"aria-hidden": "true"
											}, [createVNode(unref(N8nIcon_default), {
												icon: "circle-check",
												size: "small"
											})], 2)) : createCommentVNode("", true)]),
											_: 2
										}, 1032, ["enter-active-class", "leave-active-class"]),
										createBaseVNode("span", null, toDisplayString(requirement.label), 1),
										requirement.met ? (openBlock(), createBlock(unref(VisuallyHidden_default), { key: 0 }, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.changePassword.requirements.met")), 1)]),
											_: 1
										})) : createCommentVNode("", true)
									], 10, _hoisted_2);
								}), 128))], 2),
								isTooLong.value ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									id: "change-password-too-long",
									size: "small",
									color: "danger",
									role: "alert"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.changePassword.error.tooLong", { interpolate: { maximum: PASSWORD_MAX_LENGTH } })), 1)]),
									_: 1
								})) : createCommentVNode("", true)
							], 2), createVNode(unref(CollapsibleRoot_default), { open: isConfirmRevealed.value }, {
								default: withCtx(() => [createVNode(unref(AnimatedCollapsibleContent_default), {
									class: normalizeClass(_ctx.$style.reveal),
									blur: ""
								}, {
									default: withCtx(() => [createBaseVNode("div", { class: normalizeClass([
										_ctx.$style.field,
										_ctx.$style.confirm,
										{ [_ctx.$style.fieldInvalid]: showMismatch.value }
									]) }, [createVNode(unref(N8nInputLabel_default), {
										"input-name": "change-password-confirm",
										label: unref(i18n).baseText("auth.changePassword.confirmNewPassword")
									}, {
										default: withCtx(() => [createVNode(unref(Input_default), {
											id: "change-password-confirm",
											ref_key: "confirmPasswordInput",
											ref: confirmPasswordInput,
											modelValue: confirmPassword.value,
											"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => confirmPassword.value = $event),
											type: "password",
											name: "confirm-password",
											autocomplete: "new-password",
											size: "medium",
											"aria-invalid": showMismatch.value,
											"aria-describedby": "change-password-match",
											"data-test-id": "change-password-confirm-input",
											onBlur: _cache[2] || (_cache[2] = ($event) => isConfirmTouched.value = true)
										}, null, 8, ["modelValue", "aria-invalid"])]),
										_: 1
									}, 8, ["label"]), showMismatch.value ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										id: "change-password-match",
										size: "small",
										color: "danger",
										role: "alert",
										"data-test-id": "change-password-match"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.changePassword.error.mismatch")), 1)]),
										_: 1
									})) : (openBlock(), createElementBlock("p", {
										key: 1,
										id: "change-password-match",
										class: normalizeClass([_ctx.$style.check, { [_ctx.$style.checkMet]: passwordsMatch.value }]),
										"data-test-id": "change-password-match"
									}, [createVNode(Transition, {
										"enter-active-class": _ctx.$style.checkIconEnter,
										"leave-active-class": _ctx.$style.checkIconLeave
									}, {
										default: withCtx(() => [passwordsMatch.value ? (openBlock(), createElementBlock("span", {
											key: 0,
											class: normalizeClass(_ctx.$style.checkIcon),
											"aria-hidden": "true"
										}, [createVNode(unref(N8nIcon_default), {
											icon: "circle-check",
											size: "small"
										})], 2)) : createCommentVNode("", true)]),
										_: 1
									}, 8, ["enter-active-class", "leave-active-class"]), createTextVNode(" " + toDisplayString(passwordsMatch.value ? unref(i18n).baseText("auth.changePassword.passwordsMatch") : unref(i18n).baseText("auth.changePassword.passwordsMustMatch")), 1)], 2))], 2)]),
									_: 1
								}, 8, ["class"])]),
								_: 1
							}, 8, ["open"])], 2), [[vShow, step.value === "newPassword"]]),
							step.value === "verify" ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.body)
							}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.field, { [_ctx.$style.fieldInvalid]: currentPasswordError.value }]) }, [createVNode(unref(N8nInputLabel_default), {
								"input-name": "change-password-current",
								label: unref(i18n).baseText("auth.changePassword.currentPassword")
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									id: "change-password-current",
									ref_key: "currentPasswordInput",
									ref: currentPasswordInput,
									modelValue: currentPassword.value,
									"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => currentPassword.value = $event),
									type: "password",
									name: "current-password",
									autocomplete: "current-password",
									size: "medium",
									"aria-invalid": Boolean(currentPasswordError.value),
									"aria-describedby": currentPasswordError.value ? "change-password-current-error" : void 0,
									"data-test-id": "change-password-current-input",
									onKeydown: withKeys(onCurrentPasswordEnter, ["enter"])
								}, null, 8, [
									"modelValue",
									"aria-invalid",
									"aria-describedby"
								])]),
								_: 1
							}, 8, ["label"]), currentPasswordError.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								id: "change-password-current-error",
								size: "small",
								color: "danger",
								role: "alert",
								"data-test-id": "change-password-current-error"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(currentPasswordError.value), 1)]),
								_: 1
							})) : createCommentVNode("", true)], 2), unref(isMfaEnabled) ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass([_ctx.$style.field, { [_ctx.$style.fieldInvalid]: mfaCodeError.value }])
							}, [createVNode(unref(N8nInputLabel_default), {
								"input-name": "change-password-mfa-code",
								label: unref(i18n).baseText("auth.changePassword.mfaCode")
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									id: "change-password-mfa-code",
									ref_key: "mfaCodeInput",
									ref: mfaCodeInput,
									modelValue: mfaCode.value,
									"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => mfaCode.value = $event),
									name: "mfa-code",
									inputmode: "numeric",
									autocomplete: "one-time-code",
									size: "medium",
									maxlength: unref(6),
									placeholder: unref(i18n).baseText("auth.changePassword.mfaCode.placeholder"),
									"aria-invalid": Boolean(mfaCodeError.value),
									"aria-describedby": mfaCodeError.value ? "change-password-mfa-code-error" : void 0,
									"data-test-id": "change-password-mfa-code-input",
									onBlur: _cache[5] || (_cache[5] = ($event) => isMfaCodeTouched.value = true)
								}, null, 8, [
									"modelValue",
									"maxlength",
									"placeholder",
									"aria-invalid",
									"aria-describedby"
								])]),
								_: 1
							}, 8, ["label"]), mfaCodeError.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								id: "change-password-mfa-code-error",
								size: "small",
								color: "danger",
								role: "alert",
								"data-test-id": "change-password-mfa-code-error"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(mfaCodeError.value), 1)]),
								_: 1
							})) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
						]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [step.value === "newPassword" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"data-test-id": "change-password-cancel-button",
							onClick: close
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							type: "submit",
							disabled: !canContinue.value,
							"data-test-id": "change-password-continue-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.changePassword.continue")), 1)]),
							_: 1
						}, 8, ["disabled"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "change-password-back-button",
							onClick: goBack
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.back")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							disabled: !canChangePassword.value,
							loading: isSubmitting.value,
							"data-test-id": "change-password-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("auth.changePassword")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])], 64))]),
						_: 1
					})
				], 32)]),
				_: 1
			}, 8, ["header"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_u127p_451",
	field: "_field_u127p_457",
	fieldInvalid: "_fieldInvalid_u127p_467",
	reveal: "_reveal_u127p_474",
	confirm: "_confirm_u127p_479",
	checklist: "_checklist_u127p_483",
	check: "_check_u127p_483",
	checkMet: "_checkMet_u127p_509",
	checkIcon: "_checkIcon_u127p_523",
	checkIconEnter: "_checkIconEnter_u127p_535",
	checkSlotOpen: "_checkSlotOpen_u127p_1",
	checkPopIn: "_checkPopIn_u127p_1",
	checkIconLeave: "_checkIconLeave_u127p_549",
	checkSlotClose: "_checkSlotClose_u127p_1",
	checkPopOut: "_checkPopOut_u127p_1",
	shimmer: "_shimmer_u127p_1",
	spin: "_spin_u127p_1",
	"skeleton-pulse": "_skeleton-pulse_u127p_1",
	opacityPulse: "_opacityPulse_u127p_1",
	popoverIn: "_popoverIn_u127p_1",
	fadeIn: "_fadeIn_u127p_1",
	collapsibleSlideDown: "_collapsibleSlideDown_u127p_1",
	collapsibleSlideUp: "_collapsibleSlideUp_u127p_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_u127p_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_u127p_1",
	blurSwapIn: "_blurSwapIn_u127p_1",
	blurSwapOut: "_blurSwapOut_u127p_1",
	pulse: "_pulse_u127p_1",
	pulseGlow: "_pulseGlow_u127p_1",
	pulseGlowDelayed: "_pulseGlowDelayed_u127p_1",
	fade: "_fade_u127p_1",
	fadeInUp: "_fadeInUp_u127p_1",
	fadeInDown: "_fadeInDown_u127p_1",
	fadeInLeft: "_fadeInLeft_u127p_1",
	fadeInRight: "_fadeInRight_u127p_1",
	fadeOut: "_fadeOut_u127p_1",
	fadeOutDown: "_fadeOutDown_u127p_1",
	fadeOutUp: "_fadeOutUp_u127p_1",
	fadeOutLeft: "_fadeOutLeft_u127p_1",
	fadeOutRight: "_fadeOutRight_u127p_1",
	ping: "_ping_u127p_1",
	blinkBackground: "_blinkBackground_u127p_1",
	typingBlink: "_typingBlink_u127p_1"
} }]]);
//#endregion
export { ChangePasswordModal_default as default };
