import { Primitive } from "../Primitive/Primitive.js";
import { useDateField } from "../date/useDateField.js";
import { injectTimeRangeFieldRootContext } from "./TimeRangeFieldRoot.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, ref, renderSlot, toHandlers, unref, withCtx } from "vue";

//#region src/TimeRangeField/TimeRangeFieldInput.vue?vue&type=script&setup=true&lang.ts
var TimeRangeFieldInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TimeRangeFieldInput",
	props: {
		part: {
			type: null,
			required: true
		},
		type: {
			type: String,
			required: true
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
		const rootContext = injectTimeRangeFieldRootContext();
		const hasLeftFocus = ref(true);
		const lastKeyZero = ref(false);
		const { handleSegmentClick, handleSegmentKeydown, attributes } = useDateField({
			hasLeftFocus,
			lastKeyZero,
			placeholder: rootContext.placeholder,
			hourCycle: rootContext.hourCycle,
			step: rootContext.step,
			segmentValues: rootContext.segmentValues[props.type],
			formatter: rootContext.formatter,
			part: props.part,
			disabled: rootContext.disabled,
			readonly: rootContext.readonly,
			focusNext: rootContext.focusNext,
			modelValue: props.type === "start" ? rootContext.startValue : rootContext.endValue
		});
		const disabled = computed(() => rootContext.disabled.value);
		const readonly = computed(() => rootContext.readonly.value);
		const isInvalid = computed(() => rootContext.isInvalid.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, unref(attributes), {
				contenteditable: disabled.value || readonly.value ? false : _ctx.part !== "literal",
				"data-reka-time-field-segment": _ctx.part,
				"data-reka-time-range-field-segment-type": _ctx.type,
				"aria-disabled": disabled.value ? true : void 0,
				"aria-readonly": readonly.value ? true : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"data-invalid": isInvalid.value ? "" : void 0,
				"aria-invalid": isInvalid.value ? true : void 0
			}, toHandlers(_ctx.part !== "literal" ? {
				mousedown: unref(handleSegmentClick),
				keydown: unref(handleSegmentKeydown),
				focusout: () => {
					hasLeftFocus.value = true;
				},
				focusin: (e) => {
					unref(rootContext).setFocusedElement(e.target);
				}
			} : {})), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"contenteditable",
				"data-reka-time-field-segment",
				"data-reka-time-range-field-segment-type",
				"aria-disabled",
				"aria-readonly",
				"data-disabled",
				"data-invalid",
				"aria-invalid"
			]);
		};
	}
});

//#endregion
//#region src/TimeRangeField/TimeRangeFieldInput.vue
var TimeRangeFieldInput_default = TimeRangeFieldInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TimeRangeFieldInput_default };
//# sourceMappingURL=TimeRangeFieldInput.js.map