const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_YearRangePicker_YearRangePickerRoot = require('./YearRangePickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/YearRangePicker/YearRangePickerGrid.vue?vue&type=script&setup=true&lang.ts
var YearRangePickerGrid_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "YearRangePickerGrid",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "table"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_YearRangePicker_YearRangePickerRoot.injectYearRangePickerRootContext();
		const disabled = (0, vue.computed)(() => rootContext.disabled.value ? true : void 0);
		const readonly = (0, vue.computed)(() => rootContext.readonly.value ? true : void 0);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				tabindex: "-1",
				role: "application",
				"aria-labelledby": (0, vue.unref)(rootContext).headingId,
				"aria-readonly": readonly.value,
				"aria-disabled": disabled.value,
				"data-readonly": readonly.value && "",
				"data-disabled": disabled.value && ""
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"aria-labelledby",
				"aria-readonly",
				"aria-disabled",
				"data-readonly",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/YearRangePicker/YearRangePickerGrid.vue
var YearRangePickerGrid_default = YearRangePickerGrid_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'YearRangePickerGrid_default', {
  enumerable: true,
  get: function () {
    return YearRangePickerGrid_default;
  }
});
//# sourceMappingURL=YearRangePickerGrid.cjs.map