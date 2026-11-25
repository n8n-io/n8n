import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, nf as mergeModels, wr as require_sortBy, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Zf as useRolesStore, cN as Input_default, dC as useToast, fN as N8nTooltip_default, jN as useI18n, uM as N8nFormInput_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/roles/components/RoleEditorLayout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var RoleEditorLayout_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RoleEditorLayout",
	props: /*@__PURE__*/ mergeModels({
		isNew: { type: Boolean },
		isReadOnly: { type: Boolean },
		showEditButtons: { type: Boolean },
		showCreateButton: { type: Boolean },
		hasUnsavedChanges: { type: Boolean },
		backButtonText: {},
		labels: {},
		displayNameValidationRules: {},
		showDisplayNameError: { type: Boolean }
	}, {
		"displayName": { required: true },
		"displayNameModifiers": {},
		"description": {},
		"descriptionModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"back",
		"save",
		"discard",
		"create"
	], ["update:displayName", "update:description"]),
	setup(__props, { emit: __emit }) {
		const displayName = useModel(__props, "displayName");
		const description = useModel(__props, "description");
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(["pb-xl", _ctx.$style.container]) }, [
				createVNode(unref(N8nButton_default), {
					variant: "ghost",
					icon: "arrow-left",
					class: normalizeClass(_ctx.$style.backButton),
					text: "",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("back"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.backButtonText), 1)]),
					_: 1
				}, 8, ["class"]),
				createBaseVNode("div", { class: normalizeClass(["mb-xl", _ctx.$style.headerContainer]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headingContainer) }, [createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "2xlarge",
					class: normalizeClass(_ctx.$style.heading)
				}, {
					default: withCtx(() => [!__props.isNew ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
						_cache[10] || (_cache[10] = createTextVNode("Role \"", -1)),
						createVNode(unref(N8nTooltip_default), {
							content: displayName.value,
							placement: "bottom"
						}, {
							default: withCtx(() => [createBaseVNode("span", null, toDisplayString(displayName.value), 1)]),
							_: 1
						}, 8, ["content"]),
						_cache[11] || (_cache[11] = createTextVNode("\"", -1))
					], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(__props.labels.newRoleTitle), 1)], 64))]),
					_: 1
				}, 8, ["class"])], 2), __props.showEditButtons ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.headerActions)
				}, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					disabled: !__props.hasUnsavedChanges,
					onClick: _cache[1] || (_cache[1] = ($event) => emit("discard"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.labels.discardChanges), 1)]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
					disabled: !__props.hasUnsavedChanges,
					onClick: _cache[2] || (_cache[2] = ($event) => emit("save"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.labels.save), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)) : __props.showCreateButton ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					onClick: _cache[3] || (_cache[3] = ($event) => emit("create"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.labels.create), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(["mb-l", _ctx.$style.formContainer]) }, [__props.isReadOnly ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nFormInput_default), {
					modelValue: displayName.value,
					"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => displayName.value = $event),
					label: __props.labels.roleName,
					class: "mb-s",
					"show-required-asterisk": "",
					required: ""
				}, {
					default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
						content: __props.labels.systemRoleNotEditable,
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							modelValue: displayName.value,
							"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => displayName.value = $event),
							maxlength: 100,
							disabled: ""
						}, null, 8, ["modelValue"])]),
						_: 1
					}, 8, ["content"])]),
					_: 1
				}, 8, ["modelValue", "label"]), createVNode(unref(N8nFormInput_default), {
					modelValue: description.value,
					"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => description.value = $event),
					label: __props.labels.description
				}, {
					default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
						content: __props.labels.systemRoleNotEditable,
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							modelValue: description.value,
							"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => description.value = $event),
							type: "textarea",
							placeholder: __props.labels.optional,
							maxlength: 500,
							autosize: {
								minRows: 2,
								maxRows: 4
							},
							disabled: ""
						}, null, 8, ["modelValue", "placeholder"])]),
						_: 1
					}, 8, ["content"])]),
					_: 1
				}, 8, ["modelValue", "label"])], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nFormInput_default), {
					modelValue: displayName.value,
					"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => displayName.value = $event),
					label: __props.labels.roleName,
					"validate-on-blur": "",
					"validation-rules": __props.displayNameValidationRules,
					"show-validation-warnings": __props.showDisplayNameError,
					class: "mb-s",
					"show-required-asterisk": "",
					required: "",
					maxlength: 100
				}, null, 8, [
					"modelValue",
					"label",
					"validation-rules",
					"show-validation-warnings"
				]), createVNode(unref(N8nFormInput_default), {
					modelValue: description.value,
					"onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => description.value = $event),
					label: __props.labels.description,
					placeholder: __props.labels.optional,
					type: "textarea",
					maxlength: 500,
					autosize: {
						minRows: 2,
						maxRows: 4
					}
				}, null, 8, [
					"modelValue",
					"label",
					"placeholder"
				])], 64))], 2),
				renderSlot(_ctx.$slots, "default")
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1xdqa_2",
	backButton: "_backButton_1xdqa_9",
	headerContainer: "_headerContainer_1xdqa_15",
	headingContainer: "_headingContainer_1xdqa_22",
	heading: "_heading_1xdqa_22",
	headerActions: "_headerActions_1xdqa_32",
	formContainer: "_formContainer_1xdqa_38"
} }]]);
//#endregion
//#region src/features/roles/composables/useRoleEditorForm.ts
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var import_sortBy = /* @__PURE__ */ __toESM(require_sortBy(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var DISPLAY_NAME_MIN_LENGTH = 2;
function useRoleEditorForm({ roleSlug, viewRoute, defaultScopes, filterScopes, ensureScopes, fetchError }) {
	const rolesStore = useRolesStore();
	const route = useRoute();
	const router = useRouter();
	const { showError, showMessage } = useToast();
	const i18n = useI18n();
	const activeTab = ref(route.query?.tab ?? "permissions");
	watch(activeTab, (newTab) => {
		router.replace({ query: {
			...route.query,
			tab: newTab
		} });
	});
	const tabOptions = computed(() => [{
		label: i18n.baseText("projectRoles.tab.permissions"),
		value: "permissions"
	}, {
		label: i18n.baseText("projectRoles.tab.assignments"),
		value: "assignments"
	}]);
	const sanitizeScopes = (scopes) => filterScopes ? filterScopes(scopes) : scopes;
	const formScopes = (scopes) => ensureScopes ? ensureScopes(sanitizeScopes(scopes)) : sanitizeScopes(scopes);
	const defaultForm = () => ({
		displayName: "",
		description: "",
		scopes: formScopes(defaultScopes?.() ?? [])
	});
	const initialState = ref();
	const formFromRole = (role) => ({
		displayName: role.displayName,
		description: role.description,
		scopes: formScopes(role.scopes)
	});
	const snapshotRole = (role) => {
		initialState.value = structuredClone({
			...toRaw(role),
			scopes: sanitizeScopes(role.scopes)
		});
	};
	const cachedRole = (slug) => Object.values(rolesStore.roles).flat().find((role) => role.slug === slug);
	const initialForm = () => {
		const slug = roleSlug();
		const role = slug ? cachedRole(slug) : void 0;
		if (!role) return defaultForm();
		snapshotRole(role);
		return formFromRole(role);
	};
	const { state: form, isLoading } = useAsyncState(async () => {
		const slug = roleSlug();
		if (!slug) return defaultForm();
		try {
			const role = await rolesStore.fetchRoleBySlug({ slug });
			snapshotRole(role);
			return formFromRole(role);
		} catch (error) {
			showError(error, fetchError);
			initialState.value = void 0;
			return defaultForm();
		}
	}, initialForm(), { shallow: false });
	const isReadOnly = computed(() => initialState.value?.systemRole === true || route.name === viewRoute);
	const isNew = computed(() => !roleSlug());
	const showEditButtons = computed(() => Boolean(initialState.value) && !isReadOnly.value && !isLoading.value);
	const showCreateButton = computed(() => isNew.value);
	const hasUnsavedChanges = computed(() => {
		if (!initialState.value) return false;
		if (!(0, import_isEqual.default)(initialState.value.displayName, form.value.displayName)) return true;
		if (!(0, import_isEqual.default)(initialState.value.description ?? null, form.value.description || null)) return true;
		if (!(0, import_isEqual.default)((0, import_sortBy.default)(initialState.value.scopes), (0, import_sortBy.default)(form.value.scopes))) return true;
		return false;
	});
	const displayNameValidationRules = [{ name: "REQUIRED" }, {
		name: "MIN_LENGTH",
		config: { minimum: DISPLAY_NAME_MIN_LENGTH }
	}];
	const submitted = ref(false);
	const isDisplayNameValid = computed(() => form.value.displayName.trim().length >= DISPLAY_NAME_MIN_LENGTH);
	function validateOnSubmit(errorTitle) {
		submitted.value = true;
		if (!isDisplayNameValid.value) {
			showMessage({
				type: "error",
				title: i18n.baseText(errorTitle),
				message: i18n.baseText("roles.create.validation.nameMinLength", { interpolate: { min: DISPLAY_NAME_MIN_LENGTH } })
			});
			return false;
		}
		return true;
	}
	function resetForm(payload) {
		submitted.value = false;
		form.value = payload ? formFromRole(payload) : defaultForm();
	}
	return {
		activeTab,
		tabOptions,
		form,
		isLoading,
		initialState,
		isReadOnly,
		isNew,
		showEditButtons,
		showCreateButton,
		hasUnsavedChanges,
		displayNameValidationRules,
		submitted,
		isDisplayNameValid,
		validateOnSubmit,
		resetForm
	};
}
//#endregion
export { RoleEditorLayout_default as n, useRoleEditorForm as t };
