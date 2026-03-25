const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Pagination/PaginationRoot.vue?vue&type=script&setup=true&lang.ts
const [injectPaginationRootContext, providePaginationRootContext] = require_shared_createContext.createContext("PaginationRoot");
var PaginationRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PaginationRoot",
	props: {
		page: {
			type: Number,
			required: false
		},
		defaultPage: {
			type: Number,
			required: false,
			default: 1
		},
		itemsPerPage: {
			type: Number,
			required: true
		},
		total: {
			type: Number,
			required: false,
			default: 0
		},
		siblingCount: {
			type: Number,
			required: false,
			default: 2
		},
		disabled: {
			type: Boolean,
			required: false
		},
		showEdges: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "nav"
		}
	},
	emits: ["update:page"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { siblingCount, disabled, showEdges } = (0, vue.toRefs)(props);
		require_shared_useForwardExpose.useForwardExpose();
		const page = (0, __vueuse_core.useVModel)(props, "page", emits, {
			defaultValue: props.defaultPage,
			passive: props.page === void 0
		});
		const pageCount = (0, vue.computed)(() => Math.max(1, Math.ceil(props.total / (props.itemsPerPage || 1))));
		providePaginationRootContext({
			page,
			onPageChange(value) {
				page.value = value;
			},
			pageCount,
			siblingCount,
			disabled,
			showEdges
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					page: (0, vue.unref)(page),
					pageCount: pageCount.value
				})]),
				_: 3
			}, 8, ["as", "as-child"]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationRoot.vue
var PaginationRoot_default = PaginationRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PaginationRoot_default', {
  enumerable: true,
  get: function () {
    return PaginationRoot_default;
  }
});
Object.defineProperty(exports, 'injectPaginationRootContext', {
  enumerable: true,
  get: function () {
    return injectPaginationRootContext;
  }
});
//# sourceMappingURL=PaginationRoot.cjs.map