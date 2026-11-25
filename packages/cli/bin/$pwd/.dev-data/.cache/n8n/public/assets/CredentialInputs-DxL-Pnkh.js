import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bf as useId, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, rf as mergeProps } from "./vendor-Hx42-oQF.js";
import { Jm as getCredentialOptions, Kj as N8nNotice_default, SN as _plugin_vue_export_helper_default, Vn as getErrorMessage, _N as N8nText_default, bC as useRootStore, bN as N8nSpinner_default, cN as Input_default, gM as N8nInputLabel_default, jN as useI18n, lf as useEnvFeatureFlag, mM as N8nOption_default, pM as N8nSelect_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as CopyInput_default } from "./CopyInput-OmhSMN7b.js";
import { t as ParameterInputExpanded_default } from "./ParameterInputExpanded-COHgQvjR.js";
//#region src/features/credentials/composables/useCredentialOptions.ts
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useCredentialOptions(context) {
	const rootStore = useRootStore();
	const options = ref([]);
	const loading = ref(false);
	const errorMessage = ref("");
	const filter = ref("");
	const paginationToken = ref();
	const hasMore = computed(() => Boolean(paginationToken.value));
	let revision = 0;
	const destination = computed(() => {
		if (context.credentialId) return {
			kind: "stored",
			credentialId: context.credentialId
		};
		if (context.isInstanceCredential) return { kind: "instance" };
		if (context.n8nProjectId) return {
			kind: "project",
			projectId: context.n8nProjectId
		};
	});
	const dependencies = computed(() => context.parameter.typeOptions?.loadOptionsDependsOn ?? []);
	const canLoad = computed(() => {
		if (!context.credentialType || !destination.value) return false;
		return dependencies.value.every((name) => {
			if (!context.credentialProperties.some((property) => property.name === name)) return true;
			const value = context.credentialData[name];
			return typeof value === "string" ? value.trim() !== "" : value !== void 0;
		});
	});
	async function loadOptions(pageToken) {
		const target = destination.value;
		if (!context.credentialType || !target || !canLoad.value) return;
		const requestRevision = revision;
		const request = {
			type: context.credentialType,
			data: { ...context.credentialData },
			propertyName: context.parameter.name,
			filter: filter.value || void 0,
			paginationToken: pageToken
		};
		loading.value = true;
		errorMessage.value = "";
		try {
			const response = await getCredentialOptions(rootStore.restApiContext, target, request);
			if (requestRevision !== revision) return;
			options.value.push(...response.results);
			paginationToken.value = response.paginationToken;
		} catch (error) {
			if (requestRevision === revision) errorMessage.value = getErrorMessage(error);
		} finally {
			if (requestRevision === revision) loading.value = false;
		}
	}
	function reloadOptions() {
		revision++;
		options.value = [];
		paginationToken.value = void 0;
		errorMessage.value = "";
		loading.value = false;
		loadOptions();
	}
	function search(query) {
		const nextFilter = query.trim();
		if (nextFilter === filter.value) return;
		filter.value = nextFilter;
		reloadOptions();
	}
	function loadMore() {
		if (loading.value || !paginationToken.value) return;
		loadOptions(paginationToken.value);
	}
	watch(() => [
		context.credentialType,
		destination.value,
		context.parameter.name,
		...dependencies.value.map((name) => context.credentialData[name])
	], (current, previous) => {
		if ((0, import_isEqual.default)(current, previous)) return;
		reloadOptions();
	}, {
		flush: "sync",
		immediate: true
	});
	onScopeDispose(() => revision++);
	return {
		options,
		loading,
		errorMessage,
		filter,
		hasMore,
		search,
		loadMore
	};
}
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialOptionsInput.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialOptionsInput.vue
var CredentialOptionsInput_default = /* @__PURE__ */ defineComponent({
	__name: "CredentialOptionsInput",
	props: {
		credentialType: {},
		credentialId: {},
		n8nProjectId: {},
		isInstanceCredential: { type: Boolean },
		credentialData: {},
		credentialProperties: {},
		parameter: {},
		modelValue: {},
		showValidationWarnings: { type: Boolean },
		compact: { type: Boolean }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const inputId = useId();
		const { options: loadedOptions, loading, errorMessage, filter, hasMore, search, loadMore } = useCredentialOptions(props);
		const options = computed(() => {
			const staticOptions = props.parameter.options?.filter((option) => "value" in option) ?? [];
			const query = filter.value.toLowerCase();
			return [...staticOptions.filter((option) => option.name.toLowerCase().includes(query)), ...loadedOptions.value];
		});
		const hasRequiredError = computed(() => props.parameter.required && props.showValidationWarnings && !props.modelValue);
		const fieldError = computed(() => {
			if (hasRequiredError.value) return i18n.baseText("parameterInputExpanded.thisFieldIsRequired");
			if (errorMessage.value) return i18n.baseText("credentialEdit.options.error", { interpolate: { message: errorMessage.value } });
			return "";
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nInputLabel_default), {
				"input-name": unref(inputId),
				label: unref(i18n).credText(__props.credentialType ?? "").inputLabelDisplayName(__props.parameter),
				"tooltip-text": unref(i18n).credText(__props.credentialType ?? "").inputLabelDescription(__props.parameter),
				bold: !__props.compact,
				size: __props.compact ? "small" : "medium",
				"show-tooltip": ""
			}, {
				default: withCtx(() => [createVNode(unref(N8nSelect_default), {
					id: unref(inputId),
					"model-value": __props.modelValue,
					size: __props.compact ? "small" : "large",
					placeholder: __props.parameter.placeholder,
					teleported: false,
					"no-data-text": unref(i18n).baseText("credentialEdit.options.empty"),
					"aria-invalid": Boolean(hasRequiredError.value),
					"aria-busy": unref(loading) || void 0,
					"aria-describedby": fieldError.value ? `${unref(inputId)}-error` : void 0,
					filterable: "",
					remote: "",
					"remote-show-suffix": "",
					"remote-method": unref(search),
					"default-first-option": "",
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => emit("update:modelValue", $event))
				}, createSlots({
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(options.value, (option) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: String(option.value),
							value: String(option.value),
							label: option.name
						}, null, 8, ["value", "label"]);
					}), 128))]),
					_: 2
				}, [unref(loading) ? {
					name: "prefix",
					fn: withCtx(() => [createVNode(unref(N8nSpinner_default), {
						role: "status",
						"aria-label": unref(i18n).baseText("parameterInput.loadingOptions")
					}, null, 8, ["aria-label"])]),
					key: "0"
				} : void 0, unref(hasMore) ? {
					name: "footer",
					fn: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						label: unref(i18n).baseText("credentialEdit.options.loadMore"),
						disabled: unref(loading),
						onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
						onClick: withModifiers(unref(loadMore), ["stop"])
					}, null, 8, [
						"label",
						"disabled",
						"onClick"
					])]),
					key: "1"
				} : void 0]), 1032, [
					"id",
					"model-value",
					"size",
					"placeholder",
					"no-data-text",
					"aria-invalid",
					"aria-busy",
					"aria-describedby",
					"remote-method"
				]), fieldError.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					id: `${unref(inputId)}-error`,
					class: "mt-2xs",
					size: "small",
					color: "danger",
					role: "alert"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(fieldError.value), 1)]),
					_: 1
				}, 8, ["id"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"input-name",
				"label",
				"tooltip-text",
				"bold",
				"size"
			]);
		};
	}
});
//#endregion
//#region src/features/credentials/components/CredentialEdit/CredentialInputs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var CredentialInputs_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CredentialInputs",
	props: {
		credentialProperties: {},
		credentialData: {},
		documentationUrl: {},
		showValidationWarnings: { type: Boolean },
		compact: { type: Boolean },
		credentialType: {},
		credentialId: {},
		n8nProjectId: {},
		isInstanceCredential: { type: Boolean }
	},
	emits: ["update"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const i18n = useI18n();
		const inputId = useId();
		function hasRequiredError(parameter) {
			return parameter.required && props.showValidationWarnings && !props.credentialData[parameter.name];
		}
		const { check: envFeatureFlag } = useEnvFeatureFlag();
		const credentialDataValues = computed(() => props.credentialData);
		const visibleProperties = computed(() => props.credentialProperties.filter((parameter) => !parameter.envFeatureFlag || envFeatureFlag.value(parameter.envFeatureFlag)));
		const emit = __emit;
		function valueChanged(parameterData) {
			emit("update", parameterData);
		}
		return (_ctx, _cache) => {
			return visibleProperties.value.length ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass([_ctx.$style.container, { [_ctx.$style.compact]: __props.compact }]),
				onKeydown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(visibleProperties.value, (parameter) => {
				return openBlock(), createElementBlock("form", {
					key: parameter.name,
					autocomplete: "off",
					"data-test-id": "credential-connection-parameter",
					onSubmit: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"]))
				}, [parameter.type === "notice" ? (openBlock(), createBlock(unref(N8nNotice_default), {
					key: 0,
					content: parameter.displayName
				}, null, 8, ["content"])) : parameter.type === "options" && parameter.typeOptions?.loadOptionsMethod ? (openBlock(), createBlock(CredentialOptionsInput_default, mergeProps({
					key: 1,
					ref_for: true
				}, props, {
					parameter,
					"model-value": String(credentialDataValues.value[parameter.name] ?? ""),
					"onUpdate:modelValue": ($event) => valueChanged({
						name: parameter.name,
						value: $event
					})
				}), null, 16, [
					"parameter",
					"model-value",
					"onUpdate:modelValue"
				])) : parameter.type === "string" && parameter.typeOptions?.copyButton ? (openBlock(), createBlock(CopyInput_default, {
					key: 2,
					label: parameter.displayName,
					hint: parameter.description,
					value: String(credentialDataValues.value[parameter.name] ?? parameter.default ?? "")
				}, null, 8, [
					"label",
					"hint",
					"value"
				])) : __props.compact && parameter.type === "string" && !parameter.typeOptions?.editor ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
					key: 3,
					"input-name": `${unref(inputId)}-${parameter.name}`,
					label: unref(i18n).credText(__props.credentialType ?? "").inputLabelDisplayName(parameter),
					"tooltip-text": unref(i18n).credText(__props.credentialType ?? "").inputLabelDescription(parameter) || unref(i18n).credText(__props.credentialType ?? "").hint(parameter),
					bold: false,
					"show-tooltip": "",
					size: "small"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						id: `${unref(inputId)}-${parameter.name}`,
						"model-value": typeof credentialDataValues.value[parameter.name] === "string" ? String(credentialDataValues.value[parameter.name]) : "",
						type: parameter.typeOptions?.rows ? "textarea" : parameter.typeOptions?.password ? "password" : "text",
						rows: parameter.typeOptions?.rows,
						masked: Boolean(parameter.typeOptions?.rows && parameter.typeOptions?.password),
						"aria-invalid": Boolean(hasRequiredError(parameter)),
						"aria-describedby": hasRequiredError(parameter) ? `${unref(inputId)}-${parameter.name}-error` : void 0,
						placeholder: unref(i18n).credText(__props.credentialType ?? "").placeholder(parameter),
						"aria-label": unref(i18n).credText(__props.credentialType ?? "").inputLabelDisplayName(parameter),
						required: parameter.required,
						autocomplete: parameter.typeOptions?.password ? "new-password" : "off",
						size: "small",
						"onUpdate:modelValue": ($event) => valueChanged({
							name: parameter.name,
							value: $event
						})
					}, null, 8, [
						"id",
						"model-value",
						"type",
						"rows",
						"masked",
						"aria-invalid",
						"aria-describedby",
						"placeholder",
						"aria-label",
						"required",
						"autocomplete",
						"onUpdate:modelValue"
					]), hasRequiredError(parameter) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						id: `${unref(inputId)}-${parameter.name}-error`,
						class: "mt-2xs",
						color: "danger",
						size: "small",
						role: "alert"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("parameterInputExpanded.thisFieldIsRequired")), 1)]),
						_: 1
					}, 8, ["id"])) : createCommentVNode("", true)]),
					_: 2
				}, 1032, [
					"input-name",
					"label",
					"tooltip-text"
				])) : (openBlock(), createBlock(ParameterInputExpanded_default, {
					key: 4,
					parameter,
					value: credentialDataValues.value[parameter.name],
					"node-values": credentialDataValues.value,
					"documentation-url": __props.documentationUrl,
					"show-validation-warnings": __props.showValidationWarnings,
					label: { size: __props.compact ? "small" : "medium" },
					"hide-required-indicator": __props.compact,
					"event-source": "credentials",
					onUpdate: valueChanged
				}, null, 8, [
					"parameter",
					"value",
					"node-values",
					"documentation-url",
					"show-validation-warnings",
					"label",
					"hide-required-indicator"
				]))], 32);
			}), 128))], 34)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1tgai_1",
	compact: "_compact_1tgai_5"
} }]]);
//#endregion
export { CredentialInputs_default as t };
