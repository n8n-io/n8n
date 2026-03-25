import { Primitive } from "../Primitive/Primitive.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/shared/component/BaseSeparator.vue?vue&type=script&setup=true&lang.ts
var BaseSeparator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "BaseSeparator",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		decorative: {
			type: Boolean,
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
		const ORIENTATIONS = ["horizontal", "vertical"];
		function isValidOrientation(orientation) {
			return ORIENTATIONS.includes(orientation);
		}
		const computedOrientation = computed(() => isValidOrientation(props.orientation) ? props.orientation : "horizontal");
		const ariaOrientation = computed(() => computedOrientation.value === "vertical" ? props.orientation : void 0);
		const semanticProps = computed(() => props.decorative ? { role: "none" } : {
			"aria-orientation": ariaOrientation.value,
			"role": "separator"
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-orientation": computedOrientation.value
			}, semanticProps.value), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"data-orientation"
			]);
		};
	}
});

//#endregion
//#region src/shared/component/BaseSeparator.vue
var BaseSeparator_default = BaseSeparator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { BaseSeparator_default };
//# sourceMappingURL=BaseSeparator.js.map