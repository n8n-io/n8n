import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { AM as createFormEventBus, GS as EnterpriseEditionFeature, Jg as useUIStore, Jy as VALID_EMAIL_REGEX, KA as Dialog_default, Kj as N8nNotice_default, Ru as usePageRedirectionHelper, UA as DialogFooter_default, Vr as useClipboard, WA as DialogBody_default, Zf as useRolesStore, _C as useUsersStore, dC as useToast, fN as N8nTooltip_default, fT as ROLE, hM as N8nLink_default, jN as useI18n, lM as N8nFormInputs_default, rj as N8nUsersList_default, uv as INVITE_USER_MODAL_KEY, vN as N8nIconButton_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as copyInviteLink } from "./invite-link.utils-D0S7Bpfa.js";
//#region src/features/settings/users/components/InviteUsersModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var _hoisted_2 = { key: 1 };
//#endregion
//#region src/features/settings/users/components/InviteUsersModal.vue
var InviteUsersModal_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "InviteUsersModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const NAME_EMAIL_FORMAT_REGEX = /^.* <(.*)>$/;
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const rolesStore = useRolesStore();
		const clipboard = useClipboard();
		const { showMessage, showError } = useToast();
		const i18n = useI18n();
		const { goToUpgrade } = usePageRedirectionHelper();
		const formBus = createFormEventBus();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[INVITE_USER_MODAL_KEY]?.open === true);
		const config = ref();
		const emails = ref("");
		const role = ref(props.data.initialRole ?? ROLE.Member);
		const showInviteUrls = ref(null);
		const loading = ref(false);
		const emailsCount = computed(() => {
			return emails.value.split(",").filter((email) => !!email.trim()).length;
		});
		const buttonLabel = computed(() => {
			if (emailsCount.value > 1) return i18n.baseText(`settings.users.inviteXUser${settingsStore.isSmtpSetup ? "" : ".inviteUrl"}`, { interpolate: { count: emailsCount.value.toString() } });
			return i18n.baseText(`settings.users.inviteUser${settingsStore.isSmtpSetup ? "" : ".inviteUrl"}`);
		});
		const enabledButton = computed(() => {
			return emailsCount.value >= 1;
		});
		const isAdvancedPermissionsEnabled = computed(() => {
			return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions];
		});
		const isChatHubEnabled = computed(() => {
			return settingsStore.isChatFeatureEnabled;
		});
		const isChatUsersEnabled = computed(() => {
			return isChatHubEnabled.value && settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions];
		});
		const invitedUsers = computed(() => {
			if (!showInviteUrls.value) return [];
			return showInviteUrls.value.map((invite) => ({
				...invite.user,
				isPendingUser: true
			}));
		});
		const validateEmails = (value) => {
			if (typeof value !== "string") return false;
			const emails = value.split(",");
			for (let i = 0; i < emails.length; i++) {
				const email = emails[i];
				const parsed = getEmail(email);
				if (!!parsed.trim() && !VALID_EMAIL_REGEX.test(String(parsed).trim().toLowerCase())) return {
					messageKey: "settings.users.invalidEmailError",
					options: { interpolate: { email: parsed } }
				};
			}
			return false;
		};
		function isInvitableRoleName(val) {
			if (typeof val !== "string") return false;
			return rolesStore.processedInstanceRoles.some((role) => role.slug === val);
		}
		function onInput(e) {
			if (e.name === "emails" && typeof e.value === "string") emails.value = e.value;
			if (e.name === "role" && isInvitableRoleName(e.value)) role.value = e.value;
		}
		async function onSubmit() {
			try {
				loading.value = true;
				const emailList = emails.value.split(",").map((email) => ({
					email: getEmail(email),
					role: role.value
				})).filter((invite) => !!invite.email);
				if (emailList.length === 0) throw new Error(i18n.baseText("settings.users.noUsersToInvite"));
				const invited = await usersStore.inviteUsers(emailList);
				const erroredInvites = invited.filter((invite) => invite.error);
				const successfulEmailInvites = invited.filter((invite) => !invite.error && invite.user.emailSent);
				const successfulUrlInvites = invited.filter((invite) => !invite.error && !invite.user.emailSent);
				if (successfulEmailInvites.length) showMessage({
					type: "success",
					title: i18n.baseText(successfulEmailInvites.length > 1 ? "settings.users.usersInvited" : "settings.users.userInvited"),
					message: i18n.baseText("settings.users.emailInvitesSent", { interpolate: { emails: successfulEmailInvites.map(({ user }) => user.email).join(", ") } })
				});
				if (successfulUrlInvites.length) {
					if (successfulUrlInvites.length === 1) try {
						await copyInviteLink(clipboard, usersStore, successfulUrlInvites[0].user.id);
					} catch (error) {
						showError(error, i18n.baseText("settings.users.inviteLinkError"));
					}
					showMessage({
						type: "success",
						title: i18n.baseText(successfulUrlInvites.length > 1 ? "settings.users.multipleInviteUrlsCreated" : "settings.users.inviteUrlCreated"),
						message: i18n.baseText(successfulUrlInvites.length > 1 ? "settings.users.multipleInviteUrlsCreated.message" : "settings.users.inviteUrlCreated.message", { interpolate: { emails: successfulUrlInvites.map(({ user }) => user.email).join(", ") } })
					});
				}
				if (erroredInvites.length) setTimeout(() => {
					showMessage({
						type: "error",
						title: i18n.baseText("settings.users.usersEmailedError"),
						message: i18n.baseText("settings.users.emailInvitesSentError", { interpolate: { emails: erroredInvites.map(({ error }) => error).join(", ") } })
					});
				}, 0);
				if (successfulUrlInvites.length > 1) showInviteUrls.value = successfulUrlInvites;
				else closeDialog();
				await props.data.afterInvite?.();
			} catch (error) {
				showError(error, i18n.baseText("settings.users.usersInvitedError"));
			}
			loading.value = false;
		}
		function showCopyInviteLinkToast(successfulUrlInvites) {
			showMessage({
				type: "success",
				title: i18n.baseText(successfulUrlInvites.length > 1 ? "settings.users.multipleInviteUrlsCreated" : "settings.users.inviteUrlCreated"),
				message: i18n.baseText(successfulUrlInvites.length > 1 ? "settings.users.multipleInviteUrlsCreated.message" : "settings.users.inviteUrlCreated.message", { interpolate: { emails: successfulUrlInvites.map(({ user }) => user.email).join(", ") } })
			});
		}
		function onSubmitClick() {
			formBus.emit("submit");
		}
		async function closeDialog() {
			uiStore.closeModal(INVITE_USER_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		async function onCopyInviteLink(user) {
			if (!showInviteUrls.value) return;
			try {
				await copyInviteLink(clipboard, usersStore, user.id);
				showCopyInviteLinkToast([]);
			} catch (error) {
				showError(error, i18n.baseText("settings.users.inviteLinkError"));
			}
		}
		function goToUpgradeAdvancedPermissions() {
			goToUpgrade("advanced-permissions", "upgrade-advanced-permissions");
		}
		function getEmail(email) {
			let parsed = email.trim();
			if (NAME_EMAIL_FORMAT_REGEX.test(parsed)) {
				const matches = parsed.match(NAME_EMAIL_FORMAT_REGEX);
				if (matches && matches.length === 2) parsed = matches[1];
			}
			return parsed;
		}
		onMounted(() => {
			config.value = [{
				name: "emails",
				properties: {
					label: i18n.baseText("settings.users.newEmailsToInvite"),
					required: true,
					validationRules: [{ name: "VALID_EMAILS" }],
					validators: { VALID_EMAILS: { validate: validateEmails } },
					placeholder: "name1@email.com, name2@email.com, ...",
					capitalize: true,
					focusInitially: true
				}
			}, {
				name: "role",
				initialValue: props.data.initialRole ?? ROLE.Member,
				properties: {
					label: i18n.baseText("auth.role"),
					required: true,
					type: "select",
					options: [
						{
							value: ROLE.Member,
							label: i18n.baseText("auth.roles.member")
						},
						...isChatHubEnabled.value ? [{
							value: ROLE.ChatUser,
							label: i18n.baseText("auth.roles.chatUser"),
							disabled: !isChatUsersEnabled.value
						}] : [],
						{
							value: ROLE.Admin,
							label: i18n.baseText("auth.roles.admin"),
							disabled: !isAdvancedPermissionsEnabled.value
						},
						...rolesStore.customInstanceRoles.map((role) => ({
							value: role.slug,
							label: role.displayName,
							disabled: !role.licensed
						}))
					],
					capitalize: true
				}
			}];
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "medium",
				header: unref(i18n).baseText(showInviteUrls.value ? "settings.users.copyInviteUrls" : "settings.users.inviteNewUsers"),
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", { "data-test-id": `${unref(INVITE_USER_MODAL_KEY)}-modal` }, [!isAdvancedPermissionsEnabled.value ? (openBlock(), createBlock(unref(N8nNotice_default), { key: 0 }, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "settings.users.advancedPermissions.warning",
							scope: "global"
						}, {
							link: withCtx(() => [createVNode(unref(N8nLink_default), {
								size: "small",
								onClick: goToUpgradeAdvancedPermissions
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
								_: 1
							})]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true), showInviteUrls.value ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nUsersList_default), { users: invitedUsers.value }, {
						actions: withCtx(({ user }) => [createVNode(unref(N8nTooltip_default), null, {
							content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.actions.generateInviteLink")), 1)]),
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								variant: "outline",
								icon: "link",
								"aria-label": unref(i18n).baseText("settings.users.actions.generateInviteLink"),
								"data-test-id": "generate-invite-link-button",
								onClick: ($event) => onCopyInviteLink(user)
							}, null, 8, ["aria-label", "onClick"])]),
							_: 2
						}, 1024)]),
						_: 1
					}, 8, ["users"])])) : config.value ? (openBlock(), createBlock(unref(N8nFormInputs_default), {
						key: 2,
						inputs: config.value,
						"event-bus": unref(formBus),
						"column-view": true,
						onUpdate: onInput,
						onSubmit
					}, null, 8, ["inputs", "event-bus"])) : createCommentVNode("", true)], 8, _hoisted_1)]),
					_: 1
				}), !showInviteUrls.value ? (openBlock(), createBlock(unref(DialogFooter_default), { key: 0 }, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						loading: loading.value,
						disabled: !enabledButton.value,
						label: buttonLabel.value,
						float: "right",
						onClick: onSubmitClick
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
});
//#endregion
export { InviteUsersModal_default as default };
