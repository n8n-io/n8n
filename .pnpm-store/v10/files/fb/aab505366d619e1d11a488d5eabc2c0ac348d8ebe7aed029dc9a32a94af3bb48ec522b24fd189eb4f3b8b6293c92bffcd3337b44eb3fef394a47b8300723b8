const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Calendar_CalendarRoot = require('./CalendarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Calendar/CalendarNext.vue?vue&type=script&setup=true&lang.ts
var CalendarNext_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CalendarNext",
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
		const disabled = (0, vue.computed)(() => rootContext.disabled.value || rootContext.isNextButtonDisabled(props.nextPage));
		const rootContext = require_Calendar_CalendarRoot.injectCalendarRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: props.as,
				"as-child": props.asChild,
				"aria-label": "Next page",
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).nextPage(props.nextPage))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[1] || (_cache[1] = (0, vue.createTextVNode)(" Next page "))])]),
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
//#region src/Calendar/CalendarNext.vue
var CalendarNext_default = CalendarNext_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CalendarNext_default', {
  enumerable: true,
  get: function () {
    return CalendarNext_default;
  }
});
//# sourceMappingURL=CalendarNext.cjs.map