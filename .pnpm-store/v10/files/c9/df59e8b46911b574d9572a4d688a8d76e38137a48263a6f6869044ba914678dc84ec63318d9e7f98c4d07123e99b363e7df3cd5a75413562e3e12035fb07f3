import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectTabsRootContext } from "./TabsRoot.js";
import { createBlock, createCommentVNode, defineComponent, mergeProps, nextTick, openBlock, ref, renderSlot, unref, watch, withCtx } from "vue";
import { useResizeObserver } from "@vueuse/core";

//#region src/Tabs/TabsIndicator.vue?vue&type=script&setup=true&lang.ts
var TabsIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TabsIndicator",
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
		const context = injectTabsRootContext();
		useForwardExpose();
		const activeTab = ref();
		const indicatorStyle = ref({
			size: null,
			position: null
		});
		watch(() => [context.modelValue.value, context?.dir.value], async () => {
			await nextTick();
			updateIndicatorStyle();
		}, { immediate: true });
		useResizeObserver([context.tabsList, activeTab], updateIndicatorStyle);
		function updateIndicatorStyle() {
			activeTab.value = context.tabsList.value?.querySelector("[role=\"tab\"][data-state=\"active\"]");
			if (!activeTab.value) return;
			if (context.orientation.value === "horizontal") indicatorStyle.value = {
				size: activeTab.value.offsetWidth,
				position: activeTab.value.offsetLeft
			};
			else indicatorStyle.value = {
				size: activeTab.value.offsetHeight,
				position: activeTab.value.offsetTop
			};
		}
		return (_ctx, _cache) => {
			return typeof indicatorStyle.value.size === "number" ? (openBlock(), createBlock(unref(Primitive), mergeProps({ key: 0 }, props, { style: {
				"--reka-tabs-indicator-size": `${indicatorStyle.value.size}px`,
				"--reka-tabs-indicator-position": `${indicatorStyle.value.position}px`
			} }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["style"])) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Tabs/TabsIndicator.vue
var TabsIndicator_default = TabsIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TabsIndicator_default };
//# sourceMappingURL=TabsIndicator.js.map