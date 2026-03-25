const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_ScrollAreaScrollbarAuto = require('./ScrollAreaScrollbarAuto.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaScrollbarHover.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaScrollbarHover_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ScrollAreaScrollbarHover",
	props: { forceMount: {
		type: Boolean,
		required: false
	} },
	setup(__props) {
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		let timeout;
		const visible = (0, vue.ref)(false);
		function handlePointerEnter() {
			window.clearTimeout(timeout);
			visible.value = true;
		}
		function handlePointerLeave() {
			timeout = window.setTimeout(() => {
				visible.value = false;
			}, rootContext.scrollHideDelay.value);
		}
		(0, vue.onMounted)(() => {
			const scrollArea = rootContext.scrollArea.value;
			if (scrollArea) {
				scrollArea.addEventListener("pointerenter", handlePointerEnter);
				scrollArea.addEventListener("pointerleave", handlePointerLeave);
			}
		});
		(0, vue.onUnmounted)(() => {
			const scrollArea = rootContext.scrollArea.value;
			if (scrollArea) {
				window.clearTimeout(timeout);
				scrollArea.removeEventListener("pointerenter", handlePointerEnter);
				scrollArea.removeEventListener("pointerleave", handlePointerLeave);
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), { present: _ctx.forceMount || visible.value }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_ScrollArea_ScrollAreaScrollbarAuto.ScrollAreaScrollbarAuto_default, (0, vue.mergeProps)(_ctx.$attrs, {
					ref: (0, vue.unref)(forwardRef),
					"data-state": visible.value ? "visible" : "hidden"
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["data-state"])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarHover.vue
var ScrollAreaScrollbarHover_default = ScrollAreaScrollbarHover_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaScrollbarHover_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbarHover_default;
  }
});
//# sourceMappingURL=ScrollAreaScrollbarHover.cjs.map