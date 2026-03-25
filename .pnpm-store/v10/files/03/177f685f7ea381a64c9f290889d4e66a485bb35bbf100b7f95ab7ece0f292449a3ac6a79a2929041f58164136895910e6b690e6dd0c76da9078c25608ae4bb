const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Pagination_PaginationRoot = require('./PaginationRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Pagination/PaginationLast.vue?vue&type=script&setup=true&lang.ts
var PaginationLast_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PaginationLast",
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
		const disabled = (0, vue.computed)(() => rootContext.page.value === rootContext.pageCount.value || rootContext.disabled.value);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"aria-label": "Last Page",
				type: _ctx.as === "button" ? "button" : void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => !disabled.value && (0, vue.unref)(rootContext).onPageChange((0, vue.unref)(rootContext).pageCount.value))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [_cache[1] || (_cache[1] = (0, vue.createTextVNode)("Last page"))])]),
				_: 3
			}, 16, ["type", "disabled"]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationLast.vue
var PaginationLast_default = PaginationLast_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PaginationLast_default', {
  enumerable: true,
  get: function () {
    return PaginationLast_default;
  }
});
//# sourceMappingURL=PaginationLast.cjs.map