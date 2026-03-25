const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Calendar_CalendarRoot = require('./CalendarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Calendar/CalendarPrev.vue?vue&type=script&setup=true&lang.ts
var CalendarPrev_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "CalendarPrev",
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
		const rootContext = require_Calendar_CalendarRoot.injectCalendarRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				"aria-label": "Previous page",
				as: props.as,
				"as-child": props.asChild,
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-disabled": disabled.value || void 0,
				"data-disabled": disabled.value || void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).prevPage(props.prevPage))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { disabled: disabled.value }, () => [_cache[1] || (_cache[1] = (0, vue.createTextVNode)(" Prev page "))])]),
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
//#region src/Calendar/CalendarPrev.vue
var CalendarPrev_default = CalendarPrev_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'CalendarPrev_default', {
  enumerable: true,
  get: function () {
    return CalendarPrev_default;
  }
});
//# sourceMappingURL=CalendarPrev.cjs.map