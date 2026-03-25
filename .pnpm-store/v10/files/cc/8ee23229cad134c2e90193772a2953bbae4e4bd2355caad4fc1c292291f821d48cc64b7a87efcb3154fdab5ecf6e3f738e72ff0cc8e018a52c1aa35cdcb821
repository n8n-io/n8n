import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useCollection } from "../Collection/Collection.js";
import { SliderThumbImpl_default } from "./SliderThumbImpl.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Slider/SliderThumb.vue?vue&type=script&setup=true&lang.ts
var SliderThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SliderThumb",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const { getItems } = useCollection();
		const { forwardRef, currentElement: thumbElement } = useForwardExpose();
		const index = computed(() => thumbElement.value ? getItems(true).findIndex((i) => i.ref === thumbElement.value) : -1);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(SliderThumbImpl_default, mergeProps({ ref: unref(forwardRef) }, props, { index: index.value }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["index"]);
		};
	}
});

//#endregion
//#region src/Slider/SliderThumb.vue
var SliderThumb_default = SliderThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SliderThumb_default };
//# sourceMappingURL=SliderThumb.js.map