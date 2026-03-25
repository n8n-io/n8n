import { useForwardExpose } from "../shared/useForwardExpose.js";
import { PopperAnchor_default } from "../Popper/PopperAnchor.js";
import { injectPopoverRootContext } from "./PopoverRoot.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, onBeforeMount, onUnmounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Popover/PopoverAnchor.vue?vue&type=script&setup=true&lang.ts
var PopoverAnchor_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverAnchor",
	props: {
		reference: {
			type: null,
			required: false
		},
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
		const rootContext = injectPopoverRootContext();
		onBeforeMount(() => {
			rootContext.hasCustomAnchor.value = true;
		});
		onUnmounted(() => {
			rootContext.hasCustomAnchor.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperAnchor_default), normalizeProps(guardReactiveProps(props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Popover/PopoverAnchor.vue
var PopoverAnchor_default = PopoverAnchor_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverAnchor_default };
//# sourceMappingURL=PopoverAnchor.js.map