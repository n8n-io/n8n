const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_isValueEqualOrExist = require('../shared/isValueEqualOrExist.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_RovingFocusItem = require('../RovingFocus/RovingFocusItem.cjs');
const require_ToggleGroup_ToggleGroupRoot = require('./ToggleGroupRoot.cjs');
const require_Toggle_Toggle = require('../Toggle/Toggle.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ToggleGroup/ToggleGroupItem.vue?vue&type=script&setup=true&lang.ts
var ToggleGroupItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToggleGroupItem",
	props: {
		value: {
			type: null,
			required: true
		},
		disabled: {
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
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_ToggleGroup_ToggleGroupRoot.injectToggleGroupRootContext();
		const disabled = (0, vue.computed)(() => rootContext.disabled?.value || props.disabled);
		const pressed = (0, vue.computed)(() => require_shared_isValueEqualOrExist.isValueEqualOrExist(rootContext.modelValue.value, props.value));
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(rootContext).rovingFocus.value ? (0, vue.unref)(require_RovingFocus_RovingFocusItem.RovingFocusItem_default) : (0, vue.unref)(require_Primitive_Primitive.Primitive)), {
				"as-child": "",
				focusable: !disabled.value,
				active: pressed.value
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Toggle_Toggle.Toggle_default), (0, vue.mergeProps)(props, {
					ref: (0, vue.unref)(forwardRef),
					disabled: disabled.value,
					"model-value": pressed.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).changeModelValue(_ctx.value))
				}), {
					default: (0, vue.withCtx)((slotProps) => [(0, vue.renderSlot)(_ctx.$slots, "default", (0, vue.normalizeProps)((0, vue.guardReactiveProps)(slotProps)))]),
					_: 3
				}, 16, ["disabled", "model-value"])]),
				_: 3
			}, 8, ["focusable", "active"]);
		};
	}
});

//#endregion
//#region src/ToggleGroup/ToggleGroupItem.vue
var ToggleGroupItem_default = ToggleGroupItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToggleGroupItem_default', {
  enumerable: true,
  get: function () {
    return ToggleGroupItem_default;
  }
});
//# sourceMappingURL=ToggleGroupItem.cjs.map