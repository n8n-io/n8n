import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useSingleOrMultipleValue } from "../shared/useSingleOrMultipleValue.js";
import { createBlock, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Accordion/AccordionRoot.vue?vue&type=script&setup=true&lang.ts
const [injectAccordionRootContext, provideAccordionRootContext] = createContext("AccordionRoot");
var AccordionRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AccordionRoot",
	props: {
		collapsible: {
			type: Boolean,
			required: false,
			default: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		dir: {
			type: String,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "vertical"
		},
		unmountOnHide: {
			type: Boolean,
			required: false,
			default: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		type: {
			type: String,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { dir, disabled, unmountOnHide } = toRefs(props);
		const direction = useDirection(dir);
		const { modelValue, changeModelValue, isSingle } = useSingleOrMultipleValue(props, emits);
		const { forwardRef, currentElement: parentElement } = useForwardExpose();
		provideAccordionRootContext({
			disabled,
			direction,
			orientation: props.orientation,
			parentElement,
			isSingle,
			collapsible: props.collapsible,
			modelValue,
			changeModelValue,
			unmountOnHide
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});

//#endregion
//#region src/Accordion/AccordionRoot.vue
var AccordionRoot_default = AccordionRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AccordionRoot_default, injectAccordionRootContext };
//# sourceMappingURL=AccordionRoot.js.map