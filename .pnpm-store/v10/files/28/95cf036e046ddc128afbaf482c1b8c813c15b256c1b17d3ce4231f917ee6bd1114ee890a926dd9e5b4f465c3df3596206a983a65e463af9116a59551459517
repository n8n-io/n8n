const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_date_useDateField = require('../date/useDateField.cjs');
const require_DateRangeField_DateRangeFieldRoot = require('./DateRangeFieldRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DateRangeField/DateRangeFieldInput.vue?vue&type=script&setup=true&lang.ts
var DateRangeFieldInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DateRangeFieldInput",
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
		const rootContext = require_DateRangeField_DateRangeFieldRoot.injectDateRangeFieldRootContext();
		const hasLeftFocus = (0, vue.ref)(true);
		const lastKeyZero = (0, vue.ref)(false);
		const { handleSegmentClick, handleSegmentKeydown, attributes } = require_date_useDateField.useDateField({
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
		const disabled = (0, vue.computed)(() => rootContext.disabled.value);
		const readonly = (0, vue.computed)(() => rootContext.readonly.value);
		const isInvalid = (0, vue.computed)(() => rootContext.isInvalid.value);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, (0, vue.unref)(attributes), {
				contenteditable: disabled.value || readonly.value ? false : _ctx.part !== "literal",
				"data-reka-date-field-segment": _ctx.part,
				"aria-disabled": disabled.value ? true : void 0,
				"aria-readonly": readonly.value ? true : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"data-reka-date-range-field-segment-type": _ctx.type,
				"data-invalid": isInvalid.value ? "" : void 0,
				"aria-invalid": isInvalid.value ? true : void 0
			}, (0, vue.toHandlers)(_ctx.part !== "literal" ? {
				mousedown: (0, vue.unref)(handleSegmentClick),
				keydown: (0, vue.unref)(handleSegmentKeydown),
				focusout: () => {
					hasLeftFocus.value = true;
				},
				focusin: (e) => {
					(0, vue.unref)(rootContext).setFocusedElement(e.target);
				}
			} : {})), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"contenteditable",
				"data-reka-date-field-segment",
				"aria-disabled",
				"aria-readonly",
				"data-disabled",
				"data-reka-date-range-field-segment-type",
				"data-invalid",
				"aria-invalid"
			]);
		};
	}
});

//#endregion
//#region src/DateRangeField/DateRangeFieldInput.vue
var DateRangeFieldInput_default = DateRangeFieldInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DateRangeFieldInput_default', {
  enumerable: true,
  get: function () {
    return DateRangeFieldInput_default;
  }
});
//# sourceMappingURL=DateRangeFieldInput.cjs.map