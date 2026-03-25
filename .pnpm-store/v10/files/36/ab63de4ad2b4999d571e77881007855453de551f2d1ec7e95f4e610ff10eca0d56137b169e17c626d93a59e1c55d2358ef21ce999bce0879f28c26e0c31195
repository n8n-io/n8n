const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Pagination_PaginationRoot = require('./PaginationRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Pagination/PaginationListItem.vue?vue&type=script&setup=true&lang.ts
var PaginationListItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PaginationListItem",
	props: {
		value: {
			type: Number,
			required: true
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
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Pagination_PaginationRoot.injectPaginationRootContext();
		const isSelected = (0, vue.computed)(() => rootContext.page.value === props.value);
		const disabled = (0, vue.computed)(() => rootContext.disabled.value);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"data-type": "page",
				"aria-label": `Page ${_ctx.value}`,
				"aria-current": isSelected.value ? "page" : void 0,
				"data-selected": isSelected.value ? "true" : void 0,
				disabled: disabled.value,
				type: _ctx.as === "button" ? "button" : void 0,
				onClick: _cache[0] || (_cache[0] = ($event) => !disabled.value && (0, vue.unref)(rootContext).onPageChange(_ctx.value))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)(_ctx.value), 1)])]),
				_: 3
			}, 16, [
				"aria-label",
				"aria-current",
				"data-selected",
				"disabled",
				"type"
			]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationListItem.vue
var PaginationListItem_default = PaginationListItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PaginationListItem_default', {
  enumerable: true,
  get: function () {
    return PaginationListItem_default;
  }
});
//# sourceMappingURL=PaginationListItem.cjs.map