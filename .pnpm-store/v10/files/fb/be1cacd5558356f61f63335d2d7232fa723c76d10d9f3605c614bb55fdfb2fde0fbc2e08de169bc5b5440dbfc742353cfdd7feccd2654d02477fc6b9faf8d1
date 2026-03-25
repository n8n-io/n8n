import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { MenuAnchor_default } from "../Menu/MenuAnchor.js";
import { injectContextMenuRootContext } from "./ContextMenuRoot.js";
import { isTouchOrPen } from "./utils.js";
import { Fragment, computed, createElementBlock, createVNode, defineComponent, mergeProps, nextTick, onMounted, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/ContextMenu/ContextMenuTrigger.vue?vue&type=script&setup=true&lang.ts
var ContextMenuTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ContextMenuTrigger",
	props: {
		disabled: {
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
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const { disabled } = toRefs(props);
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectContextMenuRootContext();
		const point = ref({
			x: 0,
			y: 0
		});
		const virtualEl = computed(() => ({ getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			left: point.value.x,
			right: point.value.x,
			top: point.value.y,
			bottom: point.value.y,
			...point.value
		}) }));
		const longPressTimer = ref(0);
		function clearLongPress() {
			window.clearTimeout(longPressTimer.value);
		}
		function handleOpen(event) {
			point.value = {
				x: event.clientX,
				y: event.clientY
			};
			rootContext.onOpenChange(true);
		}
		async function handleContextMenu(event) {
			if (!disabled.value) {
				await nextTick();
				if (!event.defaultPrevented) {
					clearLongPress();
					handleOpen(event);
					event.preventDefault();
				}
			}
		}
		async function handlePointerDown(event) {
			if (!disabled.value) {
				await nextTick();
				if (isTouchOrPen(event) && !event.defaultPrevented) {
					clearLongPress();
					longPressTimer.value = window.setTimeout(() => handleOpen(event), rootContext.pressOpenDelay.value);
				}
			}
		}
		async function handlePointerEvent(event) {
			if (!disabled.value) {
				await nextTick();
				if (isTouchOrPen(event) && !event.defaultPrevented) clearLongPress();
			}
		}
		onMounted(() => {
			if (currentElement.value) rootContext.triggerElement.value = currentElement.value;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(MenuAnchor_default), {
				as: "template",
				reference: virtualEl.value
			}, null, 8, ["reference"]), createVNode(unref(Primitive), mergeProps({
				ref: unref(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": unref(rootContext).open.value ? "open" : "closed",
				"data-disabled": unref(disabled) ? "" : void 0,
				style: {
					WebkitTouchCallout: "none",
					pointerEvents: "auto"
				}
			}, _ctx.$attrs, {
				onContextmenu: handleContextMenu,
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerEvent,
				onPointercancel: handlePointerEvent,
				onPointerup: handlePointerEvent
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"data-state",
				"data-disabled"
			])], 64);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuTrigger.vue
var ContextMenuTrigger_default = ContextMenuTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ContextMenuTrigger_default };
//# sourceMappingURL=ContextMenuTrigger.js.map