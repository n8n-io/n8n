const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RadioGroup_RadioGroupItem = require('./RadioGroupItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/RadioGroup/RadioGroupIndicator.vue?vue&type=script&setup=true&lang.ts
var RadioGroupIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "RadioGroupIndicator",
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
		const itemContext = require_RadioGroup_RadioGroupItem.injectRadioGroupItemContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || (0, vue.unref)(itemContext).checked.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
					ref: (0, vue.unref)(forwardRef),
					"data-state": (0, vue.unref)(itemContext).checked.value ? "checked" : "unchecked",
					"data-disabled": (0, vue.unref)(itemContext).disabled.value ? "" : void 0,
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
//#region src/RadioGroup/RadioGroupIndicator.vue
var RadioGroupIndicator_default = RadioGroupIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'RadioGroupIndicator_default', {
  enumerable: true,
  get: function () {
    return RadioGroupIndicator_default;
  }
});
//# sourceMappingURL=RadioGroupIndicator.cjs.map