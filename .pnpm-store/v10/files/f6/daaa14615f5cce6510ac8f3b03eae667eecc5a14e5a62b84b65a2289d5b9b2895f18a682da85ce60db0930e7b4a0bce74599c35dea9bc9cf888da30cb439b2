const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_MonthRangePicker_MonthRangePickerRoot = require('./MonthRangePickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/MonthRangePicker/MonthRangePickerNext.vue?vue&type=script&setup=true&lang.ts
var MonthRangePickerNext_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MonthRangePickerNext",
	props: {
		nextPage: {
			type: Function,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_MonthRangePicker_MonthRangePickerRoot.injectMonthRangePickerRootContext();
		const disabled = (0, vue.computed)(() => rootContext.disabled.value || rootContext.isNextButtonDisabled(props.nextPage));
		function handleClick() {
			if (disabled.value) return;
			rootContext.nextPage(props.nextPage);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: props.as,
				"as-child": props.asChild,
				"aria-label": "Next year",
				type: props.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: handleClick
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[0] || (_cache[0] = (0, vue.createTextVNode)(" Next year "))])]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"type",
				"aria-disabled",
				"data-disabled",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/MonthRangePicker/MonthRangePickerNext.vue
var MonthRangePickerNext_default = MonthRangePickerNext_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MonthRangePickerNext_default', {
  enumerable: true,
  get: function () {
    return MonthRangePickerNext_default;
  }
});
//# sourceMappingURL=MonthRangePickerNext.cjs.map