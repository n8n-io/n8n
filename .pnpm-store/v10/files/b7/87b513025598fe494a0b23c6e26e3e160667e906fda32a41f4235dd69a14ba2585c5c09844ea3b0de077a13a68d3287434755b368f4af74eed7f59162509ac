import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectPaginationRootContext } from "./PaginationRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Pagination/PaginationLast.vue?vue&type=script&setup=true&lang.ts
var PaginationLast_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectPaginationRootContext();
		useForwardExpose();
		const disabled = computed(() => rootContext.page.value === rootContext.pageCount.value || rootContext.disabled.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"aria-label": "Last Page",
				type: _ctx.as === "button" ? "button" : void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => !disabled.value && unref(rootContext).onPageChange(unref(rootContext).pageCount.value))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [_cache[1] || (_cache[1] = createTextVNode("Last page"))])]),
				_: 3
			}, 16, ["type", "disabled"]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationLast.vue
var PaginationLast_default = PaginationLast_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PaginationLast_default };
//# sourceMappingURL=PaginationLast.js.map