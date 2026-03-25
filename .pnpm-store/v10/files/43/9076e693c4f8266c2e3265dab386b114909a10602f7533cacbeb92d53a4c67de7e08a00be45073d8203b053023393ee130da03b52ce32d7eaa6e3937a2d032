const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_NumberField_utils = require('./utils.cjs');
const require_NumberField_NumberFieldRoot = require('./NumberFieldRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/NumberField/NumberFieldDecrement.vue?vue&type=script&setup=true&lang.ts
var NumberFieldDecrement_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "NumberFieldDecrement",
	props: {
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
		const rootContext = require_NumberField_NumberFieldRoot.injectNumberFieldRootContext();
		const isDisabled = (0, vue.computed)(() => rootContext.disabled?.value || rootContext.readonly.value || props.disabled || rootContext.isDecreaseDisabled.value);
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const { isPressed, onTrigger } = require_NumberField_utils.usePressedHold({
			target: currentElement,
			disabled: isDisabled
		});
		onTrigger(() => {
			rootContext.handleDecrease();
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				tabindex: "-1",
				"aria-label": "Decrease",
				type: _ctx.as === "button" ? "button" : void 0,
				style: { userSelect: (0, vue.unref)(isPressed) ? "none" : void 0 },
				disabled: isDisabled.value ? "" : void 0,
				"data-disabled": isDisabled.value ? "" : void 0,
				"data-pressed": (0, vue.unref)(isPressed) ? "true" : void 0,
				onContextmenu: _cache[0] || (_cache[0] = (0, vue.withModifiers)(() => {}, ["prevent"]))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"style",
				"disabled",
				"data-disabled",
				"data-pressed"
			]);
		};
	}
});

//#endregion
//#region src/NumberField/NumberFieldDecrement.vue
var NumberFieldDecrement_default = NumberFieldDecrement_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NumberFieldDecrement_default', {
  enumerable: true,
  get: function () {
    return NumberFieldDecrement_default;
  }
});
//# sourceMappingURL=NumberFieldDecrement.cjs.map