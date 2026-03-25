import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useNonce } from "../shared/useNonce.js";
import { CONTENT_MARGIN } from "./utils.js";
import { injectSelectItemAlignedPositionContext } from "./SelectItemAlignedPosition.js";
import { injectSelectContentContext } from "./SelectContentImpl.js";
import { Fragment, createElementBlock, createTextVNode, createVNode, defineComponent, mergeProps, onMounted, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Select/SelectViewport.vue?vue&type=script&setup=true&lang.ts
var SelectViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SelectViewport",
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
		const { nonce: propNonce } = toRefs(props);
		const nonce = useNonce(propNonce);
		const contentContext = injectSelectContentContext();
		const alignedPositionContext = contentContext.position === "item-aligned" ? injectSelectItemAlignedPositionContext() : void 0;
		const { forwardRef, currentElement } = useForwardExpose();
		onMounted(() => {
			contentContext?.onViewportChange(currentElement.value);
		});
		const prevScrollTopRef = ref(0);
		function handleScroll(event) {
			const viewport = event.currentTarget;
			const { shouldExpandOnScrollRef, contentWrapper } = alignedPositionContext ?? {};
			if (shouldExpandOnScrollRef?.value && contentWrapper?.value) {
				const scrolledBy = Math.abs(prevScrollTopRef.value - viewport.scrollTop);
				if (scrolledBy > 0) {
					const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
					const cssMinHeight = Number.parseFloat(contentWrapper.value.style.minHeight);
					const cssHeight = Number.parseFloat(contentWrapper.value.style.height);
					const prevHeight = Math.max(cssMinHeight, cssHeight);
					if (prevHeight < availableHeight) {
						const nextHeight = prevHeight + scrolledBy;
						const clampedNextHeight = Math.min(availableHeight, nextHeight);
						const heightDiff = nextHeight - clampedNextHeight;
						contentWrapper.value.style.height = `${clampedNextHeight}px`;
						if (contentWrapper.value.style.bottom === "0px") {
							viewport.scrollTop = heightDiff > 0 ? heightDiff : 0;
							contentWrapper.value.style.justifyContent = "flex-end";
						}
					}
				}
			}
			prevScrollTopRef.value = viewport.scrollTop;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(Primitive), mergeProps({
				ref: unref(forwardRef),
				"data-reka-select-viewport": "",
				role: "presentation"
			}, {
				..._ctx.$attrs,
				...props
			}, {
				style: {
					position: "relative",
					flex: 1,
					overflow: "hidden auto"
				},
				onScroll: handleScroll
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16), createVNode(unref(Primitive), {
				as: "style",
				nonce: unref(nonce)
			}, {
				default: withCtx(() => _cache[0] || (_cache[0] = [createTextVNode(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-select-viewport] { scrollbar-width:none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; } [data-reka-select-viewport]::-webkit-scrollbar { display: none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/Select/SelectViewport.vue
var SelectViewport_default = SelectViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectViewport_default };
//# sourceMappingURL=SelectViewport.js.map