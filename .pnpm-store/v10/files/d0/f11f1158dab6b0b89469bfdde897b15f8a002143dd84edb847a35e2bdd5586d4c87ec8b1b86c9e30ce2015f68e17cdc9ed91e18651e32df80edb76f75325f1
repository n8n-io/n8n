const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_VisuallyHidden_VisuallyHiddenInputBubble = require('./VisuallyHiddenInputBubble.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/VisuallyHidden/VisuallyHiddenInput.vue?vue&type=script&setup=true&lang.ts
var VisuallyHiddenInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "VisuallyHiddenInput",
	props: {
		name: {
			type: String,
			required: true
		},
		value: {
			type: null,
			required: true
		},
		checked: {
			type: Boolean,
			required: false,
			default: void 0
		},
		required: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		feature: {
			type: String,
			required: false,
			default: "fully-hidden"
		}
	},
	setup(__props) {
		const props = __props;
		const isFormArrayEmptyAndRequired = (0, vue.computed)(() => typeof props.value === "object" && Array.isArray(props.value) && props.value.length === 0 && props.required);
		const parsedValue = (0, vue.computed)(() => {
			if (typeof props.value === "string" || typeof props.value === "number" || typeof props.value === "boolean" || props.value === null || props.value === void 0) return [{
				name: props.name,
				value: props.value
			}];
			else if (typeof props.value === "object" && Array.isArray(props.value)) return props.value.flatMap((obj, index) => {
				if (typeof obj === "object") return Object.entries(obj).map(([key, value]) => ({
					name: `${props.name}[${index}][${key}]`,
					value
				}));
				else return {
					name: `${props.name}[${index}]`,
					value: obj
				};
			});
			else if (props.value !== null && typeof props.value === "object" && !Array.isArray(props.value)) return Object.entries(props.value).map(([key, value]) => ({
				name: `${props.name}[${key}]`,
				value
			}));
			return [];
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createCommentVNode)(" We render single input if it's required "), isFormArrayEmptyAndRequired.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_VisuallyHidden_VisuallyHiddenInputBubble.VisuallyHiddenInputBubble_default, (0, vue.mergeProps)({ key: _ctx.name }, {
				...props,
				..._ctx.$attrs
			}, {
				name: _ctx.name,
				value: _ctx.value
			}), null, 16, ["name", "value"])) : ((0, vue.openBlock)(true), (0, vue.createElementBlock)(vue.Fragment, { key: 1 }, (0, vue.renderList)(parsedValue.value, (parsed) => {
				return (0, vue.openBlock)(), (0, vue.createBlock)(require_VisuallyHidden_VisuallyHiddenInputBubble.VisuallyHiddenInputBubble_default, (0, vue.mergeProps)({ key: parsed.name }, { ref_for: true }, {
					...props,
					..._ctx.$attrs
				}, {
					name: parsed.name,
					value: parsed.value
				}), null, 16, ["name", "value"]);
			}), 128))], 2112);
		};
	}
});

//#endregion
//#region src/VisuallyHidden/VisuallyHiddenInput.vue
var VisuallyHiddenInput_default = VisuallyHiddenInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'VisuallyHiddenInput_default', {
  enumerable: true,
  get: function () {
    return VisuallyHiddenInput_default;
  }
});
//# sourceMappingURL=VisuallyHiddenInput.cjs.map