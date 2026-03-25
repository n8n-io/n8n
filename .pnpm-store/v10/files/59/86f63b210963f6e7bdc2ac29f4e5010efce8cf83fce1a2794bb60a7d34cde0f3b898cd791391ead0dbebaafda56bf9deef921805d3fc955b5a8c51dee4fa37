import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useNonce } from "../shared/useNonce.js";
import { Fragment, createElementBlock, createTextVNode, createVNode, defineComponent, mergeProps, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Viewport/Viewport.vue?vue&type=script&setup=true&lang.ts
var Viewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "Viewport",
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
	setup(__props) {
		const props = __props;
		const { forwardRef } = useForwardExpose();
		const { nonce: propNonce } = toRefs(props);
		const nonce = useNonce(propNonce);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(Primitive), mergeProps({
				..._ctx.$attrs,
				...props
			}, {
				ref: unref(forwardRef),
				"data-reka-viewport": "",
				role: "presentation",
				style: {
					position: "relative",
					flex: 1,
					overflow: "auto"
				}
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16), createVNode(unref(Primitive), {
				as: "style",
				nonce: unref(nonce)
			}, {
				default: withCtx(() => _cache[0] || (_cache[0] = [createTextVNode(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-viewport] { scrollbar-width:none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; } [data-reka-viewport]::-webkit-scrollbar { display: none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/Viewport/Viewport.vue
var Viewport_default = Viewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { Viewport_default };
//# sourceMappingURL=Viewport.js.map