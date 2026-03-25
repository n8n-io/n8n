import { useId } from "../shared/useId.js";
import { SUB_OPEN_KEYS, getOpenState, isMouseEvent } from "./utils.js";
import { MenuAnchor_default } from "./MenuAnchor.js";
import { injectMenuContext, injectMenuRootContext } from "./MenuRoot.js";
import { injectMenuContentContext } from "./MenuContentImpl.js";
import { MenuItemImpl_default } from "./MenuItemImpl.js";
import { injectMenuSubContext } from "./MenuSub.js";
import { createBlock, createVNode, defineComponent, mergeProps, nextTick, onUnmounted, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/Menu/MenuSubTrigger.vue?vue&type=script&setup=true&lang.ts
var MenuSubTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuSubTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
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
		const menuContext = injectMenuContext();
		const rootContext = injectMenuRootContext();
		const subContext = injectMenuSubContext();
		const contentContext = injectMenuContentContext();
		const openTimerRef = ref(null);
		subContext.triggerId ||= useId(void 0, "reka-menu-sub-trigger");
		function clearOpenTimer() {
			if (openTimerRef.value) window.clearTimeout(openTimerRef.value);
			openTimerRef.value = null;
		}
		onUnmounted(() => {
			clearOpenTimer();
		});
		function handlePointerMove(event) {
			if (!isMouseEvent(event)) return;
			const defaultPrevented = contentContext.onItemEnter(event);
			if (defaultPrevented) return;
			if (!props.disabled && !menuContext.open.value && !openTimerRef.value) {
				contentContext.onPointerGraceIntentChange(null);
				openTimerRef.value = window.setTimeout(() => {
					menuContext.onOpenChange(true);
					clearOpenTimer();
				}, 100);
			}
		}
		async function handlePointerLeave(event) {
			if (!isMouseEvent(event)) return;
			clearOpenTimer();
			const contentRect = menuContext.content.value?.getBoundingClientRect();
			if (contentRect?.width) {
				const side = menuContext.content.value?.dataset.side;
				const rightSide = side === "right";
				const bleed = rightSide ? -5 : 5;
				const contentNearEdge = contentRect[rightSide ? "left" : "right"];
				const contentFarEdge = contentRect[rightSide ? "right" : "left"];
				contentContext.onPointerGraceIntentChange({
					area: [
						{
							x: event.clientX + bleed,
							y: event.clientY
						},
						{
							x: contentNearEdge,
							y: contentRect.top
						},
						{
							x: contentFarEdge,
							y: contentRect.top
						},
						{
							x: contentFarEdge,
							y: contentRect.bottom
						},
						{
							x: contentNearEdge,
							y: contentRect.bottom
						}
					],
					side
				});
				window.clearTimeout(contentContext.pointerGraceTimerRef.value);
				contentContext.pointerGraceTimerRef.value = window.setTimeout(() => contentContext.onPointerGraceIntentChange(null), 300);
			} else {
				const defaultPrevented = contentContext.onTriggerLeave(event);
				if (defaultPrevented) return;
				contentContext.onPointerGraceIntentChange(null);
			}
		}
		async function handleKeyDown(event) {
			const isTypingAhead = contentContext.searchRef.value !== "";
			if (props.disabled || isTypingAhead && event.key === " ") return;
			if (SUB_OPEN_KEYS[rootContext.dir.value].includes(event.key)) {
				menuContext.onOpenChange(true);
				await nextTick();
				menuContext.content.value?.focus();
				event.preventDefault();
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(MenuAnchor_default, { "as-child": "" }, {
				default: withCtx(() => [createVNode(MenuItemImpl_default, mergeProps(props, {
					id: unref(subContext).triggerId,
					ref: (vnode) => {
						unref(subContext)?.onTriggerChange(vnode?.$el);
						return void 0;
					},
					"aria-haspopup": "menu",
					"aria-expanded": unref(menuContext).open.value,
					"aria-controls": unref(subContext).contentId,
					"data-state": unref(getOpenState)(unref(menuContext).open.value),
					onClick: _cache[0] || (_cache[0] = async (event) => {
						if (props.disabled || event.defaultPrevented) return;
						/**
						* We manually focus because iOS Safari doesn't always focus on click (e.g. buttons)
						* and we rely heavily on `onFocusOutside` for submenus to close when switching
						* between separate submenus.
						*/
						event.currentTarget.focus();
						if (!unref(menuContext).open.value) unref(menuContext).onOpenChange(true);
					}),
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onKeydown: handleKeyDown
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"aria-expanded",
					"aria-controls",
					"data-state"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Menu/MenuSubTrigger.vue
var MenuSubTrigger_default = MenuSubTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuSubTrigger_default };
//# sourceMappingURL=MenuSubTrigger.js.map