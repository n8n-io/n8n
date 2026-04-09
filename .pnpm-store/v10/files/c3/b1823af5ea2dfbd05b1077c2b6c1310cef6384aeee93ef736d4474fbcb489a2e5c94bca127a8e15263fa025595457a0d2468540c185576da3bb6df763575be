const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Listbox_ListboxRoot = require('../Listbox/ListboxRoot.cjs');
const require_Listbox_ListboxContent = require('../Listbox/ListboxContent.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/ColorSwatchPicker/ColorSwatchPickerRoot.vue?vue&type=script&setup=true&lang.ts
var ColorSwatchPickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ColorSwatchPickerRoot",
	props: {
		defaultValue: {
			type: [String, Array],
			required: false,
			default: void 0
		},
		modelValue: {
			type: [String, Array],
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false,
			default: "ltr"
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		selectionBehavior: {
			type: String,
			required: false
		},
		highlightOnHover: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: [
		"update:modelValue",
		"highlight",
		"entryFocus",
		"leave"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (props.multiple ? [] : ""),
			passive: props.modelValue === void 0
		});
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Listbox_ListboxRoot.ListboxRoot_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				modelValue: (0, vue.unref)(modelValue),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => (0, vue.isRef)(modelValue) ? modelValue.value = $event : null),
				"as-child": ""
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Listbox_ListboxContent.ListboxContent_default), {
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
					_: 3
				}, 8, ["as-child", "as"])]),
				_: 3
			}, 16, ["modelValue"]);
		};
	}
});

//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerRoot.vue
var ColorSwatchPickerRoot_default = ColorSwatchPickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorSwatchPickerRoot_default', {
  enumerable: true,
  get: function () {
    return ColorSwatchPickerRoot_default;
  }
});
//# sourceMappingURL=ColorSwatchPickerRoot.cjs.map