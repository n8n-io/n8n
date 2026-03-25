import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useNonce } from "../shared/useNonce.js";
import { injectScrollAreaRootContext } from "./ScrollAreaRoot.js";
import { Fragment, createElementBlock, createElementVNode, createTextVNode, createVNode, defineComponent, mergeProps, normalizeStyle, onMounted, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/ScrollArea/ScrollAreaViewport.vue?vue&type=script&setup=true&lang.ts
var ScrollAreaViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ScrollAreaViewport",
	props: {
		nonce: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const { nonce: propNonce } = toRefs(props);
		const nonce = useNonce(propNonce);
		const rootContext = injectScrollAreaRootContext();
		const viewportElement = ref();
		onMounted(() => {
			rootContext.onViewportChange(viewportElement.value);
			rootContext.onContentChange(contentElement.value);
		});
		__expose({ viewportElement });
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createElementVNode("div", mergeProps({
				ref_key: "viewportElement",
				ref: viewportElement,
				"data-reka-scroll-area-viewport": "",
				style: {
					overflowX: unref(rootContext).scrollbarXEnabled.value ? "scroll" : "hidden",
					overflowY: unref(rootContext).scrollbarYEnabled.value ? "scroll" : "hidden"
				}
			}, _ctx.$attrs, { tabindex: 0 }), [createVNode(unref(Primitive), {
				ref: unref(forwardRef),
				style: normalizeStyle({ minWidth: unref(rootContext).scrollbarXEnabled.value ? "fit-content" : void 0 }),
				"as-child": props.asChild,
				as: _ctx.as
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"style",
				"as-child",
				"as"
			])], 16), createVNode(unref(Primitive), {
				as: "style",
				nonce: unref(nonce)
			}, {
				default: withCtx(() => _cache[0] || (_cache[0] = [createTextVNode(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-scroll-area-viewport] { scrollbar-width:none; -ms-overflow-style:none; -webkit-overflow-scrolling:touch; } [data-reka-scroll-area-viewport]::-webkit-scrollbar { display:none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaViewport.vue
var ScrollAreaViewport_default = ScrollAreaViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ScrollAreaViewport_default };
//# sourceMappingURL=ScrollAreaViewport.js.map