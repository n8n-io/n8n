const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RangeCalendar_RangeCalendarRoot = require('./RangeCalendarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/RangeCalendar/RangeCalendarPrev.vue?vue&type=script&setup=true&lang.ts
var RangeCalendarPrev_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "RangeCalendarPrev",
	props: {
		prevPage: {
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
		const disabled = (0, vue.computed)(() => rootContext.disabled.value || rootContext.isPrevButtonDisabled(props.prevPage));
		const rootContext = require_RangeCalendar_RangeCalendarRoot.injectRangeCalendarRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"aria-label": "Previous page",
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).prevPage(props.prevPage))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[1] || (_cache[1] = (0, vue.createTextVNode)(" Prev page "))])]),
				_: 3
			}, 16, [
				"type",
				"aria-disabled",
				"data-disabled",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/RangeCalendar/RangeCalendarPrev.vue
var RangeCalendarPrev_default = RangeCalendarPrev_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'RangeCalendarPrev_default', {
  enumerable: true,
  get: function () {
    return RangeCalendarPrev_default;
  }
});
//# sourceMappingURL=RangeCalendarPrev.cjs.map