const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_YearRangePicker_YearRangePickerRoot = require('./YearRangePickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/YearRangePicker/YearRangePickerCell.vue?vue&type=script&setup=true&lang.ts
var YearRangePickerCell_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "YearRangePickerCell",
	props: {
		date: {
			type: null,
			required: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "td"
		}
	},
	setup(__props) {
		const rootContext = require_YearRangePicker_YearRangePickerRoot.injectYearRangePickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "gridcell",
				"aria-selected": (0, vue.unref)(rootContext).isSelected(_ctx.date) ? true : void 0,
				"aria-disabled": (0, vue.unref)(rootContext).isYearDisabled(_ctx.date) || (0, vue.unref)(rootContext).isYearUnavailable?.(_ctx.date),
				"data-disabled": (0, vue.unref)(rootContext).isYearDisabled(_ctx.date) ? "" : void 0
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"aria-selected",
				"aria-disabled",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/YearRangePicker/YearRangePickerCell.vue
var YearRangePickerCell_default = YearRangePickerCell_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'YearRangePickerCell_default', {
  enumerable: true,
  get: function () {
    return YearRangePickerCell_default;
  }
});
//# sourceMappingURL=YearRangePickerCell.cjs.map