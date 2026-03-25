const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Popover_PopoverRoot = require('./PopoverRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Popover/PopoverClose.vue?vue&type=script&setup=true&lang.ts
var PopoverClose_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopoverClose",
	props: {
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
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Popover_PopoverRoot.injectPopoverRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"as-child": props.asChild,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).onOpenChange(false))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"type",
				"as",
				"as-child"
			]);
		};
	}
});

//#endregion
//#region src/Popover/PopoverClose.vue
var PopoverClose_default = PopoverClose_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopoverClose_default', {
  enumerable: true,
  get: function () {
    return PopoverClose_default;
  }
});
//# sourceMappingURL=PopoverClose.cjs.map