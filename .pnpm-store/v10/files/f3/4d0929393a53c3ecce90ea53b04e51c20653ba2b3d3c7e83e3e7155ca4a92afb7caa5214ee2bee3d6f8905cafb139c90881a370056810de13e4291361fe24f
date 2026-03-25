const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Pagination_PaginationRoot = require('./PaginationRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Pagination/PaginationFirst.vue?vue&type=script&setup=true&lang.ts
var PaginationFirst_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PaginationFirst",
	props: {
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
		const rootContext = require_Pagination_PaginationRoot.injectPaginationRootContext();
		require_shared_useForwardExpose.useForwardExpose();
		const disabled = (0, vue.computed)(() => rootContext.page.value === 1 || rootContext.disabled.value);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"aria-label": "First Page",
				type: _ctx.as === "button" ? "button" : void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => !disabled.value && (0, vue.unref)(rootContext).onPageChange(1))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [_cache[1] || (_cache[1] = (0, vue.createTextVNode)("First page"))])]),
				_: 3
			}, 16, ["type", "disabled"]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationFirst.vue
var PaginationFirst_default = PaginationFirst_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PaginationFirst_default', {
  enumerable: true,
  get: function () {
    return PaginationFirst_default;
  }
});
//# sourceMappingURL=PaginationFirst.cjs.map