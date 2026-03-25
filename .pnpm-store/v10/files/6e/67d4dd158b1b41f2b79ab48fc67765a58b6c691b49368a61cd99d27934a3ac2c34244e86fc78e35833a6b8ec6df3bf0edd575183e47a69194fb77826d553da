const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Checkbox_utils = require('./utils.cjs');
const require_Checkbox_CheckboxRoot = require('./CheckboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Checkbox/CheckboxIndicator.vue?vue&type=script&setup=true&lang.ts
var CheckboxIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CheckboxIndicator",
	props: {
		forceMount: {
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
			default: "span"
		}
	},
	setup(__props) {
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Checkbox_CheckboxRoot.injectCheckboxRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(require_Checkbox_utils.isIndeterminate)((0, vue.unref)(rootContext).state.value) || (0, vue.unref)(rootContext).state.value === true }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					"data-state": (0, vue.unref)(require_Checkbox_utils.getState)((0, vue.unref)(rootContext).state.value),
					"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
					style: { pointerEvents: "none" },
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, _ctx.$attrs), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"data-state",
					"data-disabled",
					"as-child",
					"as"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Checkbox/CheckboxIndicator.vue
var CheckboxIndicator_default = CheckboxIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CheckboxIndicator_default', {
  enumerable: true,
  get: function () {
    return CheckboxIndicator_default;
  }
});
//# sourceMappingURL=CheckboxIndicator.cjs.map