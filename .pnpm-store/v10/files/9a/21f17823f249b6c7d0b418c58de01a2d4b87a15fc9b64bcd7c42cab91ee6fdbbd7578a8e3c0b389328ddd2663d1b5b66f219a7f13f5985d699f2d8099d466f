import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { useNonce } from "../shared/useNonce.js";
import { Fragment, createElementBlock, createTextVNode, createVNode, defineComponent, mergeProps, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxViewport.vue?vue&type=script&setup=true&lang.ts
var ComboboxViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxViewport",
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
		const rootContext = injectComboboxRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(Primitive), mergeProps({
				..._ctx.$attrs,
				...props
			}, {
				ref: unref(forwardRef),
				"data-reka-combobox-viewport": "",
				role: "presentation",
				style: {
					position: "relative",
					flex: unref(rootContext).isVirtual.value ? void 0 : 1,
					overflow: "auto"
				}
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["style"]), createVNode(unref(Primitive), {
				as: "style",
				nonce: unref(nonce)
			}, {
				default: withCtx(() => _cache[0] || (_cache[0] = [createTextVNode(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-combobox-viewport] { scrollbar-width:none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; } [data-reka-combobox-viewport]::-webkit-scrollbar { display: none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxViewport.vue
var ComboboxViewport_default = ComboboxViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxViewport_default };
//# sourceMappingURL=ComboboxViewport.js.map