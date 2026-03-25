import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { PopperAnchor_default } from "../Popper/PopperAnchor.js";
import { injectHoverCardRootContext } from "./HoverCardRoot.js";
import { excludeTouch } from "./utils.js";
import { createBlock, createVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/HoverCard/HoverCardTrigger.vue?vue&type=script&setup=true&lang.ts
var HoverCardTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectHoverCardRootContext();
		rootContext.triggerElement = currentElement;
		function handleLeave() {
			setTimeout(() => {
				if (!rootContext.isPointerInTransitRef.value && !rootContext.open.value) rootContext.onClose();
			}, 0);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as,
					"data-state": unref(rootContext).open.value ? "open" : "closed",
					"data-grace-area-trigger": "",
					onPointerenter: _cache[0] || (_cache[0] = ($event) => unref(excludeTouch)(unref(rootContext).onOpen)($event)),
					onPointerleave: _cache[1] || (_cache[1] = ($event) => unref(excludeTouch)(handleLeave)($event)),
					onFocus: _cache[2] || (_cache[2] = ($event) => unref(rootContext).onOpen()),
					onBlur: _cache[3] || (_cache[3] = ($event) => unref(rootContext).onClose())
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { HoverCardTrigger_default };
//# sourceMappingURL=HoverCardTrigger.js.map