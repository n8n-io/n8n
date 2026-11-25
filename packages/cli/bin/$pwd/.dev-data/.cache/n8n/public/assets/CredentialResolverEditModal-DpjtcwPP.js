import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, $b as CREDENTIAL_RESOLVER_EDIT_MODAL_KEY, Ik as deepCopy, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, Yj as N8nMenuItem_default, _N as N8nText_default, bC as useRootStore, dC as useToast, hw as getCredentialResolver, jM as createEventBus, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, pw as createCredentialResolver, uk as displayParameterPath, vN as N8nIconButton_default, yw as updateCredentialResolver } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as CredentialInputs_default } from "./CredentialInputs-DxL-Pnkh.js";
import { t as SaveButton_default } from "./SaveButton-B2zcJp0p.js";
import { t as useCredentialResolvers } from "./useCredentialResolvers-fevamwxP.js";
//#region src/features/resolvers/components/CredentialResolverEditModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CredentialResolverEditModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialResolverEditModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const modalBus = createEventBus();
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const activeTab = ref("configuration");
		const isLoading = ref(false);
		const isSaving = ref(false);
		const resolverName = ref("");
		const resolverType = ref("");
		const resolverConfig = ref({});
		const clearCredentials = ref(null);
		const hasUnsavedChanges = ref(false);
		const errorMessage = ref("");
		const mainContentRef = ref();
		const originalResolverName = ref("");
		const originalResolverType = ref("");
		const originalResolverConfig = ref({});
		const hasEverMadeNonNameChange = ref(false);
		const { resolverTypes: availableTypes, fetchResolverTypes: loadResolverTypes, deleteResolver: deleteResolverFromComposable, isDeleting } = useCredentialResolvers();
		const isEditMode = computed(() => !!props.data?.resolverId);
		const isCredentialInformation = (value) => {
			if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
			if (Array.isArray(value)) return value.every((v) => typeof v === "string" || typeof v === "object" && v !== null && !Array.isArray(v));
			if (typeof value === "object" && value !== null) return true;
			return false;
		};
		const toCredentialData = (config) => {
			const result = {};
			for (const [key, value] of Object.entries(config)) if (isCredentialInformation(value)) result[key] = value;
			else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") result[key] = String(value);
			return result;
		};
		const selectedType = computed(() => {
			return availableTypes.value.find((t) => t.name === resolverType.value);
		});
		const toNodeProperty = (option) => {
			return {
				...option,
				name: typeof option.name === "string" ? option.name : "",
				type: typeof option.type === "string" ? option.type : "string",
				displayName: typeof option.displayName === "string" ? option.displayName : "",
				default: option.default ?? "",
				...typeof option.required === "boolean" && { required: option.required },
				...typeof option.description === "string" && { description: option.description },
				...typeof option.placeholder === "string" && { placeholder: option.placeholder }
			};
		};
		const resolverProperties = computed(() => {
			if (!selectedType.value?.options) return [];
			return selectedType.value.options.map(toNodeProperty).filter((property) => {
				if (property.type === "hidden") return false;
				if (!property.displayOptions) return true;
				return displayParameterPath(resolverData.value, property, "", null, null);
			});
		});
		const resolverData = computed(() => {
			return toCredentialData(resolverConfig.value);
		});
		const requiredPropertiesFilled = computed(() => {
			for (const property of resolverProperties.value) {
				if (property.required !== true) continue;
				const resolverProperty = resolverData.value[property.name];
				if (property.type === "string" && !resolverProperty) return false;
				if (property.type === "number") {
					const containsExpression = typeof resolverProperty === "string" && resolverProperty.startsWith("=");
					if (typeof resolverProperty !== "number" && !containsExpression) return false;
				}
			}
			return true;
		});
		const hasNonNameChanges = computed(() => {
			if (!isEditMode.value) return false;
			const typeChanged = originalResolverType.value !== resolverType.value;
			const configChanged = JSON.stringify(originalResolverConfig.value) !== JSON.stringify(resolverConfig.value);
			if (typeChanged || configChanged) hasEverMadeNonNameChange.value = true;
			return hasEverMadeNonNameChange.value;
		});
		const canSave = computed(() => {
			const baseCheck = resolverName.value.trim() !== "" && resolverType.value !== "";
			if (isEditMode.value && hasNonNameChanges.value) return baseCheck && clearCredentials.value !== null;
			return baseCheck;
		});
		const sidebarItems = computed(() => [{
			id: "configuration",
			label: i18n.baseText("credentialResolverEdit.sidebar.configuration"),
			position: "top"
		}, {
			id: "details",
			label: i18n.baseText("credentialResolverEdit.sidebar.details"),
			position: "top"
		}]);
		const loadResolver = async () => {
			if (!props.data?.resolverId) return;
			try {
				const resolver = await getCredentialResolver(rootStore.restApiContext, props.data.resolverId);
				resolverName.value = resolver.name;
				resolverType.value = resolver.type;
				resolverConfig.value = resolver.decryptedConfig || {};
				originalResolverName.value = resolver.name;
				originalResolverType.value = resolver.type;
				originalResolverConfig.value = deepCopy(resolver.decryptedConfig || {});
				hasEverMadeNonNameChange.value = false;
				clearCredentials.value = null;
			} catch (error) {
				toast.showError(error, i18n.baseText("credentialResolverEdit.error.save"));
			}
		};
		const beforeClose = () => {
			if (hasUnsavedChanges.value) {}
			return true;
		};
		const save = async () => {
			if (!canSave.value) return;
			isSaving.value = true;
			errorMessage.value = "";
			if (!requiredPropertiesFilled.value) {
				errorMessage.value = i18n.baseText("credentialResolverEdit.error.missingRequiredFields");
				isSaving.value = false;
				return;
			}
			if (isEditMode.value && hasNonNameChanges.value && clearCredentials.value === null) {
				errorMessage.value = i18n.baseText("credentialResolverEdit.clearCredentials.error.required");
				isSaving.value = false;
				return;
			}
			try {
				const payload = {
					name: resolverName.value.trim(),
					type: resolverType.value,
					config: resolverConfig.value
				};
				if (isEditMode.value) {
					if (hasNonNameChanges.value && clearCredentials.value !== null) payload.clearCredentials = clearCredentials.value;
					else if (!hasNonNameChanges.value) payload.clearCredentials = false;
				}
				let savedResolver;
				if (isEditMode.value && props.data?.resolverId) savedResolver = await updateCredentialResolver(rootStore.restApiContext, props.data.resolverId, payload);
				else savedResolver = await createCredentialResolver(rootStore.restApiContext, payload);
				if (props.data?.onSave) props.data.onSave(savedResolver.id);
				toast.showMessage({
					title: i18n.baseText("credentialResolverEdit.saveSuccess.title"),
					type: "success"
				});
				hasUnsavedChanges.value = false;
				modalBus.emit("close");
			} catch (error) {
				errorMessage.value = error instanceof Error ? error.message : i18n.baseText("credentialResolverEdit.error.save");
				mainContentRef.value?.scrollTo({
					top: 0,
					behavior: "smooth"
				});
			} finally {
				isSaving.value = false;
			}
		};
		const onConfigUpdate = (updateData) => {
			resolverConfig.value = {
				...resolverConfig.value,
				[updateData.name]: updateData.value
			};
			hasUnsavedChanges.value = true;
			errorMessage.value = "";
			if (isEditMode.value) clearCredentials.value = null;
		};
		const onNameEdit = (newName) => {
			resolverName.value = newName;
			hasUnsavedChanges.value = true;
		};
		const onTabSelect = (tabId) => {
			activeTab.value = tabId;
		};
		const deleteResolver = async () => {
			if (!props.data?.resolverId) return;
			const resolver = {
				id: props.data.resolverId,
				name: resolverName.value,
				type: resolverType.value,
				config: JSON.stringify(resolverConfig.value),
				createdAt: /* @__PURE__ */ new Date(),
				updatedAt: /* @__PURE__ */ new Date()
			};
			if (await deleteResolverFromComposable(resolver)) {
				hasUnsavedChanges.value = false;
				if (props.data?.onDelete) props.data.onDelete(props.data.resolverId);
				modalBus.emit("close");
			}
		};
		onMounted(async () => {
			isLoading.value = true;
			await loadResolverTypes();
			if (isEditMode.value) await loadResolver();
			else {
				resolverName.value = i18n.baseText("credentialResolverEdit.defaultName");
				clearCredentials.value = null;
			}
			isLoading.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(CREDENTIAL_RESOLVER_EDIT_MODAL_KEY),
				"custom-class": _ctx.$style.resolverModal,
				"event-bus": unref(modalBus),
				loading: isLoading.value,
				"before-close": beforeClose,
				width: "70%",
				height: "80%"
			}, {
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.resolverInfo) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.resolverIcon) }, [createVNode(unref(N8nIconButton_default), {
					variant: "outline",
					icon: "database",
					size: "large",
					disabled: true,
					"aria-label": unref(i18n).baseText("credentialResolverEdit.icon")
				}, null, 8, ["aria-label"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.resolverName) }, [resolverName.value ? (openBlock(), createBlock(unref(N8nInlineTextEdit_default), {
					key: 0,
					"data-test-id": "credential-resolver-name",
					"model-value": resolverName.value,
					"onUpdate:modelValue": onNameEdit
				}, null, 8, ["model-value"])) : createCommentVNode("", true), selectedType.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					tag: "p",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(selectedType.value.displayName), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.resolverActions) }, [isEditMode.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					variant: "outline",
					title: unref(i18n).baseText("credentialResolverEdit.delete"),
					icon: "trash-2",
					disabled: isSaving.value,
					loading: unref(isDeleting),
					"data-test-id": "credential-resolver-delete-button",
					onClick: deleteResolver
				}, null, 8, [
					"title",
					"disabled",
					"loading"
				])) : createCommentVNode("", true), createVNode(SaveButton_default, {
					saved: false,
					"is-saving": isSaving.value,
					disabled: !canSave.value,
					"data-test-id": "credential-resolver-save-button",
					onClick: save
				}, null, 8, ["is-saving", "disabled"])], 2)], 2)]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.container),
					"data-test-id": "credential-resolver-edit-dialog"
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.sidebar) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(sidebarItems.value, (item) => {
						return openBlock(), createBlock(unref(N8nMenuItem_default), {
							key: item.id,
							item,
							active: activeTab.value === item.id,
							onClick: () => onTabSelect(item.id)
						}, null, 8, [
							"item",
							"active",
							"onClick"
						]);
					}), 128))], 2),
					activeTab.value === "configuration" ? (openBlock(), createElementBlock("div", {
						key: 0,
						ref_key: "mainContentRef",
						ref: mainContentRef,
						class: normalizeClass(_ctx.$style.mainContent)
					}, [
						errorMessage.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "danger",
							class: normalizeClass(_ctx.$style.errorAlert),
							"data-test-id": "credential-resolver-error-alert"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(errorMessage.value), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						isEditMode.value && hasNonNameChanges.value ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.formGroup)
						}, [createBaseVNode("label", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(unref(i18n).baseText("credentialResolverEdit.clearCredentials.label")), 3), createVNode(unref(N8nSelect_default), {
							modelValue: clearCredentials.value,
							"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => clearCredentials.value = $event), _cache[1] || (_cache[1] = () => {
								hasUnsavedChanges.value = true;
								errorMessage.value = "";
							})],
							placeholder: unref(i18n).baseText("credentialResolverEdit.clearCredentials.placeholder"),
							"data-test-id": "credential-resolver-clear-credentials-select"
						}, {
							default: withCtx(() => [createVNode(unref(N8nOption_default), {
								label: unref(i18n).baseText("credentialResolverEdit.clearCredentials.yes"),
								value: true
							}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
								label: unref(i18n).baseText("credentialResolverEdit.clearCredentials.no"),
								value: false
							}, null, 8, ["label"])]),
							_: 1
						}, 8, ["modelValue", "placeholder"])], 2)) : createCommentVNode("", true),
						isEditMode.value && hasNonNameChanges.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 2,
							theme: "warning",
							class: normalizeClass(_ctx.$style.warningAlert),
							"data-test-id": "credential-resolver-clear-credentials-warning"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialResolverEdit.clearCredentials.warning")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.formGroup) }, [createBaseVNode("label", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(unref(i18n).baseText("credentialResolverEdit.type.label")), 3), createVNode(unref(N8nSelect_default), {
							modelValue: resolverType.value,
							"onUpdate:modelValue": [_cache[2] || (_cache[2] = ($event) => resolverType.value = $event), _cache[3] || (_cache[3] = () => {
								hasUnsavedChanges.value = true;
								errorMessage.value = "";
								clearCredentials.value = null;
							})],
							placeholder: unref(i18n).baseText("credentialResolverEdit.type.placeholder"),
							"data-test-id": "credential-resolver-type-select"
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(availableTypes), (type) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: type.name,
									label: type.displayName,
									value: type.name
								}, null, 8, ["label", "value"]);
							}), 128))]),
							_: 1
						}, 8, ["modelValue", "placeholder"])], 2),
						resolverProperties.value.length > 0 ? (openBlock(), createElementBlock("div", {
							key: 3,
							class: normalizeClass(_ctx.$style.configSection)
						}, [createVNode(CredentialInputs_default, {
							"credential-properties": resolverProperties.value,
							"credential-data": resolverData.value,
							"documentation-url": "",
							"show-validation-warnings": !!errorMessage.value,
							onUpdate: onConfigUpdate
						}, null, 8, [
							"credential-properties",
							"credential-data",
							"show-validation-warnings"
						])], 2)) : createCommentVNode("", true)
					], 2)) : createCommentVNode("", true),
					activeTab.value === "details" ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.mainContent)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.formGroup) }, [createBaseVNode("label", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(unref(i18n).baseText("credentialResolverEdit.details.id")), 3), props.data?.resolverId ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(props.data.resolverId), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("credentialResolverEdit.details.notSaved")), 1)]),
						_: 1
					}))], 2)], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, [
				"name",
				"custom-class",
				"event-bus",
				"loading"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	resolverModal: "_resolverModal_1uya0_1",
	mainContent: "_mainContent_1uya0_15",
	resolverName: "_resolverName_1uya0_22",
	sidebar: "_sidebar_1uya0_29",
	header: "_header_1uya0_39",
	container: "_container_1uya0_43",
	resolverInfo: "_resolverInfo_1uya0_48",
	resolverActions: "_resolverActions_1uya0_56",
	resolverIcon: "_resolverIcon_1uya0_67",
	formGroup: "_formGroup_1uya0_73",
	label: "_label_1uya0_80",
	configSection: "_configSection_1uya0_86",
	errorAlert: "_errorAlert_1uya0_90",
	warningAlert: "_warningAlert_1uya0_94"
} }]]);
//#endregion
export { CredentialResolverEditModal_default as default };
