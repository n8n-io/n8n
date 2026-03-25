const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Popper_PopperAnchor = require('../Popper/PopperAnchor.cjs');
const require_HoverCard_HoverCardRoot = require('./HoverCardRoot.cjs');
const require_HoverCard_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/HoverCard/HoverCardTrigger.vue?vue&type=script&setup=true&lang.ts
var HoverCardTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "HoverCardTrigger",
	props: {
		reference: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "a"
		}
	},
	setup(__props) {
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_HoverCard_HoverCardRoot.injectHoverCardRootContext();
		rootContext.triggerElement = currentElement;
		function handleLeave() {
			setTimeout(() => {
				if (!rootContext.isPointerInTransitRef.value && !rootContext.open.value) rootContext.onClose();
			}, 0);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperAnchor.PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as,
					"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
					"data-grace-area-trigger": "",
					onPointerenter: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(require_HoverCard_utils.excludeTouch)((0, vue.unref)(rootContext).onOpen)($event)),
					onPointerleave: _cache[1] || (_cache[1] = ($event) => (0, vue.unref)(require_HoverCard_utils.excludeTouch)(handleLeave)($event)),
					onFocus: _cache[2] || (_cache[2] = ($event) => (0, vue.unref)(rootContext).onOpen()),
					onBlur: _cache[3] || (_cache[3] = ($event) => (0, vue.unref)(rootContext).onClose())
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as-child",
					"as",
					"data-state"
				])]),
				_: 3
			}, 8, ["reference"]);
		};
	}
});

//#endregion
//#region src/HoverCard/HoverCardTrigger.vue
var HoverCardTrigger_default = HoverCardTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'HoverCardTrigger_default', {
  enumerable: true,
  get: function () {
    return HoverCardTrigger_default;
  }
});
//# sourceMappingURL=HoverCardTrigger.cjs.map