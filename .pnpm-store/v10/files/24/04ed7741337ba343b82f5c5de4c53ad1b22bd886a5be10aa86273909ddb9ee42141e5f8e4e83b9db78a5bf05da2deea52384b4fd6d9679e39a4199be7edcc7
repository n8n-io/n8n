import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { createBlock, createElementVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, watch, withCtx } from "vue";

//#region src/Select/BubbleSelect.vue?vue&type=script&setup=true&lang.ts
var BubbleSelect_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "BubbleSelect",
	props: {
		autocomplete: {
			type: String,
			required: false
		},
		autofocus: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		form: {
			type: String,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		size: {
			type: Number,
			required: false
		},
		value: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const selectElement = ref();
		watch(() => props.value, (cur, prev) => {
			const selectProto = window.HTMLSelectElement.prototype;
			const descriptor = Object.getOwnPropertyDescriptor(selectProto, "value");
			const setValue = descriptor.set;
			if (cur !== prev && setValue && selectElement.value) {
				const event = new Event("change", { bubbles: true });
				setValue.call(selectElement.value, cur);
				selectElement.value.dispatchEvent(event);
			}
		});
		/**
		* We purposefully use a `select` here to support form autofill as much
		* as possible.
		*
		* We purposefully do not add the `value` attribute here to allow the value
		* to be set programmatically and bubble to any parent form `onChange` event.
		*
		* We use `VisuallyHidden` rather than `display: "none"` because Safari autofill
		* won't work otherwise.
		*/
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(VisuallyHidden_default), { "as-child": "" }, {
				default: withCtx(() => [createElementVNode("select", mergeProps({
					ref_key: "selectElement",
					ref: selectElement
				}, props), [renderSlot(_ctx.$slots, "default")], 16)]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Select/BubbleSelect.vue
var BubbleSelect_default = BubbleSelect_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { BubbleSelect_default };
//# sourceMappingURL=BubbleSelect.js.map