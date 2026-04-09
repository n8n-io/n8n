const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_MonthPicker_MonthPickerRoot = require('./MonthPickerRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/MonthPicker/MonthPickerCell.vue?vue&type=script&setup=true&lang.ts
var MonthPickerCell_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MonthPickerCell",
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
		const rootContext = require_MonthPicker_MonthPickerRoot.injectMonthPickerRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "gridcell",
				"aria-selected": (0, vue.unref)(rootContext).isMonthSelected(_ctx.date) ? true : void 0,
				"aria-disabled": (0, vue.unref)(rootContext).isMonthDisabled(_ctx.date) || (0, vue.unref)(rootContext).isMonthUnavailable?.(_ctx.date),
				"data-disabled": (0, vue.unref)(rootContext).isMonthDisabled(_ctx.date) ? "" : void 0
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
//#region src/MonthPicker/MonthPickerCell.vue
var MonthPickerCell_default = MonthPickerCell_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MonthPickerCell_default', {
  enumerable: true,
  get: function () {
    return MonthPickerCell_default;
  }
});
//# sourceMappingURL=MonthPickerCell.cjs.map