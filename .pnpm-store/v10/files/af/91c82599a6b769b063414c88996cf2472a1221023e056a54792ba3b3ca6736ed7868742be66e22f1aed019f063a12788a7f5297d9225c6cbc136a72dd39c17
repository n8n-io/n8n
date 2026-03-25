const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Popper_PopperAnchor = require('../Popper/PopperAnchor.cjs');
const require_Popover_PopoverRoot = require('./PopoverRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Popover/PopoverTrigger.vue?vue&type=script&setup=true&lang.ts
var PopoverTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopoverTrigger",
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
		const rootContext = require_Popover_PopoverRoot.injectPopoverRootContext();
		const { forwardRef, currentElement: triggerElement } = require_shared_useForwardExpose.useForwardExpose();
		rootContext.triggerId ||= require_shared_useId.useId(void 0, "reka-popover-trigger");
		(0, vue.onMounted)(() => {
			rootContext.triggerElement.value = triggerElement.value;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(rootContext).hasCustomAnchor.value ? (0, vue.unref)(require_Primitive_Primitive.Primitive) : (0, vue.unref)(require_Popper_PopperAnchor.PopperAnchor_default)), { "as-child": "" }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					id: (0, vue.unref)(rootContext).triggerId,
					ref: (0, vue.unref)(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0,
					"aria-haspopup": "dialog",
					"aria-expanded": (0, vue.unref)(rootContext).open.value,
					"aria-controls": (0, vue.unref)(rootContext).contentId,
					"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
					as: _ctx.as,
					"as-child": props.asChild,
					onClick: (0, vue.unref)(rootContext).onOpenToggle
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"id",
					"type",
					"aria-expanded",
					"aria-controls",
					"data-state",
					"as",
					"as-child",
					"onClick"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Popover/PopoverTrigger.vue
var PopoverTrigger_default = PopoverTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopoverTrigger_default', {
  enumerable: true,
  get: function () {
    return PopoverTrigger_default;
  }
});
//# sourceMappingURL=PopoverTrigger.cjs.map