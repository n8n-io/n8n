import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Iu as useEventListener, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, pd as useDebounceFn, qo as onBeforeRouteLeave, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, DM as CopyInput_default, E as PROMOTIONS_SETTINGS_VIEW, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, JA as DialogHeader_default, KA as Dialog_default, Kj as N8nNotice_default, NA as Loading_default, PA as useMessage, Pj as SettingsSection_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, WA as DialogBody_default, _M as Checkbox_default, _N as N8nText_default, bC as useRootStore, cE as promotionProviderTypeSchema, cN as Input_default, dC as useToast, eC as DEBOUNCE_TIME, gM as N8nInputLabel_default, jN as useI18n, mM as N8nOption_default, oE as isPromotionGitHostType, pM as N8nSelect_default, qA as DialogTitle_default, qd as useDocumentTitle, sE as promotionProviderTypeCapabilities, uM as N8nFormInput_default, x as ENVIRONMENTS_PLAN_DOCS_URL, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { _ as updatePromotionEnvironment, d as fetchPromotionBranches, f as fetchPromotionEnvironment, h as fetchPromotionRepositories, l as deleteProviderIfUnused, m as fetchPromotionProvider, o as createPromotionEnvironment, p as fetchPromotionEnvironments, s as createPromotionProvider, t as invalidateInstancePromotionConnection, v as updatePromotionProvider } from "./useInstancePromotionConnection-5-otSLfL.js";
import { a as promotionEnvironmentBranch, c as providerFormFrom, i as isSamePromotionHostUrl, n as buildProviderUpdatePayload, o as promotionEnvironmentDirectionFields, r as emptyProviderForm, s as promotionProviderIcon, t as buildProviderCreatePayload } from "./promotionsSettings.utils-DVnAp-i1.js";
import { t as usePromotionCheckout } from "./usePromotionCheckout-BTtFHAl-.js";
//#region ../../modules/promotions/frontend/src/composables/usePromotionGitHostDiscovery.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/** Loads one searchable list. */
function usePromotionGitHostDiscovery(context) {
	const rootStore = useRootStore();
	const i18n = useI18n();
	const options = ref([]);
	const search = ref("");
	const loading = ref(false);
	const error = ref();
	let generation = 0;
	async function load(requestGeneration) {
		const repositoryId = context.repositoryId;
		if (requestGeneration !== generation || context.kind === "branch" && !repositoryId) return;
		loading.value = true;
		error.value = void 0;
		try {
			const query = {
				search: search.value || void 0,
				limit: 25
			};
			let pageOptions;
			if (context.kind === "repository") pageOptions = (await fetchPromotionRepositories(rootStore.publicApiContext, context.providerId, query)).data.map((repository) => ({
				value: repository.remoteUrl,
				label: repository.fullPath,
				repository
			}));
			else if (repositoryId) pageOptions = (await fetchPromotionBranches(rootStore.publicApiContext, context.providerId, repositoryId, query)).data.map((branch) => ({
				value: branch.name,
				label: branch.name
			}));
			else return;
			if (requestGeneration !== generation) return;
			options.value = pageOptions;
		} catch (cause) {
			if (requestGeneration !== generation) return;
			error.value = cause instanceof Error ? cause.message : i18n.baseText("settings.promotions.discovery.error");
		} finally {
			if (requestGeneration === generation) loading.value = false;
		}
	}
	const debouncedLoad = useDebounceFn(load, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
	function onSearch(value) {
		if (context.kind === "branch" && !context.repositoryId) return;
		const query = value.trim();
		if (query === search.value) return;
		search.value = query;
		options.value = [];
		error.value = void 0;
		loading.value = true;
		debouncedLoad(++generation);
	}
	function cancel() {
		generation++;
		loading.value = false;
		error.value = void 0;
	}
	watch(() => [
		context.providerId,
		context.repositoryId,
		context.kind,
		context.revision
	], () => {
		cancel();
		search.value = "";
		options.value = [];
		load(generation);
	}, { immediate: true });
	onScopeDispose(() => {
		generation++;
	});
	return {
		options,
		search,
		loading,
		error,
		onSearch,
		cancel,
		retry: async () => await load(generation)
	};
}
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionGitHostSelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { key: 0 };
var _hoisted_2 = { key: 1 };
var PromotionGitHostSelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionGitHostSelect",
	props: {
		modelValue: {},
		selectedLabel: {},
		providerId: {},
		kind: {},
		repositoryId: {},
		revision: {},
		inputId: {},
		disabled: { type: Boolean }
	},
	emits: ["update:modelValue", "selected"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { options, search, loading, error, onSearch, cancel, retry } = usePromotionGitHostDiscovery(props);
		const selectedRepository = ref();
		watch(() => [props.providerId, props.revision], () => {
			selectedRepository.value = void 0;
		});
		const unavailable = computed(() => props.disabled || props.kind === "branch" && !props.repositoryId);
		const emptyMessage = computed(() => i18n.baseText(props.kind === "repository" ? "settings.promotions.discovery.repository.empty" : "settings.promotions.discovery.branch.empty"));
		const visibleOptions = computed(() => {
			if (!props.modelValue || options.value.some(({ value }) => value === props.modelValue)) return options.value;
			return [selectedRepository.value?.remoteUrl === props.modelValue ? {
				value: props.modelValue,
				label: selectedRepository.value.fullPath,
				repository: selectedRepository.value
			} : {
				value: props.modelValue,
				label: props.selectedLabel ?? props.modelValue
			}, ...options.value];
		});
		function select(value) {
			const option = visibleOptions.value.find((item) => item.value === value);
			cancel();
			onSearch("");
			emit("update:modelValue", value);
			if (option?.repository) {
				selectedRepository.value = option.repository;
				emit("selected", option.repository);
			}
		}
		function onInput(event) {
			if (event.target instanceof HTMLInputElement) onSearch(event.target.value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.picker),
				onInput
			}, [
				createVNode(unref(N8nSelect_default), {
					id: __props.inputId,
					"model-value": __props.modelValue,
					disabled: unavailable.value,
					loading: unref(loading),
					filterable: "",
					remote: "",
					"remote-show-suffix": "",
					placeholder: unref(i18n).baseText(__props.kind === "repository" ? "settings.promotions.discovery.repository.placeholder" : "settings.promotions.discovery.branch.placeholder"),
					"no-data-text": emptyMessage.value,
					"no-match-text": emptyMessage.value,
					"onUpdate:modelValue": select
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(visibleOptions.value, (option) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: `${option.value}:${option.label}`,
							value: option.value,
							label: option.label
						}, null, 8, ["value", "label"]);
					}), 128))]),
					_: 1
				}, 8, [
					"id",
					"model-value",
					"disabled",
					"loading",
					"placeholder",
					"no-data-text",
					"no-match-text"
				]),
				createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.srOnly),
					role: "status"
				}, [unref(search) ? (openBlock(), createElementBlock("span", _hoisted_1$1, toDisplayString(unref(i18n).baseText("settings.promotions.discovery.searchHint", { interpolate: { search: unref(search) } })), 1)) : createCommentVNode("", true), !unref(loading) && !unref(error) && !unavailable.value && unref(options).length === 0 && (!__props.modelValue || unref(search)) ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(emptyMessage.value), 1)) : createCommentVNode("", true)], 2),
				unref(error) ? (openBlock(), createBlock(unref(N8nNotice_default), {
					key: 0,
					theme: "danger",
					role: "alert"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(error)) + " ", 1), createVNode(unref(N8nButton_default), {
						type: "button",
						variant: "outline",
						disabled: unavailable.value || unref(loading),
						onClick: withModifiers(unref(retry), ["stop"])
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
						_: 1
					}, 8, ["disabled", "onClick"])]),
					_: 1
				})) : createCommentVNode("", true)
			], 34);
		};
	}
}), [["__cssModules", { "$style": {
	picker: "_picker_1ikuy_1",
	srOnly: "_srOnly_1ikuy_7"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionProviderDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 2 };
var PromotionProviderDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionProviderDialog",
	props: {
		open: { type: Boolean },
		providerId: {},
		type: {}
	},
	emits: ["update:open", "saved"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const form = reactive(emptyProviderForm(props.type));
		const step = ref("form");
		const current = ref(null);
		const usedBy = ref([]);
		const generatedPublicKey = ref(null);
		const isLoading = ref(false);
		const isSubmitting = ref(false);
		const saveError = ref();
		const nameInput = useTemplateRef("nameInput");
		const doneButton = useTemplateRef("doneButton");
		const isEdit = computed(() => props.providerId !== void 0);
		const capabilities = computed(() => promotionProviderTypeCapabilities[form.type]);
		watch(() => [form.baseUrl, form.password], () => {
			saveError.value = void 0;
		});
		const title = computed(() => {
			if (step.value === "key") return i18n.baseText("settings.promotions.provider.dialog.title.key");
			if (isEdit.value) return i18n.baseText("settings.promotions.provider.dialog.title.edit");
			return i18n.baseText("settings.promotions.provider.dialog.title.add", { interpolate: { type: i18n.baseText(`settings.promotions.providers.type.${form.type}`) } });
		});
		const ariaDescription = computed(() => i18n.baseText(step.value === "key" ? "settings.promotions.provider.dialog.key.ariaDescription" : "settings.promotions.provider.dialog.ariaDescription"));
		const storedPublicKey = computed(() => {
			const config = current.value?.config;
			return config && "publicKey" in config ? config.publicKey : null;
		});
		const isInUse = computed(() => usedBy.value.length > 0);
		const usedByNames = computed(() => [...new Set(usedBy.value.map(({ name }) => name))].join(", "));
		const hasUsername = computed(() => form.username.trim().length > 0);
		const hasPassword = computed(() => form.password.length > 0);
		const hasHostUrlChange = computed(() => {
			const config = current.value?.config;
			return config && "baseUrl" in config ? !isSamePromotionHostUrl(config.baseUrl, form.baseUrl) : false;
		});
		const areCredentialsIncomplete = computed(() => {
			if (form.authType !== "token") return false;
			if (capabilities.value.tokenUsername) return (!isEdit.value || hasHostUrlChange.value) && !hasPassword.value;
			if (!isEdit.value) return !(hasUsername.value && hasPassword.value);
			if (!hasUsername.value && !hasPassword.value) return false;
			return !(hasUsername.value && hasPassword.value);
		});
		const hasChanges = computed(() => {
			if (!current.value) return true;
			return Object.keys(buildProviderUpdatePayload(form, current.value)).length > 0;
		});
		const saveDisabledReason = computed(() => {
			if (!form.name.trim()) return i18n.baseText("settings.promotions.provider.form.incomplete");
			if (capabilities.value.hasHostApi && !form.baseUrl.trim()) return i18n.baseText("settings.promotions.provider.form.incomplete");
			if (areCredentialsIncomplete.value) return i18n.baseText("settings.promotions.provider.form.credentials.required");
			if (!hasChanges.value) return i18n.baseText("settings.promotions.provider.form.noChanges");
		});
		const isSaveDisabled = computed(() => isSubmitting.value || isLoading.value || saveDisabledReason.value !== void 0);
		function close() {
			emit("update:open", false);
		}
		function onOpenChange(value) {
			if (value || isSubmitting.value) return;
			close();
		}
		function focusStep() {
			nextTick(() => {
				if (step.value === "key") doneButton.value?.$el?.focus();
				else nameInput.value?.focus();
			});
		}
		function onOpenAutoFocus(event) {
			event.preventDefault();
			focusStep();
		}
		onMounted(async () => {
			if (props.providerId === void 0) {
				focusStep();
				return;
			}
			isLoading.value = true;
			try {
				const [provider, environments] = await Promise.all([fetchPromotionProvider(rootStore.publicApiContext, props.providerId), fetchPromotionEnvironments(rootStore.publicApiContext, { providerId: props.providerId })]);
				current.value = provider;
				usedBy.value = environments;
				Object.assign(form, providerFormFrom(provider));
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.promotions.provider.toast.error.load"));
				close();
			} finally {
				isLoading.value = false;
				focusStep();
			}
		});
		async function submit() {
			if (isSaveDisabled.value) return;
			const existing = current.value;
			isSubmitting.value = true;
			saveError.value = void 0;
			try {
				if (existing) {
					const payload = buildProviderUpdatePayload(form, existing);
					const updated = await updatePromotionProvider(rootStore.publicApiContext, existing.id, payload);
					const rotatedKey = "publicKey" in updated.config && updated.config.publicKey !== storedPublicKey.value ? updated.config.publicKey : null;
					current.value = updated;
					toast.showMessage({
						title: i18n.baseText("settings.promotions.provider.toast.updated"),
						type: "success"
					});
					emit("saved", {
						id: updated.id,
						hostChanged: payload.config !== void 0,
						credentialsChanged: payload.auth !== void 0
					});
					if (rotatedKey) {
						generatedPublicKey.value = rotatedKey;
						step.value = "key";
						focusStep();
					} else close();
				} else {
					const created = await createPromotionProvider(rootStore.publicApiContext, buildProviderCreatePayload(form));
					toast.showMessage({
						title: i18n.baseText("settings.promotions.provider.toast.created"),
						type: "success"
					});
					emit("saved", {
						id: created.provider.id,
						hostChanged: false,
						credentialsChanged: false
					});
					if (created.publicKey) {
						generatedPublicKey.value = created.publicKey;
						step.value = "key";
						focusStep();
					} else close();
				}
			} catch (error) {
				saveError.value = error instanceof Error ? error.message : i18n.baseText("settings.promotions.provider.toast.error.save");
			} finally {
				isSubmitting.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				"aria-description": ariaDescription.value,
				"data-test-id": "promotion-provider-dialog",
				onOpenAutoFocus,
				"onUpdate:open": onOpenChange
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
					default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(title.value), 1)]),
						_: 1
					})]),
					_: 1
				}), step.value === "key" && generatedPublicKey.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.form),
						"data-test-id": "promotion-provider-key-step"
					}, [createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("settings.promotions.provider.publicKey.label") }, {
						default: withCtx(() => [createVNode(unref(CopyInput_default), {
							value: generatedPublicKey.value,
							label: unref(i18n).baseText("settings.promotions.provider.publicKey.label"),
							"copy-label": unref(i18n).baseText("settings.promotions.provider.publicKey.copy"),
							"copied-label": unref(i18n).baseText("generic.copiedToClipboard"),
							"data-test-id": "promotion-provider-public-key"
						}, null, 8, [
							"value",
							"label",
							"copy-label",
							"copied-label"
						]), createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.hint),
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.provider.publicKey.hint")), 1)]),
							_: 1
						}, 8, ["class"])]),
						_: 1
					}, 8, ["label"])], 2)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						ref_key: "doneButton",
						ref: doneButton,
						"data-test-id": "promotion-provider-done-button",
						onClick: close
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isEdit.value ? "generic.close" : "settings.promotions.provider.dialog.continue")), 1)]),
						_: 1
					}, 512)]),
					_: 1
				})], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("form", {
						id: "promotion-provider-form",
						class: normalizeClass(_ctx.$style.form),
						"data-test-id": "promotion-provider-form-step",
						onSubmit: withModifiers(submit, ["prevent"])
					}, [
						isEdit.value && isInUse.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
							key: 0,
							theme: "warning",
							"data-test-id": "promotion-provider-in-use"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.provider.inUse.warning")) + " " + toDisplayString(unref(i18n).baseText("settings.promotions.provider.inUse.connections", { interpolate: { names: usedByNames.value } })), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						createVNode(unref(N8nInputLabel_default), {
							"input-name": "promotion-provider-name",
							label: unref(i18n).baseText("settings.promotions.provider.form.name")
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "promotion-provider-name",
								ref_key: "nameInput",
								ref: nameInput,
								modelValue: form.name,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => form.name = $event),
								"aria-required": "true",
								disabled: isLoading.value || isSubmitting.value,
								"data-test-id": "promotion-provider-name-input"
							}, null, 8, ["modelValue", "disabled"])]),
							_: 1
						}, 8, ["label"]),
						capabilities.value.hasHostApi ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
							key: 1,
							"input-name": "promotion-provider-base-url",
							label: unref(i18n).baseText("settings.promotions.provider.form.baseUrl")
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "promotion-provider-base-url",
								modelValue: form.baseUrl,
								"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.baseUrl = $event),
								"aria-required": "true",
								placeholder: unref(i18n).baseText("settings.promotions.provider.form.baseUrl.placeholder"),
								disabled: isLoading.value || isSubmitting.value,
								"data-test-id": "promotion-provider-base-url-input"
							}, null, 8, [
								"modelValue",
								"placeholder",
								"disabled"
							])]),
							_: 1
						}, 8, ["label"])) : createCommentVNode("", true),
						capabilities.value.authTypes.length > 1 ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
							key: 2,
							"input-name": "promotion-provider-auth-type",
							label: unref(i18n).baseText("settings.promotions.provider.form.authType"),
							"tooltip-text": isEdit.value ? unref(i18n).baseText("settings.promotions.provider.form.authType.locked") : void 0
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								id: "promotion-provider-auth-type",
								modelValue: form.authType,
								"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => form.authType = $event),
								teleported: false,
								disabled: isLoading.value || isSubmitting.value || isEdit.value,
								"data-test-id": "promotion-provider-auth-type-select"
							}, {
								default: withCtx(() => [createVNode(unref(N8nOption_default), {
									value: "ssh-key",
									label: unref(i18n).baseText("settings.promotions.providers.authType.sshKey")
								}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
									value: "token",
									label: unref(i18n).baseText("settings.promotions.providers.authType.token")
								}, null, 8, ["label"])]),
								_: 1
							}, 8, ["modelValue", "disabled"])]),
							_: 1
						}, 8, ["label", "tooltip-text"])) : createCommentVNode("", true),
						form.authType === "ssh-key" ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
							!isEdit.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
								key: 0,
								"input-name": "promotion-provider-key-type",
								label: unref(i18n).baseText("settings.promotions.provider.form.keyType")
							}, {
								default: withCtx(() => [createVNode(unref(N8nSelect_default), {
									id: "promotion-provider-key-type",
									modelValue: form.keyType,
									"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.keyType = $event),
									teleported: false,
									disabled: isLoading.value || isSubmitting.value,
									"data-test-id": "promotion-provider-key-type-select"
								}, {
									default: withCtx(() => [createVNode(unref(N8nOption_default), {
										value: "ed25519",
										label: "ED25519"
									}), createVNode(unref(N8nOption_default), {
										value: "rsa",
										label: "RSA"
									})]),
									_: 1
								}, 8, ["modelValue", "disabled"])]),
								_: 1
							}, 8, ["label"])) : createCommentVNode("", true),
							storedPublicKey.value ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
								key: 1,
								label: unref(i18n).baseText("settings.promotions.provider.publicKey.label")
							}, {
								default: withCtx(() => [createVNode(unref(CopyInput_default), {
									value: storedPublicKey.value,
									label: unref(i18n).baseText("settings.promotions.provider.publicKey.label"),
									"copy-label": unref(i18n).baseText("settings.promotions.provider.publicKey.copy"),
									"copied-label": unref(i18n).baseText("generic.copiedToClipboard"),
									"data-test-id": "promotion-provider-public-key"
								}, null, 8, [
									"value",
									"label",
									"copy-label",
									"copied-label"
								])]),
								_: 1
							}, 8, ["label"])) : createCommentVNode("", true),
							isEdit.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(Checkbox_default), {
								modelValue: form.regenerateKey,
								"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.regenerateKey = $event),
								label: unref(i18n).baseText("settings.promotions.provider.regenerateKey"),
								disabled: isLoading.value || isSubmitting.value,
								"data-test-id": "promotion-provider-regenerate-key"
							}, null, 8, [
								"modelValue",
								"label",
								"disabled"
							]), form.regenerateKey ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.provider.regenerateKey.hint")), 1)]),
								_: 1
							})) : createCommentVNode("", true)])) : createCommentVNode("", true)
						], 64)) : (openBlock(), createElementBlock(Fragment, { key: 4 }, [
							!capabilities.value.tokenUsername ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
								key: 0,
								"input-name": "promotion-provider-username",
								label: unref(i18n).baseText("settings.promotions.provider.form.username")
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									id: "promotion-provider-username",
									modelValue: form.username,
									"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => form.username = $event),
									"aria-required": !isEdit.value,
									disabled: isLoading.value || isSubmitting.value,
									"data-test-id": "promotion-provider-username-input"
								}, null, 8, [
									"modelValue",
									"aria-required",
									"disabled"
								])]),
								_: 1
							}, 8, ["label"])) : createCommentVNode("", true),
							createVNode(unref(N8nInputLabel_default), {
								"input-name": "promotion-provider-password",
								label: unref(i18n).baseText(capabilities.value.hasHostApi ? "settings.promotions.provider.form.accessToken" : "settings.promotions.provider.form.password")
							}, {
								default: withCtx(() => [createVNode(unref(Input_default), {
									id: "promotion-provider-password",
									modelValue: form.password,
									"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => form.password = $event),
									"aria-required": !isEdit.value || hasHostUrlChange.value,
									type: "password",
									autocomplete: "new-password",
									placeholder: isEdit.value && !hasHostUrlChange.value ? "••••••••" : void 0,
									disabled: isLoading.value || isSubmitting.value,
									"data-test-id": "promotion-provider-password-input"
								}, null, 8, [
									"modelValue",
									"aria-required",
									"placeholder",
									"disabled"
								])]),
								_: 1
							}, 8, ["label"]),
							!capabilities.value.tokenUsername && hasUsername.value !== hasPassword.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "danger"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.provider.form.credentials.required")), 1)]),
								_: 1
							})) : createCommentVNode("", true),
							isEdit.value && (!capabilities.value.hasHostApi || hasHostUrlChange.value) ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 2,
								size: "small",
								color: capabilities.value.hasHostApi ? "text-base" : "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(capabilities.value.hasHostApi ? "settings.promotions.provider.form.accessToken.urlChangeHint" : "settings.promotions.provider.form.credentials.keepHint")), 1)]),
								_: 1
							}, 8, ["color"])) : createCommentVNode("", true),
							capabilities.value.hasHostApi ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 3,
								size: "small",
								color: "text-base"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.provider.form.accessToken.hint")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 64)),
						saveError.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
							key: 5,
							theme: "danger",
							role: "alert",
							"data-test-id": "promotion-provider-save-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(saveError.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 34)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						type: "button",
						variant: "outline",
						disabled: isSubmitting.value,
						"data-test-id": "promotion-provider-cancel-button",
						onClick: close
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
						_: 1
					}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
						type: "submit",
						form: "promotion-provider-form",
						disabled: isSaveDisabled.value,
						loading: isSubmitting.value,
						"data-test-id": "promotion-provider-save-button"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isEdit.value ? "generic.save" : "settings.promotions.provider.dialog.continue")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"])]),
					_: 1
				})], 64))]),
				_: 1
			}, 8, ["open", "aria-description"]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_paa8d_1",
	hint: "_hint_paa8d_7"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/views/PromotionEnvironmentView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var PromotionEnvironmentView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionEnvironmentView",
	props: {
		direction: {},
		environmentId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const message = useMessage();
		const router = useRouter();
		const rootStore = useRootStore();
		const documentTitle = useDocumentTitle({ releaseChannel: useSettingsStore().settings.releaseChannel });
		const { canConnect, connect } = usePromotionCheckout();
		const overview = { name: PROMOTIONS_SETTINGS_VIEW };
		const isLoading = ref(true);
		const step = ref(props.environmentId ? "settings" : "provider");
		const loaded = ref();
		const otherEnvironment = ref();
		const pickedType = ref();
		const sharedProvider = ref();
		const createdProviderId = ref();
		const dialogOpen = ref(false);
		const discoveryRevision = ref(0);
		const isSaving = ref(false);
		let isSaved = false;
		const form = reactive({
			name: "",
			remoteUrl: "",
			branch: "main",
			createBranchOnPromotion: false
		});
		const direction = computed(() => loaded.value?.direction ?? props.direction);
		const pageTitle = computed(() => loaded.value ? i18n.baseText("settings.promotions.environment.edit.title", { interpolate: { name: loaded.value.name } }) : i18n.baseText("settings.promotions.environments.add"));
		watch(pageTitle, (title) => documentTitle.set(title), { immediate: true });
		const providerId = computed(() => sharedProvider.value?.id ?? createdProviderId.value);
		const providerType = computed(() => sharedProvider.value?.type ?? pickedType.value);
		const hasHostApi = computed(() => !!providerType.value && isPromotionGitHostType(providerType.value));
		const createBranchLabelKey = computed(() => hasHostApi.value ? "settings.promotions.environment.form.createBranch.gitlab" : "settings.promotions.environment.form.createBranch.git");
		const needsRepositorySelection = computed(() => hasHostApi.value && !!form.remoteUrl && !form.repositoryPath);
		const canSave = computed(() => !!form.name.trim() && !!form.remoteUrl.trim() && !!form.branch.trim() && !(hasHostApi.value && !form.repositoryPath));
		onMounted(async () => {
			const context = rootStore.publicApiContext;
			try {
				if (props.environmentId) {
					const environment = await fetchPromotionEnvironment(context, props.environmentId);
					loaded.value = environment;
					sharedProvider.value = environment.provider;
					Object.assign(form, {
						name: environment.name,
						remoteUrl: environment.remote.remoteUrl,
						repositoryPath: environment.remote.repositoryPath,
						branch: promotionEnvironmentBranch(environment),
						createBranchOnPromotion: environment.direction === "promote" && environment.settings.createBranchOnPromotion
					});
				} else {
					const environments = await fetchPromotionEnvironments(context, { scope: "instance" });
					if (environments.some((environment) => environment.direction === props.direction)) {
						await router.replace(overview);
						return;
					}
					otherEnvironment.value = environments[0];
				}
				isLoading.value = false;
			} catch (error) {
				toast.showError(error, i18n.baseText(props.environmentId ? "settings.promotions.environment.toast.error.load" : "settings.promotions.environments.error.title"));
				await router.replace(overview);
			}
		});
		function showSettings() {
			step.value = "settings";
		}
		function pickType(type) {
			pickedType.value = type;
			const other = otherEnvironment.value;
			if (other?.provider.type !== type) {
				dialogOpen.value = true;
				return;
			}
			sharedProvider.value = other.provider;
			if (!isPromotionGitHostType(type)) form.remoteUrl = other.remote.remoteUrl;
			showSettings();
		}
		function onProviderSaved(change) {
			if (!loaded.value) {
				createdProviderId.value = change.id;
				return;
			}
			if (change.hostChanged) {
				form.remoteUrl = loaded.value.remote.remoteUrl;
				form.repositoryPath = loaded.value.remote.repositoryPath;
			}
			if (change.hostChanged || change.credentialsChanged) discoveryRevision.value++;
		}
		function onDialogOpenChange(open) {
			dialogOpen.value = open;
			if (!open && step.value === "provider" && createdProviderId.value) showSettings();
		}
		function selectRepository(repository) {
			const isSameRepository = repository.fullPath === form.repositoryPath || repository.remoteUrl === form.remoteUrl;
			form.remoteUrl = repository.remoteUrl;
			form.repositoryPath = repository.fullPath;
			if (!isSameRepository) form.branch = repository.defaultBranch ?? "";
		}
		const changesReviewRepository = (current) => current.direction === "promote" && hasHostApi.value && form.repositoryPath?.toLowerCase() !== current.remote.repositoryPath?.toLowerCase();
		async function confirmRepositoryChange(name) {
			return await message.confirm(i18n.baseText("settings.promotions.environment.changeRepository.confirm.message", { interpolate: { name } }), i18n.baseText("settings.promotions.environment.changeRepository.confirm.title"), {
				confirmButtonText: i18n.baseText("settings.promotions.environment.changeRepository.confirm.button"),
				cancelButtonText: i18n.baseText("generic.cancel"),
				customClass: "el-message-box--destructive",
				showClose: true
			}) === "confirm";
		}
		async function save() {
			const selectedProviderId = providerId.value;
			const selectedDirection = direction.value;
			if (!canSave.value || isSaving.value || !selectedProviderId || !selectedDirection) return;
			const context = rootStore.publicApiContext;
			const name = form.name.trim();
			const remote = {
				schemaVersion: 1,
				remoteUrl: form.remoteUrl.trim()
			};
			const current = loaded.value;
			if (current && changesReviewRepository(current) && !await confirmRepositoryChange(current.name)) return;
			const directionFields = promotionEnvironmentDirectionFields(selectedDirection, form.branch.trim(), form.createBranchOnPromotion);
			let saved;
			let connected = true;
			isSaving.value = true;
			try {
				if (current) {
					const remoteChanged = remote.remoteUrl !== current.remote.remoteUrl || form.repositoryPath !== current.remote.repositoryPath;
					saved = await updatePromotionEnvironment(context, current.id, {
						name,
						settings: directionFields.settings,
						...remoteChanged && { remote }
					});
				} else saved = await createPromotionEnvironment(context, {
					name,
					scope: "instance",
					providerId: selectedProviderId,
					remote,
					...directionFields
				});
				isSaved = true;
				invalidateInstancePromotionConnection();
				if (canConnect.value && !saved.checkout.matchesEnvironment) connected = await connect(saved.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.promotions.environment.toast.error.save"));
				return;
			} finally {
				isSaving.value = false;
			}
			if (connected) toast.showMessage({
				title: i18n.baseText(current ? "settings.promotions.environment.toast.saved" : "settings.promotions.environment.toast.added", { interpolate: { name: saved.name } }),
				type: "success"
			});
			await router.replace(overview);
		}
		useEventListener(window, "beforeunload", (event) => {
			if (createdProviderId.value && !isSaved) event.preventDefault();
		});
		onBeforeRouteLeave(() => {
			if (isSaving.value) return false;
			if (createdProviderId.value && !isSaved) deleteProviderIfUnused(rootStore.publicApiContext, createdProviderId.value).catch((error) => toast.showError(error, i18n.baseText("settings.promotions.provider.toast.error.delete")));
			return true;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				class: normalizeClass(_ctx.$style.layout),
				"show-back": "",
				"back-label": unref(i18n).baseText("settings.promotions.environment.back"),
				onBack: _cache[8] || (_cache[8] = ($event) => unref(router).push(overview))
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: pageTitle.value,
						description: direction.value ? unref(i18n).baseText(`settings.promotions.environment.${direction.value}.description`) : "",
						"docs-url": unref(ENVIRONMENTS_PLAN_DOCS_URL)
					}, null, 8, [
						"title",
						"description",
						"docs-url"
					]),
					isLoading.value ? (openBlock(), createBlock(unref(Loading_default), {
						key: 0,
						rows: 3,
						"shrink-last": false
					})) : step.value === "provider" ? (openBlock(), createBlock(unref(SettingsSection_default), {
						key: 1,
						title: unref(i18n).baseText("settings.promotions.environment.provider.title")
					}, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(promotionProviderTypeSchema).options, (type) => {
								return openBlock(), createBlock(unref(SettingsRow_default), {
									key: type,
									clickable: "",
									title: unref(i18n).baseText(`settings.promotions.providers.type.${type}`),
									description: unref(i18n).baseText(`settings.promotions.environment.provider.${type}.description`),
									"data-test-id": `promotion-provider-type-${type}`,
									onClick: ($event) => pickType(type)
								}, {
									visual: withCtx(() => [createVNode(unref(N8nIcon_default), {
										icon: unref(promotionProviderIcon)[type],
										color: "text-dark",
										size: "xlarge"
									}, null, 8, ["icon"])]),
									action: withCtx(() => [createVNode(unref(N8nIcon_default), {
										icon: "chevron-right",
										color: "text-light",
										size: "small"
									})]),
									_: 2
								}, 1032, [
									"title",
									"description",
									"data-test-id",
									"onClick"
								]);
							}), 128))]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: _cache[0] || (_cache[0] = ($event) => unref(router).push(overview))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						})], 2)]),
						_: 1
					}, 8, ["title"])) : (openBlock(), createBlock(unref(SettingsSection_default), {
						key: 2,
						title: unref(i18n).baseText("settings.promotions.environment.settings.title")
					}, {
						default: withCtx(() => [createBaseVNode("form", {
							class: normalizeClass(_ctx.$style.settings),
							onSubmit: withModifiers(save, ["prevent"])
						}, [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), { layout: "custom" }, {
								default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.fields) }, [
									createVNode(unref(N8nFormInput_default), {
										modelValue: form.name,
										"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => form.name = $event),
										name: "promotion-environment-name",
										label: unref(i18n).baseText("settings.promotions.environment.form.name"),
										required: "",
										"show-required-asterisk": false,
										"focus-initially": !loaded.value,
										disabled: isSaving.value,
										"data-test-id": "promotion-environment-name-input",
										onEnter: save
									}, null, 8, [
										"modelValue",
										"label",
										"focus-initially",
										"disabled"
									]),
									sharedProvider.value ? (openBlock(), createBlock(unref(N8nFormInput_default), {
										key: 0,
										"model-value": sharedProvider.value.id,
										label: unref(i18n).baseText("settings.promotions.environment.form.provider"),
										"info-text": unref(i18n).baseText(loaded.value ? "settings.promotions.environment.form.provider.locked" : "settings.promotions.environment.form.provider.reused")
									}, {
										default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.provider) }, [createBaseVNode("div", {
											class: normalizeClass(_ctx.$style.providerValue),
											"data-test-id": "promotion-environment-provider"
										}, [createVNode(unref(N8nIcon_default), {
											icon: unref(promotionProviderIcon)[sharedProvider.value.type],
											color: "text-dark"
										}, null, 8, ["icon"]), createVNode(unref(N8nText_default), { color: "text-dark" }, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.environment.form.provider.value", { interpolate: {
												type: unref(i18n).baseText(`settings.promotions.providers.type.${sharedProvider.value.type}`),
												name: sharedProvider.value.name
											} })), 1)]),
											_: 1
										})], 2), loaded.value ? (openBlock(), createBlock(unref(N8nButton_default), {
											key: 0,
											type: "button",
											variant: "outline",
											disabled: isSaving.value,
											"data-test-id": "promotion-environment-edit-credentials",
											onClick: _cache[2] || (_cache[2] = ($event) => dialogOpen.value = true)
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.environment.editProvider")), 1)]),
											_: 1
										}, 8, ["disabled"])) : createCommentVNode("", true)], 2)]),
										_: 1
									}, 8, [
										"model-value",
										"label",
										"info-text"
									])) : createCommentVNode("", true),
									hasHostApi.value && providerId.value ? (openBlock(), createBlock(unref(N8nFormInput_default), {
										key: 1,
										"model-value": form.remoteUrl,
										name: "promotion-environment-repository",
										label: unref(i18n).baseText("settings.promotions.discovery.repository.label"),
										required: "",
										"show-required-asterisk": false,
										"info-text": needsRepositorySelection.value ? unref(i18n).baseText("settings.promotions.discovery.repository.selectAgain") : void 0
									}, {
										default: withCtx(() => [createVNode(PromotionGitHostSelect_default, {
											"model-value": form.remoteUrl,
											"selected-label": form.repositoryPath,
											kind: "repository",
											"input-id": "promotion-environment-repository",
											"provider-id": providerId.value,
											revision: discoveryRevision.value,
											disabled: isSaving.value,
											"data-test-id": "promotion-environment-repository-select",
											onSelected: selectRepository
										}, null, 8, [
											"model-value",
											"selected-label",
											"provider-id",
											"revision",
											"disabled"
										])]),
										_: 1
									}, 8, [
										"model-value",
										"label",
										"info-text"
									])) : (openBlock(), createBlock(unref(N8nFormInput_default), {
										key: 2,
										modelValue: form.remoteUrl,
										"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => form.remoteUrl = $event),
										name: "promotion-environment-remote-url",
										label: unref(i18n).baseText("settings.promotions.environment.form.remoteUrl"),
										"info-text": unref(i18n).baseText("settings.promotions.environment.form.remoteUrl.hint"),
										required: "",
										"show-required-asterisk": false,
										disabled: isSaving.value,
										"data-test-id": "promotion-environment-remote-url-input",
										onEnter: save
									}, null, 8, [
										"modelValue",
										"label",
										"info-text",
										"disabled"
									])),
									hasHostApi.value && providerId.value ? (openBlock(), createBlock(unref(N8nFormInput_default), {
										key: 3,
										"model-value": form.branch,
										name: "promotion-environment-branch",
										label: unref(i18n).baseText("settings.promotions.environment.form.branch"),
										required: "",
										"show-required-asterisk": false
									}, {
										default: withCtx(() => [createVNode(PromotionGitHostSelect_default, {
											modelValue: form.branch,
											"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => form.branch = $event),
											kind: "branch",
											"input-id": "promotion-environment-branch",
											"provider-id": providerId.value,
											"repository-id": form.repositoryPath,
											revision: discoveryRevision.value,
											disabled: isSaving.value,
											"data-test-id": "promotion-environment-branch-select"
										}, null, 8, [
											"modelValue",
											"provider-id",
											"repository-id",
											"revision",
											"disabled"
										])]),
										_: 1
									}, 8, ["model-value", "label"])) : (openBlock(), createBlock(unref(N8nFormInput_default), {
										key: 4,
										modelValue: form.branch,
										"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => form.branch = $event),
										name: "promotion-environment-branch",
										label: unref(i18n).baseText("settings.promotions.environment.form.branch"),
										required: "",
										"show-required-asterisk": false,
										disabled: isSaving.value,
										"data-test-id": "promotion-environment-branch-input",
										onEnter: save
									}, null, 8, [
										"modelValue",
										"label",
										"disabled"
									])),
									direction.value === "promote" ? (openBlock(), createBlock(unref(Checkbox_default), {
										key: 5,
										modelValue: form.createBranchOnPromotion,
										"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => form.createBranchOnPromotion = $event),
										disabled: isSaving.value,
										"data-test-id": "promotion-environment-create-branch"
									}, {
										label: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(createBranchLabelKey.value)) + " ", 1), createVNode(unref(N8nText_default), {
											class: normalizeClass(_ctx.$style.hint),
											size: "small",
											color: "text-light"
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`${createBranchLabelKey.value}.description`)), 1)]),
											_: 1
										}, 8, ["class"])]),
										_: 1
									}, 8, ["modelValue", "disabled"])) : createCommentVNode("", true)
								], 2)]),
								_: 1
							})]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
							type: "button",
							variant: "outline",
							disabled: isSaving.value,
							"data-test-id": "promotion-environment-cancel",
							onClick: _cache[7] || (_cache[7] = ($event) => unref(router).push(overview))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							disabled: !canSave.value,
							loading: isSaving.value,
							"data-test-id": "promotion-environment-save"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(loaded.value ? "generic.save" : "settings.promotions.environments.add")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])], 2)], 34)]),
						_: 1
					}, 8, ["title"])),
					dialogOpen.value ? (openBlock(), createBlock(PromotionProviderDialog_default, {
						key: 3,
						open: dialogOpen.value,
						type: pickedType.value,
						"provider-id": loaded.value ? providerId.value : void 0,
						"onUpdate:open": onDialogOpenChange,
						onSaved: onProviderSaved
					}, null, 8, [
						"open",
						"type",
						"provider-id"
					])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["class", "back-label"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_19g8y_1",
	settings: "_settings_19g8y_13",
	fields: "_fields_19g8y_19",
	provider: "_provider_19g8y_25",
	providerValue: "_providerValue_19g8y_31",
	hint: "_hint_19g8y_43",
	footer: "_footer_19g8y_49"
} }]]);
//#endregion
export { PromotionEnvironmentView_default as default };
