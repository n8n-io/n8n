import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, EM as Select_default, HM as N8nAvatar_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, Jg as useUIStore, Jy as VALID_EMAIL_REGEX, Kd as useDocumentTitle, Kj as N8nNotice_default, Pj as SettingsSection_default, Q as PROMPT_MFA_CODE_MODAL_KEY, SN as _plugin_vue_export_helper_default, Uj as SettingsLayout_default, Vy as MFA_DOCS_URL, X as CONFIRM_PASSWORD_MODAL_KEY, Y as CHANGE_PASSWORD_MODAL_KEY, Z as MFA_SETUP_MODAL_KEY, Zf as useRolesStore, _C as useUsersStore, _N as N8nText_default, bM as N8nExternalLink_default, cN as Input_default, dC as useToast, fN as N8nTooltip_default, fT as ROLE, jN as useI18n, mC as useCloudPlanStore, ot as useSSOStore, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { r as promptMfaCodeBus, t as confirmPasswordEventBus } from "./auth.eventBus-D5q1zHc5.js";
//#region src/features/core/auth/views/SettingsPersonalView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["aria-hidden"];
var SettingsPersonalView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsPersonalView",
	setup(__props) {
		const i18n = useI18n();
		const { showMessage, showToast, showError } = useToast();
		const documentTitle = useDocumentTitle();
		const uiStore = useUIStore();
		const usersStore = useUsersStore();
		const rolesStore = useRolesStore();
		const settingsStore = useSettingsStore();
		const ssoStore = useSSOStore();
		const cloudPlanStore = useCloudPlanStore();
		const currentUser = computed(() => usersStore.currentUser);
		const isManagedByEnv = computed(() => currentUser.value?.isManagedByEnv ?? false);
		const isLdapCurrentAuthMethod = computed(() => {
			return ssoStore.isEnterpriseLdapEnabled && currentUser.value?.signInType === "ldap";
		});
		const isExternalAuthEnabled = computed(() => {
			const isSamlEnabled = ssoStore.isSamlLoginEnabled && ssoStore.isDefaultAuthenticationSaml;
			const isOidcEnabled = ssoStore.isEnterpriseOidcEnabled && ssoStore.isOidcLoginEnabled && currentUser.value?.signInType === "oidc";
			return isLdapCurrentAuthMethod.value || isSamlEnabled || isOidcEnabled;
		});
		const isPersonalSecurityEnabled = computed(() => {
			return usersStore.isInstanceOwner || !isExternalAuthEnabled.value;
		});
		const canEditName = computed(() => !isManagedByEnv.value && !isExternalAuthEnabled.value);
		const canEditEmail = computed(() => !isManagedByEnv.value && isPersonalSecurityEnabled.value);
		const lockedFieldDescription = computed(() => isManagedByEnv.value ? void 0 : i18n.baseText("settings.personal.managedBy.identityProvider"));
		const mfaDisabled = computed(() => !usersStore.mfaEnabled);
		const mfaEnforced = computed(() => settingsStore.isMFAEnforced);
		const isMfaFeatureEnabled = computed(() => settingsStore.isMfaFeatureEnabled);
		const canConfigureMfa = computed(() => {
			return isMfaFeatureEnabled.value && (isPersonalSecurityEnabled.value || isLdapCurrentAuthMethod.value);
		});
		const isSecuritySectionVisible = computed(() => {
			return !isManagedByEnv.value && (isPersonalSecurityEnabled.value || canConfigureMfa.value);
		});
		const currentUserRole = computed(() => {
			const knownRoles = {
				[ROLE.Default]: {
					name: i18n.baseText("auth.roles.default"),
					description: i18n.baseText("settings.personal.role.tooltip.default")
				},
				[ROLE.Member]: {
					name: i18n.baseText("auth.roles.member"),
					description: i18n.baseText("settings.personal.role.tooltip.member")
				},
				[ROLE.ChatUser]: {
					name: i18n.baseText("auth.roles.chatUser"),
					description: i18n.baseText("settings.personal.role.tooltip.chatUser")
				},
				[ROLE.Admin]: {
					name: i18n.baseText("auth.roles.admin"),
					description: i18n.baseText("settings.personal.role.tooltip.admin")
				},
				[ROLE.Owner]: {
					name: i18n.baseText("auth.roles.owner"),
					description: i18n.baseText("settings.personal.role.tooltip.owner", { interpolate: { cloudAccess: cloudPlanStore.hasCloudPlan ? i18n.baseText("settings.personal.role.tooltip.cloud") : "" } })
				}
			};
			const globalRoleName = usersStore.globalRoleName;
			const knownRole = knownRoles[globalRoleName];
			if (knownRole) return knownRole;
			const customRole = rolesStore.processedInstanceRoles.find((r) => r.slug === globalRoleName);
			return {
				name: customRole?.displayName ?? globalRoleName,
				description: customRole?.description ?? ""
			};
		});
		/**
		* Each field saves when it loses focus (or on Enter). `draft` holds what is being typed until then;
		* Escape puts the saved value back.
		*/
		const draft = reactive({
			firstName: "",
			lastName: "",
			email: ""
		});
		const touched = reactive({
			firstName: false,
			lastName: false,
			email: false
		});
		const savedValues = computed(() => ({
			firstName: currentUser.value?.firstName ?? "",
			lastName: currentUser.value?.lastName ?? "",
			email: currentUser.value?.email ?? ""
		}));
		function resetField(field) {
			draft[field] = savedValues.value[field];
			touched[field] = false;
		}
		const profileFields = computed(() => [
			{
				name: "firstName",
				title: i18n.baseText("settings.personal.firstName"),
				type: "text",
				autocomplete: "given-name",
				maxlength: 32,
				editable: canEditName.value
			},
			{
				name: "lastName",
				title: i18n.baseText("settings.personal.lastName"),
				type: "text",
				autocomplete: "family-name",
				maxlength: 32,
				editable: canEditName.value
			},
			{
				name: "email",
				title: i18n.baseText("auth.email"),
				type: "email",
				autocomplete: "email",
				maxlength: void 0,
				editable: canEditEmail.value
			}
		]);
		const fieldErrors = computed(() => {
			const errors = {};
			const required = i18n.baseText("settings.personal.validation.fieldRequired");
			if (canEditName.value) {
				if (!draft.firstName.trim()) errors.firstName = required;
				if (!draft.lastName.trim()) errors.lastName = required;
			}
			if (canEditEmail.value) {
				if (!draft.email.trim()) errors.email = required;
				else if (!VALID_EMAIL_REGEX.test(draft.email.trim().toLowerCase())) errors.email = i18n.baseText("settings.personal.validation.validEmailRequired");
			}
			return errors;
		});
		function visibleError(field) {
			return touched[field] ? fieldErrors.value[field] : void 0;
		}
		const themeItems = computed(() => [
			{
				value: "system",
				label: i18n.baseText("settings.personal.theme.systemDefault"),
				icon: "monitor"
			},
			{
				value: "light",
				label: i18n.baseText("settings.personal.theme.light"),
				icon: "sun"
			},
			{
				value: "dark",
				label: i18n.baseText("settings.personal.theme.dark"),
				icon: "moon"
			}
		]);
		function onThemeChange(value) {
			const item = themeItems.value.find((option) => option.value === value);
			if (item && item.value !== uiStore.theme) uiStore.setTheme(item.value);
		}
		onMounted(() => {
			documentTitle.set(i18n.baseText("settings.personal.personalSettings"));
			Object.assign(draft, savedValues.value);
		});
		let savedToast;
		function confirmSaved(content) {
			savedToast?.close();
			savedToast = showMessage({
				title: i18n.baseText("settings.personal.personalSettingsUpdated"),
				...content,
				type: "success",
				showClose: false
			});
		}
		function onFieldBlur(field) {
			touched[field] = true;
			if (field === "email") commitEmail();
			else commitName(field);
		}
		function onFieldEnter(event) {
			event.target.blur();
		}
		let nameSaveQueue = Promise.resolve();
		async function commitName(field) {
			nameSaveQueue = nameSaveQueue.then(async () => await saveName(field));
			await nameSaveQueue;
		}
		async function saveName(field) {
			const value = draft[field].trim();
			if (!canEditName.value || fieldErrors.value[field]) return;
			if (value === savedValues.value[field]) {
				draft[field] = savedValues.value[field];
				return;
			}
			try {
				const { firstName, lastName } = savedValues.value;
				await usersStore.updateUserName({
					firstName,
					lastName,
					[field]: value
				});
				if (draft[field].trim() === value) draft[field] = savedValues.value[field];
				confirmSaved();
			} catch (e) {
				showError(e, i18n.baseText("settings.personal.personalSettingsUpdatedError"));
			}
		}
		/** The new address while its confirmation (password or 2FA code) is pending. */
		const pendingEmail = ref(null);
		function commitEmail() {
			const value = draft.email.trim();
			if (!canEditEmail.value || pendingEmail.value !== null || fieldErrors.value.email) return;
			if (value === savedValues.value.email) {
				draft.email = savedValues.value.email;
				return;
			}
			pendingEmail.value = value;
			if (usersStore.currentUser?.mfaEnabled) {
				promptMfaCodeBus.on("closed", onEmailConfirmClosed);
				openPromptMfaCodeModal({
					purpose: "changeEmail",
					submit: async ({ mfaCode }) => await requestEmailChange(value, { mfaCode })
				});
			} else {
				confirmPasswordEventBus.on("closed", onEmailConfirmClosed);
				openConfirmPasswordModal({ submit: async ({ currentPassword }) => await requestEmailChange(value, { currentPassword }) });
			}
		}
		/** Both dialogs send the request themselves, so closing one only ends the pending change. */
		function onEmailConfirmClosed(payload) {
			promptMfaCodeBus.off("closed", onEmailConfirmClosed);
			confirmPasswordEventBus.off("closed", onEmailConfirmClosed);
			pendingEmail.value = null;
			if (!payload) resetField("email");
		}
		async function requestEmailChange(email, credentials) {
			const result = await usersStore.requestEmailChange({
				email,
				...credentials
			});
			draft.email = savedValues.value.email;
			if (result.status === "confirmation-sent") confirmSaved({
				title: i18n.baseText("settings.personal.emailChange.confirmationSent.title"),
				message: i18n.baseText("settings.personal.emailChange.confirmationSent.message")
			});
			else confirmSaved();
		}
		function openPasswordModal() {
			uiStore.openModal(CHANGE_PASSWORD_MODAL_KEY);
		}
		async function onMfaEnableClick() {
			if (!settingsStore.isCloudDeployment || !usersStore.isInstanceOwner) {
				uiStore.openModal(MFA_SETUP_MODAL_KEY);
				return;
			}
			try {
				await usersStore.canEnableMFA();
				uiStore.openModal(MFA_SETUP_MODAL_KEY);
			} catch (e) {
				showToast({
					title: i18n.baseText("settings.personal.mfa.toast.canEnableMfa.title"),
					message: e.message,
					type: "error"
				});
				await usersStore.sendConfirmationEmail();
			}
		}
		async function disableMfa(credentials) {
			await usersStore.disableMfa(credentials);
			showToast({
				title: i18n.baseText("settings.personal.mfa.toast.disabledMfa.title"),
				message: i18n.baseText("settings.personal.mfa.toast.disabledMfa.message"),
				type: "success",
				duration: 0
			});
		}
		function openPromptMfaCodeModal(data) {
			uiStore.openModalWithData({
				name: PROMPT_MFA_CODE_MODAL_KEY,
				data
			});
		}
		function openConfirmPasswordModal(data) {
			uiStore.openModalWithData({
				name: CONFIRM_PASSWORD_MODAL_KEY,
				data
			});
		}
		function onMfaDisableClick() {
			openPromptMfaCodeModal({
				purpose: "disableMfa",
				submit: disableMfa
			});
		}
		onBeforeUnmount(() => {
			promptMfaCodeBus.off("closed", onEmailConfirmClosed);
			confirmPasswordEventBus.off("closed", onEmailConfirmClosed);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				class: normalizeClass(_ctx.$style.layout),
				"data-test-id": "personal-settings-container"
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.personal.personalSettings"),
						description: unref(i18n).baseText("settings.personal.description"),
						"show-docs-link": false
					}, null, 8, ["title", "description"]),
					isManagedByEnv.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						content: unref(i18n).baseText("settings.personal.managedByEnv"),
						"data-test-id": "managed-by-env-notice"
					}, null, 8, ["content"])) : createCommentVNode("", true),
					createVNode(unref(SettingsSection_default), {
						title: unref(i18n).baseText("settings.personal.basicInformation"),
						"data-test-id": "personal-data-form"
					}, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [
								currentUser.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
									key: 0,
									title: unref(i18n).baseText("settings.personal.profilePicture"),
									"data-test-id": "personal-profile-picture-row"
								}, {
									action: withCtx(() => [createVNode(unref(N8nAvatar_default), {
										"first-name": currentUser.value.firstName,
										"last-name": currentUser.value.lastName,
										size: "medium",
										"data-test-id": "current-user-avatar"
									}, null, 8, ["first-name", "last-name"])]),
									_: 1
								}, 8, ["title"])) : createCommentVNode("", true),
								(openBlock(true), createElementBlock(Fragment, null, renderList(profileFields.value, (field) => {
									return openBlock(), createBlock(unref(SettingsRow_default), {
										key: field.name,
										title: field.title,
										description: field.editable ? void 0 : lockedFieldDescription.value,
										"action-fill": "",
										"data-test-id": `personal-${field.name}-row`
									}, {
										action: withCtx(() => [field.editable ? (openBlock(), createElementBlock("div", {
											key: 0,
											class: normalizeClass([_ctx.$style.field, { [_ctx.$style.fieldInvalid]: visibleError(field.name) }])
										}, [createVNode(unref(Input_default), {
											modelValue: draft[field.name],
											"onUpdate:modelValue": ($event) => draft[field.name] = $event,
											size: "medium",
											name: field.name,
											type: field.type,
											autocomplete: field.autocomplete,
											maxlength: field.maxlength,
											"aria-label": field.title,
											"aria-invalid": Boolean(visibleError(field.name)),
											"aria-describedby": visibleError(field.name) ? `personal-${field.name}-error` : void 0,
											onBlur: ($event) => onFieldBlur(field.name),
											onKeydown: [withKeys(onFieldEnter, ["enter"]), withKeys(($event) => resetField(field.name), ["esc"])]
										}, null, 8, [
											"modelValue",
											"onUpdate:modelValue",
											"name",
											"type",
											"autocomplete",
											"maxlength",
											"aria-label",
											"aria-invalid",
											"aria-describedby",
											"onBlur",
											"onKeydown"
										]), visibleError(field.name) ? (openBlock(), createBlock(unref(N8nText_default), {
											key: 0,
											id: `personal-${field.name}-error`,
											size: "small",
											color: "danger",
											role: "alert"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(visibleError(field.name)), 1)]),
											_: 2
										}, 1032, ["id"])) : createCommentVNode("", true)], 2)) : (openBlock(), createBlock(unref(N8nText_default), {
											key: 1,
											class: normalizeClass(_ctx.$style.value),
											size: "medium",
											color: "text-base",
											title: savedValues.value[field.name],
											"data-test-id": `personal-${field.name}-value`
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(savedValues.value[field.name]), 1)]),
											_: 2
										}, 1032, [
											"class",
											"title",
											"data-test-id"
										]))]),
										_: 2
									}, 1032, [
										"title",
										"description",
										"data-test-id"
									]);
								}), 128)),
								currentUser.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
									key: 1,
									title: unref(i18n).baseText("auth.role"),
									"data-test-id": "personal-role-row"
								}, {
									action: withCtx(() => [createVNode(unref(N8nTooltip_default), {
										placement: "bottom",
										disabled: !currentUserRole.value.description
									}, {
										content: withCtx(() => [createTextVNode(toDisplayString(currentUserRole.value.description), 1)]),
										default: withCtx(() => [createVNode(unref(N8nText_default), {
											color: "text-base",
											"data-test-id": "current-user-role"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(currentUserRole.value.name), 1)]),
											_: 1
										})]),
										_: 1
									}, 8, ["disabled"])]),
									_: 1
								}, 8, ["title"])) : createCommentVNode("", true)
							]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"]),
					isSecuritySectionVisible.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
						key: 1,
						title: unref(i18n).baseText("settings.personal.security")
					}, {
						default: withCtx(() => [canConfigureMfa.value && mfaDisabled.value && mfaEnforced.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
							key: 0,
							content: unref(i18n).baseText("settings.personal.mfa.enforced"),
							"data-test-id": "mfa-enforced-notice"
						}, null, 8, ["content"])) : createCommentVNode("", true), createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [isPersonalSecurityEnabled.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
								key: 0,
								title: unref(i18n).baseText("auth.password"),
								description: unref(i18n).baseText("settings.personal.password.description")
							}, {
								action: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "medium",
									label: unref(i18n).baseText("auth.changePassword"),
									"data-test-id": "change-password-link",
									onClick: openPasswordModal
								}, null, 8, ["label"])]),
								_: 1
							}, 8, ["title", "description"])) : createCommentVNode("", true), canConfigureMfa.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
								key: 1,
								"data-test-id": "mfa-section"
							}, {
								info: withCtx(() => [createVNode(unref(N8nText_default), {
									bold: "",
									size: "medium",
									color: "text-dark"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.personal.mfa.section.title")), 1)]),
									_: 1
								}), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(mfaDisabled.value ? unref(i18n).baseText("settings.personal.mfa.description.disabled") : unref(i18n).baseText("settings.personal.mfa.description.enabled")) + " ", 1), createVNode(unref(N8nExternalLink_default), {
										href: unref(MFA_DOCS_URL),
										size: "small",
										class: normalizeClass(_ctx.$style.docsLink),
										"data-test-id": "mfa-docs-link"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
										_: 1
									}, 8, ["href", "class"])]),
									_: 1
								})]),
								action: withCtx(() => [mfaDisabled.value ? (openBlock(), createBlock(unref(N8nButton_default), {
									key: 0,
									variant: "outline",
									size: "medium",
									label: unref(i18n).baseText("settings.personal.mfa.button.enabled"),
									"data-test-id": "enable-mfa-button",
									onClick: onMfaEnableClick
								}, null, 8, ["label"])) : (openBlock(), createBlock(unref(N8nButton_default), {
									key: 1,
									variant: "outline",
									size: "medium",
									label: unref(i18n).baseText("settings.personal.mfa.button.disabled"),
									"data-test-id": "disable-mfa-button",
									onClick: onMfaDisableClick
								}, null, 8, ["label"]))]),
								_: 1
							})) : createCommentVNode("", true)]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"])) : createCommentVNode("", true),
					createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("settings.personal.personalisation") }, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("settings.personal.theme"),
								description: unref(i18n).baseText("settings.personal.theme.description")
							}, {
								action: withCtx(() => [createVNode(unref(Select_default), {
									"model-value": unref(uiStore).theme,
									items: themeItems.value,
									size: "medium",
									"aria-label": unref(i18n).baseText("settings.personal.theme"),
									"data-test-id": "theme-select",
									"onUpdate:modelValue": onThemeChange
								}, {
									default: withCtx(({ modelValue }) => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.themeValue) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(themeItems.value, (item) => {
										return openBlock(), createElementBlock("span", {
											key: item.value,
											class: normalizeClass([_ctx.$style.themeLabel, { [_ctx.$style.themeLabelHidden]: item.value !== modelValue }]),
											"aria-hidden": item.value !== modelValue || void 0
										}, toDisplayString(item.label), 11, _hoisted_1);
									}), 128))], 2)]),
									_: 1
								}, 8, [
									"model-value",
									"items",
									"aria-label"
								])]),
								_: 1
							}, 8, ["title", "description"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"])
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_170l4_2",
	value: "_value_170l4_7",
	field: "_field_170l4_16",
	fieldInvalid: "_fieldInvalid_170l4_27",
	docsLink: "_docsLink_170l4_34",
	themeValue: "_themeValue_170l4_39",
	themeLabel: "_themeLabel_170l4_43",
	themeLabelHidden: "_themeLabelHidden_170l4_48"
} }]]);
//#endregion
export { SettingsPersonalView_default as default };
