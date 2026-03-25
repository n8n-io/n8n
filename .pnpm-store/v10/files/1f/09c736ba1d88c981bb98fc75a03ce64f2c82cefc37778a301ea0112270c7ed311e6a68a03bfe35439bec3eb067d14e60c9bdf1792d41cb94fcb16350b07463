import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { VisuallyHidden_default } from "./VisuallyHidden.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, watch } from "vue";

//#region src/VisuallyHidden/VisuallyHiddenInputBubble.vue?vue&type=script&setup=true&lang.ts
var VisuallyHiddenInputBubble_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "VisuallyHiddenInputBubble",
	props: {
		name: {
			type: String,
			required: true
		},
		value: {
			type: null,
			required: true
		},
		checked: {
			type: Boolean,
			required: false,
			default: void 0
		},
		required: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		feature: {
			type: String,
			required: false,
			default: "fully-hidden"
		}
	},
	setup(__props) {
		const props = __props;
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const valueState = computed(() => props.checked ?? props.value);
		watch(valueState, (cur, prev) => {
			if (!currentElement.value) return;
			const input = currentElement.value;
			const inputProto = window.HTMLInputElement.prototype;
			const descriptor = Object.getOwnPropertyDescriptor(inputProto, "value");
			const setValue = descriptor.set;
			if (setValue && cur !== prev) {
				const inputEvent = new Event("input", { bubbles: true });
				const changeEvent = new Event("change", { bubbles: true });
				setValue.call(input, cur);
				input.dispatchEvent(inputEvent);
				input.dispatchEvent(changeEvent);
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(VisuallyHidden_default, mergeProps({
				ref_key: "primitiveElement",
				ref: primitiveElement
			}, {
				...props,
				..._ctx.$attrs
			}, { as: "input" }), null, 16);
		};
	}
});

//#endregion
//#region src/VisuallyHidden/VisuallyHiddenInputBubble.vue
var VisuallyHiddenInputBubble_default = VisuallyHiddenInputBubble_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { VisuallyHiddenInputBubble_default };
//# sourceMappingURL=VisuallyHiddenInputBubble.js.map