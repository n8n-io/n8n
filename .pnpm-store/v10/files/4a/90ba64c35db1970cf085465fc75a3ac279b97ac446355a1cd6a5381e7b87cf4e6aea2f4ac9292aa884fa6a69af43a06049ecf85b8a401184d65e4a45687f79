import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { VisuallyHidden_default } from "../VisuallyHidden/VisuallyHidden.js";
import { injectNavigationMenuContext } from "./NavigationMenuRoot.js";
import { getOpenState, makeContentId, makeTriggerId } from "./utils.js";
import { injectNavigationMenuItemContext } from "./NavigationMenuItem.js";
import { Fragment, computed, createCommentVNode, createElementBlock, createVNode, defineComponent, mergeProps, onMounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";
import { refAutoReset, unrefElement } from "@vueuse/core";

//#region src/NavigationMenu/NavigationMenuTrigger.vue?vue&type=script&setup=true&lang.ts
const _hoisted_1 = ["aria-owns"];
var NavigationMenuTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "NavigationMenuTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
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
		const menuContext = injectNavigationMenuContext();
		const itemContext = injectNavigationMenuItemContext();
		const { CollectionItem } = useCollection({ key: "NavigationMenu" });
		const { forwardRef, currentElement: triggerElement } = useForwardExpose();
		const triggerId = ref("");
		const contentId = ref("");
		const hasPointerMoveOpenedRef = refAutoReset(false, 300);
		const wasClickCloseRef = ref(false);
		const open = computed(() => itemContext.value === menuContext.modelValue.value);
		onMounted(() => {
			itemContext.triggerRef = triggerElement;
			triggerId.value = makeTriggerId(menuContext.baseId, itemContext.value);
			contentId.value = makeContentId(menuContext.baseId, itemContext.value);
		});
		function handlePointerEnter() {
			if (menuContext.disableHoverTrigger.value) return;
			wasClickCloseRef.value = false;
			itemContext.wasEscapeCloseRef.value = false;
		}
		function handlePointerMove(ev) {
			if (menuContext.disableHoverTrigger.value) return;
			if (ev.pointerType === "mouse") {
				if (props.disabled || wasClickCloseRef.value || itemContext.wasEscapeCloseRef.value || hasPointerMoveOpenedRef.value) return;
				menuContext.onTriggerEnter(itemContext.value);
				hasPointerMoveOpenedRef.value = true;
			}
		}
		function handlePointerLeave(ev) {
			if (menuContext.disableHoverTrigger.value) return;
			if (ev.pointerType === "mouse") {
				if (props.disabled) return;
				menuContext.onTriggerLeave();
				hasPointerMoveOpenedRef.value = false;
			}
		}
		function handleClick(event) {
			if (event.pointerType === "mouse" && menuContext.disableClickTrigger.value) return;
			if (hasPointerMoveOpenedRef.value) return;
			if (open.value) menuContext.onItemSelect("");
			else menuContext.onItemSelect(itemContext.value);
			wasClickCloseRef.value = open.value;
		}
		function handleKeydown(ev) {
			const verticalEntryKey = menuContext.dir.value === "rtl" ? "ArrowLeft" : "ArrowRight";
			const entryKey = {
				horizontal: "ArrowDown",
				vertical: verticalEntryKey
			}[menuContext.orientation];
			if (open.value && ev.key === entryKey) {
				itemContext.onEntryKeyDown();
				ev.preventDefault();
				ev.stopPropagation();
			}
		}
		function setFocusProxyRef(node) {
			itemContext.focusProxyRef.value = unrefElement(node);
			return void 0;
		}
		function handleVisuallyHiddenFocus(ev) {
			const content = document.getElementById(itemContext.contentId);
			const prevFocusedElement = ev.relatedTarget;
			const wasTriggerFocused = prevFocusedElement === triggerElement.value;
			const wasFocusFromContent = content?.contains(prevFocusedElement);
			if (wasTriggerFocused || !wasFocusFromContent) itemContext.onFocusProxyEnter(wasTriggerFocused ? "start" : "end");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(CollectionItem), null, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					id: triggerId.value,
					ref: unref(forwardRef),
					disabled: _ctx.disabled,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-state": unref(getOpenState)(open.value),
					"data-navigation-menu-trigger": "",
					"aria-expanded": open.value,
					"aria-controls": contentId.value,
					"as-child": props.asChild,
					as: _ctx.as
				}, _ctx.$attrs, {
					onPointerenter: handlePointerEnter,
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onClick: handleClick,
					onKeydown: handleKeydown
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"disabled",
					"data-disabled",
					"data-state",
					"aria-expanded",
					"aria-controls",
					"as-child",
					"as"
				])]),
				_: 3
			}), open.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(VisuallyHidden_default), {
				ref: setFocusProxyRef,
				"aria-hidden": "true",
				tabindex: 0,
				onFocus: handleVisuallyHiddenFocus
			}), unref(menuContext).viewport ? (openBlock(), createElementBlock("span", {
				key: 0,
				"aria-owns": contentId.value
			}, null, 8, _hoisted_1)) : createCommentVNode("v-if", true)], 64)) : createCommentVNode("v-if", true)], 64);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuTrigger.vue
var NavigationMenuTrigger_default = NavigationMenuTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { NavigationMenuTrigger_default };
//# sourceMappingURL=NavigationMenuTrigger.js.map