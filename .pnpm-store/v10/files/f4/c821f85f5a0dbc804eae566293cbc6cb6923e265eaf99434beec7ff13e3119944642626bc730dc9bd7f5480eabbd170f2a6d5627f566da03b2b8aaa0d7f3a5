import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { Presence_default } from "../Presence/Presence.js";
import { injectNavigationMenuContext } from "./NavigationMenuRoot.js";
import { getOpenState, whenMouse } from "./utils.js";
import { injectNavigationMenuItemContext } from "./NavigationMenuItem.js";
import { NavigationMenuContentImpl_default } from "./NavigationMenuContentImpl.js";
import { Teleport, computed, createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { isClient, reactiveOmit } from "@vueuse/shared";

//#region src/NavigationMenu/NavigationMenuContent.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "NavigationMenuContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(reactiveOmit(props, "forceMount"), emits);
		const { forwardRef } = useForwardExpose();
		const menuContext = injectNavigationMenuContext();
		const itemContext = injectNavigationMenuItemContext();
		const open = computed(() => itemContext.value === menuContext.modelValue.value);
		const isLastActiveValue = computed(() => {
			if (menuContext.viewport.value) {
				if (!menuContext.modelValue.value && menuContext.previousValue.value) return menuContext.previousValue.value === itemContext.value;
			}
			return false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Teleport, {
				to: unref(isClient) && unref(menuContext).viewport.value ? unref(menuContext).viewport.value : "body",
				disabled: unref(isClient) && unref(menuContext).viewport.value ? !unref(menuContext).viewport.value : true
			}, [createVNode(unref(Presence_default), {
				present: _ctx.forceMount || open.value || isLastActiveValue.value,
				"force-mount": !unref(menuContext).unmountOnHide.value
			}, {
				default: withCtx(({ present }) => [createVNode(NavigationMenuContentImpl_default, mergeProps({
					ref: unref(forwardRef),
					"data-state": unref(getOpenState)(open.value),
					style: { pointerEvents: !open.value && unref(menuContext).isRootMenu ? "none" : void 0 }
				}, {
					..._ctx.$attrs,
					...unref(forwarded)
				}, {
					hidden: !present,
					onPointerenter: _cache[0] || (_cache[0] = ($event) => unref(menuContext).onContentEnter(unref(itemContext).value)),
					onPointerleave: _cache[1] || (_cache[1] = ($event) => unref(whenMouse)(() => unref(menuContext).onContentLeave())($event)),
					onPointerDownOutside: _cache[2] || (_cache[2] = ($event) => emits("pointerDownOutside", $event)),
					onFocusOutside: _cache[3] || (_cache[3] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[4] || (_cache[4] = ($event) => emits("interactOutside", $event))
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 2
				}, 1040, [
					"data-state",
					"style",
					"hidden"
				])]),
				_: 3
			}, 8, ["present", "force-mount"])], 8, ["to", "disabled"]);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuContent.vue
var NavigationMenuContent_default = NavigationMenuContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { NavigationMenuContent_default };
//# sourceMappingURL=NavigationMenuContent.js.map