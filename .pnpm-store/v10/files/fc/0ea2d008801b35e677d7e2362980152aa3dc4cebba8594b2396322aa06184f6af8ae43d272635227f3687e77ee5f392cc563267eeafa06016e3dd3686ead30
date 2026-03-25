const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Pagination_PaginationRoot = require('./PaginationRoot.cjs');
const require_Pagination_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Pagination/PaginationList.vue?vue&type=script&setup=true&lang.ts
var PaginationList_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PaginationList",
	props: {
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
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Pagination_PaginationRoot.injectPaginationRootContext();
		const transformedRange = (0, vue.computed)(() => {
			return require_Pagination_utils.transform(require_Pagination_utils.getRange(rootContext.page.value, rootContext.pageCount.value, rootContext.siblingCount.value, rootContext.showEdges.value));
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.normalizeProps)((0, vue.guardReactiveProps)(props)), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { items: transformedRange.value })]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationList.vue
var PaginationList_default = PaginationList_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PaginationList_default', {
  enumerable: true,
  get: function () {
    return PaginationList_default;
  }
});
//# sourceMappingURL=PaginationList.cjs.map