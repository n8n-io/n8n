import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, cu as ElDatePicker, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, ua as DateTime, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Cm as useRBACStore, DM as CopyInput_default, Jg as useUIStore, KA as Dialog_default, Kd as useDocumentTitle, SN as _plugin_vue_export_helper_default, S_ as READ_SCOPE_ACTIONS, UA as DialogFooter_default, WA as DialogBody_default, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, b_ as API_KEY_CREATE_OR_EDIT_MODAL_KEY, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, hC as useTelemetry, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, x_ as API_KEY_SCOPE_GROUPS, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as ScopesSelector_default } from "./ScopesSelector-DwdPeBuS.js";
import { i as isApiKeyExpired, n as RevokeApiKeyConfirmModal_default, t as useApiKeysStore } from "./apiKeys.store-ergIYmID.js";
//#region src/features/settings/apiKeys/components/ApiKeyScopes.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyScopes.vue
var ApiKeyScopes_default = /* @__PURE__ */ defineComponent({
	__name: "ApiKeyScopes",
	props: {
		modelValue: {},
		availableScopes: {},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ScopesSelector_default, {
				"model-value": props.modelValue,
				"available-scopes": props.availableScopes,
				groups: unref(API_KEY_SCOPE_GROUPS),
				"read-actions": unref(READ_SCOPE_ACTIONS),
				"i18n-key-prefix": "settings.api.scopes",
				"root-test-id": "api-key-scopes",
				disabled: props.disabled,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event))
			}, null, 8, [
				"model-value",
				"available-scopes",
				"groups",
				"read-actions",
				"disabled"
			]);
		};
	}
});
//#endregion
//#region src/features/settings/apiKeys/components/ApiKeyCreateOrEditModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var API_KEY_DATE_FORMAT = "ccc, MMM d yyyy";
var API_KEY_VISIBLE_CHARS_PER_SIDE = 30;
var ApiKeyCreateOrEditModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ApiKeyCreateOrEditModal",
	props: {
		mode: { default: "new" },
		activeId: { default: "" },
		rotatedApiKey: { default: null }
	},
	setup(__props) {
		const EXPIRATION_OPTIONS = {
			"7_DAYS": 7,
			"30_DAYS": 30,
			"60_DAYS": 60,
			"90_DAYS": 90,
			CUSTOM: 1,
			NO_EXPIRATION: 0
		};
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { showError, showMessage } = useToast();
		const uiStore = useUIStore();
		const rootStore = useRootStore();
		const { createApiKey, updateApiKey, deleteApiKey, apiKeysById, availableScopes } = useApiKeysStore();
		const usersStore = useUsersStore();
		const rbacStore = useRBACStore();
		const documentTitle = useDocumentTitle();
		const label = ref("");
		const inputRef = ref(null);
		const expirationDaysFromNow = ref(EXPIRATION_OPTIONS["30_DAYS"]);
		const modalOpen = computed(() => uiStore.modalsById[API_KEY_CREATE_OR_EDIT_MODAL_KEY]?.open === true);
		const newApiKey = ref(null);
		const loading = ref(false);
		const rawApiKey = ref("");
		const customExpirationDate = ref("");
		const showExpirationDateSelector = ref(false);
		const apiKeyCreationDate = ref("");
		const selectedScopes = ref([]);
		const showRevokeConfirm = ref(false);
		const revoking = ref(false);
		const calculateExpirationDate = (daysFromNow) => {
			return DateTime.now().setZone(rootStore.timezone).startOf("day").plus({ days: daysFromNow });
		};
		const getExpirationOptionLabel = (value) => {
			if (EXPIRATION_OPTIONS.CUSTOM === value) return i18n.baseText("settings.api.view.modal.form.expiration.custom");
			if (EXPIRATION_OPTIONS.NO_EXPIRATION === value) return i18n.baseText("settings.api.view.modal.form.expiration.none");
			return i18n.baseText("settings.api.view.modal.form.expiration.days", { interpolate: { numberOfDays: value } });
		};
		const expirationDate = ref(calculateExpirationDate(expirationDaysFromNow.value).toFormat(API_KEY_DATE_FORMAT));
		const props = __props;
		const allFormFieldsAreSet = computed(() => {
			const isExpirationDateSet = expirationDaysFromNow.value === EXPIRATION_OPTIONS.NO_EXPIRATION || expirationDaysFromNow.value === EXPIRATION_OPTIONS.CUSTOM && customExpirationDate.value || expirationDate.value;
			return label.value && selectedScopes.value.length > 0 && (props.mode === "edit" ? true : isExpirationDateSet);
		});
		const currentApiKey = computed(() => props.mode === "edit" ? apiKeysById[props.activeId] ?? null : null);
		const isOwnKey = computed(() => {
			const apiKey = currentApiKey.value;
			if (!apiKey?.owner || !usersStore.currentUser) return true;
			return apiKey.owner.id === usersStore.currentUser.id;
		});
		const isReadOnly = computed(() => {
			if (!currentApiKey.value) return false;
			return !isOwnKey.value || !rbacStore.hasScope("apiKey:update");
		});
		const expirationCopy = (expirationDate, expired = false) => i18n.baseText(expired ? "settings.api.view.modal.form.expirationText.expired" : "settings.api.view.modal.form.expirationText", { interpolate: { expirationDate } });
		const neverExpiresCopy = () => i18n.baseText("settings.api.view.modal.form.expirationText.never");
		const expirationHint = computed(() => {
			if (expirationDaysFromNow.value === EXPIRATION_OPTIONS.NO_EXPIRATION) return neverExpiresCopy();
			return expirationDate.value ? expirationCopy(expirationDate.value) : "";
		});
		const editExpirationText = computed(() => {
			const apiKey = currentApiKey.value;
			if (!apiKey) return "";
			if (!apiKey.expiresAt) return neverExpiresCopy();
			return expirationCopy(DateTime.fromSeconds(apiKey.expiresAt).toFormat(API_KEY_DATE_FORMAT), isApiKeyExpired(apiKey));
		});
		const isCustomDateInThePast = (date) => Date.now() > date.getTime();
		onMounted(() => {
			documentTitle.set(i18n.baseText("settings.api"));
			if (props.rotatedApiKey) {
				newApiKey.value = props.rotatedApiKey;
				rawApiKey.value = props.rotatedApiKey.rawApiKey;
				return;
			}
			setTimeout(() => {
				inputRef.value?.focus();
			});
			if (props.mode === "edit") {
				const apiKey = apiKeysById[props.activeId];
				label.value = apiKey.label ?? "";
				apiKeyCreationDate.value = getApiKeyCreationTime(apiKey);
				selectedScopes.value = apiKey.scopes.filter((scope) => availableScopes.includes(scope));
			} else selectedScopes.value = [...availableScopes];
		});
		function onInput(value) {
			label.value = value;
		}
		function onScopeSelectionChanged(scopes) {
			selectedScopes.value = scopes;
		}
		const getApiKeyCreationTime = (apiKey) => {
			const time = DateTime.fromMillis(Date.parse(apiKey.createdAt)).toFormat(API_KEY_DATE_FORMAT);
			return i18n.baseText("settings.api.creationTime", { interpolate: { time } });
		};
		async function onEdit() {
			try {
				loading.value = true;
				await updateApiKey(props.activeId, {
					label: label.value,
					scopes: selectedScopes.value
				});
				showMessage({
					type: "success",
					title: i18n.baseText("settings.api.update.toast")
				});
				closeDialog();
			} catch (error) {
				showError(error, i18n.baseText("settings.api.edit.error"));
			} finally {
				loading.value = false;
			}
		}
		async function closeDialog() {
			uiStore.closeModal(API_KEY_CREATE_OR_EDIT_MODAL_KEY);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		const onSave = async () => {
			if (!label.value) return;
			let expirationUnixTimestamp = null;
			if (expirationDaysFromNow.value === EXPIRATION_OPTIONS.CUSTOM) expirationUnixTimestamp = parseInt(customExpirationDate.value, 10);
			else if (expirationDaysFromNow.value !== EXPIRATION_OPTIONS.NO_EXPIRATION) expirationUnixTimestamp = calculateExpirationDate(expirationDaysFromNow.value).toUnixInteger();
			const payload = {
				label: label.value,
				expiresAt: expirationUnixTimestamp,
				scopes: selectedScopes.value
			};
			try {
				loading.value = true;
				newApiKey.value = await createApiKey(payload);
				rawApiKey.value = newApiKey.value.rawApiKey;
				showMessage({
					type: "success",
					title: i18n.baseText("settings.api.create.toast")
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.api.create.error"));
			} finally {
				loading.value = false;
			}
		};
		const apiKeyDisplay = computed(() => {
			const raw = rawApiKey.value;
			const visible = API_KEY_VISIBLE_CHARS_PER_SIDE;
			return raw.length > 60 ? `${raw.slice(0, visible)}...${raw.slice(-30)}` : raw;
		});
		function onApiKeyCopied() {
			showMessage({
				title: i18n.baseText("settings.api.view.copy.toast"),
				type: "success"
			});
		}
		const modalTitle = computed(() => {
			if (props.rotatedApiKey) return i18n.baseText("settings.api.rotate.success.title");
			if (isReadOnly.value) return isOwnKey.value || !currentApiKey.value?.owner ? i18n.baseText("settings.api.view.modal.title.readonly.own") : i18n.baseText("settings.api.view.modal.title.readonly", { interpolate: { email: currentApiKey.value.owner.email } });
			let path = "edit";
			if (props.mode === "new") {
				if (newApiKey.value) path = "created";
				else path = "create";
			}
			return i18n.baseText(`settings.api.view.modal.title.${path}`);
		});
		async function onRevokeConfirm() {
			if (!currentApiKey.value) return;
			revoking.value = true;
			try {
				await deleteApiKey(props.activeId);
				showMessage({
					type: "success",
					title: i18n.baseText("settings.api.revoke.toast")
				});
				showRevokeConfirm.value = false;
				closeDialog();
			} catch (error) {
				showError(error, i18n.baseText("settings.api.delete.error"));
			} finally {
				revoking.value = false;
				telemetry.track("User clicked delete API key button", { is_own: false });
			}
		}
		const onSelect = (value) => {
			if (value === EXPIRATION_OPTIONS.CUSTOM) {
				showExpirationDateSelector.value = true;
				expirationDate.value = "";
				return;
			}
			if (value !== EXPIRATION_OPTIONS.NO_EXPIRATION) {
				expirationDate.value = calculateExpirationDate(value).toFormat(API_KEY_DATE_FORMAT);
				showExpirationDateSelector.value = false;
				return;
			}
			expirationDate.value = "";
			showExpirationDateSelector.value = false;
		};
		async function handleEnterKey(event) {
			if (event.key === "Enter") {
				if (isReadOnly.value) return;
				if (props.mode === "new") await onSave();
				else await onEdit();
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "xlarge",
				header: modalTitle.value,
				"close-on-overlay-click": false,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", { "data-test-id": `${unref(API_KEY_CREATE_OR_EDIT_MODAL_KEY)}-modal` }, [createBaseVNode("div", { onKeyup: withKeys(handleEnterKey, ["enter"]) }, [newApiKey.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.createdView)
					}, [createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.api.view.copy")), 1)]),
						_: 1
					}), createVNode(unref(CopyInput_default), {
						value: rawApiKey.value,
						"display-value": apiKeyDisplay.value,
						label: unref(i18n).baseText("generic.apiKey"),
						size: "large",
						"copy-label": unref(i18n).baseText("generic.copy"),
						"copied-label": unref(i18n).baseText("generic.copiedToClipboard"),
						redact: "",
						"data-test-id": "copy-input",
						onCopy: onApiKeyCopied
					}, null, 8, [
						"value",
						"display-value",
						"label",
						"copy-label",
						"copied-label"
					])], 2)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.form)
					}, [
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("settings.api.view.modal.form.label"),
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								ref_key: "inputRef",
								ref: inputRef,
								required: "",
								"model-value": label.value,
								size: "large",
								type: "text",
								placeholder: unref(i18n).baseText("settings.api.view.modal.form.label.placeholder"),
								maxlength: 50,
								disabled: isReadOnly.value,
								"data-test-id": "api-key-label",
								"onUpdate:modelValue": onInput
							}, null, 8, [
								"model-value",
								"placeholder",
								"disabled"
							])]),
							_: 1
						}, 8, ["label"]),
						__props.mode === "new" ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.expirationSection)
						}, [
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("settings.api.view.modal.form.expiration"),
								color: "text-dark"
							}, {
								default: withCtx(() => [createVNode(unref(N8nSelect_default), {
									modelValue: expirationDaysFromNow.value,
									"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => expirationDaysFromNow.value = $event), onSelect],
									size: "large",
									filterable: "",
									readonly: "",
									teleported: false,
									"data-test-id": "expiration-select"
								}, {
									default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(Object.keys(EXPIRATION_OPTIONS), (key) => {
										return openBlock(), createBlock(unref(N8nOption_default), {
											key,
											value: EXPIRATION_OPTIONS[key],
											label: getExpirationOptionLabel(EXPIRATION_OPTIONS[key])
										}, null, 8, ["value", "label"]);
									}), 128))]),
									_: 1
								}, 8, ["modelValue"])]),
								_: 1
							}, 8, ["label"]),
							showExpirationDateSelector.value ? (openBlock(), createBlock(unref(ElDatePicker), {
								key: 0,
								modelValue: customExpirationDate.value,
								"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => customExpirationDate.value = $event),
								type: "date",
								teleported: false,
								placeholder: "yyyy-mm-dd",
								"value-format": "X",
								"disabled-date": isCustomDateInThePast
							}, null, 8, ["modelValue"])) : createCommentVNode("", true),
							expirationHint.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "text-light",
								"data-test-id": "api-key-expiration-hint"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(expirationHint.value), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2)) : (openBlock(), createBlock(unref(N8nInputLabel_default), {
							key: 1,
							label: unref(i18n).baseText("settings.api.view.modal.form.expiration"),
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light",
								"data-test-id": "api-key-expiration-readonly"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(editExpirationText.value), 1)]),
								_: 1
							})]),
							_: 1
						}, 8, ["label"])),
						createVNode(ApiKeyScopes_default, {
							modelValue: selectedScopes.value,
							"onUpdate:modelValue": [_cache[2] || (_cache[2] = ($event) => selectedScopes.value = $event), onScopeSelectionChanged],
							"available-scopes": unref(availableScopes),
							disabled: isReadOnly.value
						}, null, 8, [
							"modelValue",
							"available-scopes",
							"disabled"
						])
					], 2)), createVNode(RevokeApiKeyConfirmModal_default, {
						"api-key": currentApiKey.value,
						open: showRevokeConfirm.value,
						loading: revoking.value,
						"revoking-for-other": !isOwnKey.value,
						onConfirm: onRevokeConfirm,
						onCancel: _cache[3] || (_cache[3] = ($event) => showRevokeConfirm.value = false),
						"onUpdate:open": _cache[4] || (_cache[4] = ($event) => showRevokeConfirm.value = $event)
					}, null, 8, [
						"api-key",
						"open",
						"loading",
						"revoking-for-other"
					])], 32)], 8, _hoisted_1)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [isReadOnly.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.readonlyActions) }, [createVNode(unref(N8nButton_default), {
						variant: "destructive",
						label: unref(i18n).baseText("settings.api.revoke.button"),
						"data-test-id": "api-key-readonly-revoke",
						onClick: _cache[5] || (_cache[5] = ($event) => showRevokeConfirm.value = true)
					}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("settings.api.view.modal.close.button"),
						"data-test-id": "api-key-readonly-close",
						onClick: closeDialog
					}, null, 8, ["label"])], 2), createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(apiKeyCreationDate.value), 1)]),
						_: 1
					})], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						__props.mode === "new" && !newApiKey.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							loading: loading.value,
							disabled: !allFormFieldsAreSet.value,
							label: unref(i18n).baseText("settings.api.view.modal.save.button"),
							onClick: onSave
						}, null, 8, [
							"loading",
							"disabled",
							"label"
						])) : __props.mode === "new" ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							label: unref(i18n).baseText("settings.api.view.modal.done.button"),
							onClick: closeDialog
						}, null, 8, ["label"])) : createCommentVNode("", true),
						__props.mode === "edit" ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							disabled: !allFormFieldsAreSet.value,
							label: unref(i18n).baseText("settings.api.view.modal.save.button"),
							onClick: onEdit
						}, null, 8, ["disabled", "label"])) : createCommentVNode("", true),
						__props.mode === "edit" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 3,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(apiKeyCreationDate.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 64))], 2)]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	notice: "_notice_1ooag_1",
	createdView: "_createdView_1ooag_5",
	form: "_form_1ooag_11",
	expirationSection: "_expirationSection_1ooag_17",
	footer: "_footer_1ooag_24",
	readonlyActions: "_readonlyActions_1ooag_32"
} }]]);
//#endregion
export { ApiKeyCreateOrEditModal_default as default };
