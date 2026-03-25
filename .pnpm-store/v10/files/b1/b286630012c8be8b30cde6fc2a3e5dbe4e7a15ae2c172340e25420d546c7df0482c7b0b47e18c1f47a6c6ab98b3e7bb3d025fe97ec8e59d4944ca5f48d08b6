import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectPaginationRootContext } from "./PaginationRoot.js";
import { getRange, transform } from "./utils.js";
import { computed, createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Pagination/PaginationList.vue?vue&type=script&setup=true&lang.ts
var PaginationList_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		useForwardExpose();
		const rootContext = injectPaginationRootContext();
		const transformedRange = computed(() => {
			return transform(getRange(rootContext.page.value, rootContext.pageCount.value, rootContext.siblingCount.value, rootContext.showEdges.value));
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), normalizeProps(guardReactiveProps(props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { items: transformedRange.value })]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationList.vue
var PaginationList_default = PaginationList_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PaginationList_default };
//# sourceMappingURL=PaginationList.js.map