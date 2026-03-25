import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectPaginationRootContext } from "./PaginationRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Pagination/PaginationPrev.vue?vue&type=script&setup=true&lang.ts
var PaginationPrev_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PaginationPrev",
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
		useForwardExpose();
		const rootContext = injectPaginationRootContext();
		const disabled = computed(() => rootContext.page.value === 1 || rootContext.disabled.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"aria-label": "Previous Page",
				type: _ctx.as === "button" ? "button" : void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => !disabled.value && unref(rootContext).onPageChange(unref(rootContext).page.value - 1))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [_cache[1] || (_cache[1] = createTextVNode("Prev page"))])]),
				_: 3
			}, 16, ["type", "disabled"]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationPrev.vue
var PaginationPrev_default = PaginationPrev_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PaginationPrev_default };
//# sourceMappingURL=PaginationPrev.js.map