const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/FixedCollectionParameter-DAezqz_g.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-Hx42-oQF.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/FixedCollectionParameter-BmiAlMU4.css"])))=>i.map(i=>d[i]);
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, do as storeToRefs, ff as openBlock, ip as init_shared_esm_bundler, qd as defineAsyncComponent } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, DN as __vitePreload, Dk as isINodePropertyCollection, Gm as isValueExpression, Jg as useUIStore, SN as _plugin_vue_export_helper_default, Tn as ParameterInputWrapper_default, _N as N8nText_default, gM as N8nInputLabel_default, hC as useTelemetry, hM as N8nLink_default, jM as createEventBus, jN as useI18n, vr as ParameterOptions_default } from "./app-D5flEmb-.js";
//#region src/features/ndv/parameters/components/ParameterInputExpanded.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "fixed-collection-wrapper",
	"data-test-id": "fixed-collection-wrapper"
};
var ParameterInputExpanded_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ParameterInputExpanded",
	props: {
		parameter: {},
		value: { type: [
			String,
			Number,
			Boolean,
			null,
			Object,
			Array
		] },
		nodeValues: { default: () => ({}) },
		showValidationWarnings: { type: Boolean },
		documentationUrl: { default: void 0 },
		eventSource: { default: void 0 },
		label: { default: () => ({ size: "small" }) },
		hideRequiredIndicator: { type: Boolean }
	},
	emits: ["update"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const LazyFixedCollectionParameter = defineAsyncComponent(async () => await __vitePreload(() => import("./FixedCollectionParameter-DAezqz_g.js"), __vite__mapDeps([0,1,2,3,4,5,6])));
		const props = __props;
		const emit = __emit;
		const focused = ref(false);
		const blurredEver = ref(false);
		const menuExpanded = ref(false);
		const eventBus = ref(createEventBus());
		const uiStore = useUIStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { activeCredentialType } = storeToRefs(uiStore);
		const isFixedCollectionType = computed(() => {
			return props.parameter.type === "fixedCollection";
		});
		const hiddenIssuesInputs = computed(() => {
			if (!isFixedCollectionType.value) return [];
			if (!props.parameter.options?.length) return [];
			const names = [];
			for (const option of props.parameter.options) if (isINodePropertyCollection(option)) names.push(...option.values.map((value) => value.name));
			return names;
		});
		const fixedCollectionValues = computed(() => {
			if (!isFixedCollectionType.value || !props.value) return {};
			return props.value;
		});
		const showRequiredErrors = computed(() => {
			if (!props.parameter.required) return false;
			if (blurredEver.value || props.showValidationWarnings) {
				if (props.parameter.type === "string") return !props.value;
				if (props.parameter.type === "number") {
					if (typeof props.value === "string" && props.value.startsWith("=")) return false;
					return typeof props.value !== "number";
				}
			}
			return false;
		});
		const hint = computed(() => {
			if (isValueExpression$1.value) return null;
			return i18n.credText(activeCredentialType.value).hint(props.parameter);
		});
		const isValueExpression$1 = computed(() => {
			return isValueExpression(props.parameter, props.value);
		});
		function onFocus() {
			focused.value = true;
		}
		function onBlur() {
			blurredEver.value = true;
			focused.value = false;
		}
		function onMenuExpanded(expanded) {
			menuExpanded.value = expanded;
		}
		function optionSelected(command) {
			eventBus.value.emit("optionSelected", command);
		}
		function valueChanged(parameterData) {
			let name = parameterData.name;
			if (!isFixedCollectionType.value) name = name.split(".").pop() ?? name;
			emit("update", {
				name,
				value: parameterData.value
			});
		}
		function onDocumentationUrlClick() {
			telemetry.track("User clicked credential modal docs link", {
				docs_link: props.documentationUrl,
				source: "field",
				workflow_id: workflowDocumentStore.value.workflowId
			});
		}
		const param = useTemplateRef("param");
		__expose({ displaysIssues: computed(() => param.value?.displaysIssues) });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(N8nInputLabel_default), {
				label: unref(i18n).credText(unref(activeCredentialType)).inputLabelDisplayName(__props.parameter),
				"tooltip-text": unref(i18n).credText(unref(activeCredentialType)).inputLabelDescription(__props.parameter),
				required: __props.parameter.required && !__props.hideRequiredIndicator,
				"show-tooltip": focused.value,
				"show-options": menuExpanded.value,
				"data-test-id": __props.parameter.name,
				size: __props.label.size
			}, {
				options: withCtx(() => [createVNode(ParameterOptions_default, {
					parameter: __props.parameter,
					value: __props.value,
					"is-read-only": false,
					"show-options": !isFixedCollectionType.value,
					"show-expression-selector": !isFixedCollectionType.value,
					"show-focus-panel": false,
					"is-value-expression": isValueExpression$1.value,
					"onUpdate:modelValue": optionSelected,
					onMenuExpanded
				}, null, 8, [
					"parameter",
					"value",
					"show-options",
					"show-expression-selector",
					"is-value-expression"
				])]),
				default: withCtx(() => [!isFixedCollectionType.value ? (openBlock(), createBlock(ParameterInputWrapper_default, {
					key: 0,
					ref_key: "param",
					ref: param,
					"input-size": "large",
					parameter: __props.parameter,
					"model-value": __props.value,
					path: __props.parameter.name,
					"hide-issues": true,
					"documentation-url": __props.documentationUrl,
					"error-highlight": showRequiredErrors.value,
					"is-for-credential": true,
					"event-source": __props.eventSource,
					hint: !showRequiredErrors.value && hint.value ? hint.value : "",
					"event-bus": eventBus.value,
					onFocus,
					onBlur,
					onTextInput: valueChanged,
					onUpdate: valueChanged
				}, null, 8, [
					"parameter",
					"model-value",
					"path",
					"documentation-url",
					"error-highlight",
					"event-source",
					"hint",
					"event-bus"
				])) : createCommentVNode("", true), showRequiredErrors.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.errors)
				}, [createVNode(unref(N8nText_default), {
					color: "danger",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("parameterInputExpanded.thisFieldIsRequired")) + " ", 1), __props.documentationUrl ? (openBlock(), createBlock(unref(N8nLink_default), {
						key: 0,
						to: __props.documentationUrl,
						size: "small",
						underline: true,
						onClick: onDocumentationUrlClick
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("parameterInputExpanded.openDocs")), 1)]),
						_: 1
					}, 8, ["to"])) : createCommentVNode("", true)]),
					_: 1
				})], 2)) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"label",
				"tooltip-text",
				"required",
				"show-tooltip",
				"show-options",
				"data-test-id",
				"size"
			]), isFixedCollectionType.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(LazyFixedCollectionParameter), {
				parameter: __props.parameter,
				values: fixedCollectionValues.value,
				"node-values": __props.nodeValues,
				path: __props.parameter.name,
				"hidden-issues-inputs": hiddenIssuesInputs.value,
				onValueChanged: valueChanged
			}, null, 8, [
				"parameter",
				"values",
				"node-values",
				"path",
				"hidden-issues-inputs"
			])])) : createCommentVNode("", true)]);
		};
	}
}), [["__cssModules", { "$style": {
	errors: "_errors_rh4vu_1",
	hint: "_hint_rh4vu_5"
} }]]);
//#endregion
export { ParameterInputExpanded_default as t };
