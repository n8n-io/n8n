import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Presence_default } from "../Presence/Presence.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectTabsRootContext } from "./TabsRoot.js";
import { makeContentId, makeTriggerId } from "./utils.js";
import { computed, createBlock, createCommentVNode, createVNode, defineComponent, normalizeStyle, onMounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/Tabs/TabsContent.vue?vue&type=script&setup=true&lang.ts
var TabsContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TabsContent",
	props: {
		value: {
			type: [String, Number],
			required: true
		},
		forceMount: {
			type: Boolean,
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
		const { forwardRef } = useForwardExpose();
		const rootContext = injectTabsRootContext();
		const triggerId = computed(() => makeTriggerId(rootContext.baseId, props.value));
		const contentId = computed(() => makeContentId(rootContext.baseId, props.value));
		const isSelected = computed(() => props.value === rootContext.modelValue.value);
		const isMountAnimationPreventedRef = ref(isSelected.value);
		onMounted(() => {
			requestAnimationFrame(() => {
				isMountAnimationPreventedRef.value = false;
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), {
				present: _ctx.forceMount || isSelected.value,
				"force-mount": ""
			}, {
				default: withCtx(({ present }) => [createVNode(unref(Primitive), {
					id: contentId.value,
					ref: unref(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as,
					role: "tabpanel",
					"data-state": isSelected.value ? "active" : "inactive",
					"data-orientation": unref(rootContext).orientation.value,
					"aria-labelledby": triggerId.value,
					hidden: !present,
					tabindex: "0",
					style: normalizeStyle({ animationDuration: isMountAnimationPreventedRef.value ? "0s" : void 0 })
				}, {
					default: withCtx(() => [(unref(rootContext).unmountOnHide.value ? present : true) ? renderSlot(_ctx.$slots, "default", { key: 0 }) : createCommentVNode("v-if", true)]),
					_: 2
				}, 1032, [
					"id",
					"as-child",
					"as",
					"data-state",
					"data-orientation",
					"aria-labelledby",
					"hidden",
					"style"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsContent.vue
var TabsContent_default = TabsContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TabsContent_default };
//# sourceMappingURL=TabsContent.js.map