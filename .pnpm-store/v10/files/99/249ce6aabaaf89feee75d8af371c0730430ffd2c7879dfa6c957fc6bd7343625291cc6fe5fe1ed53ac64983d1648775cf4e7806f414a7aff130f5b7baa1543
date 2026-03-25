import { createContext } from "../shared/createContext.js";
import { getActiveElement } from "../shared/getActiveElement.js";
import { useArrowNavigation } from "../shared/useArrowNavigation.js";
import { useBodyScrollLock } from "../shared/useBodyScrollLock.js";
import { useFocusGuards } from "../shared/useFocusGuards.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useTypeahead } from "../shared/useTypeahead.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { FocusScope_default } from "../FocusScope/FocusScope.js";
import { FIRST_LAST_KEYS, LAST_KEYS, focusFirst, getOpenState, isMouseEvent, isPointerInGraceArea } from "./utils.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { PopperContentPropsDefaultValue, PopperContent_default } from "../Popper/PopperContent.js";
import { injectMenuContext, injectMenuRootContext } from "./MenuRoot.js";
import { createBlock, createVNode, defineComponent, mergeDefaults, onUnmounted, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";

//#region src/Menu/MenuContentImpl.vue?vue&type=script&setup=true&lang.ts
const [injectMenuContentContext, provideMenuContentContext] = createContext("MenuContent");
var MenuContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuContentImpl",
	props: /* @__PURE__ */ mergeDefaults({
		loop: {
			type: Boolean,
			required: false
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		},
		disableOutsideScroll: {
			type: Boolean,
			required: false
		},
		trapFocus: {
			type: Boolean,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
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
	}, { ...PopperContentPropsDefaultValue }),
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus",
		"dismiss"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const menuContext = injectMenuContext();
		const rootContext = injectMenuRootContext();
		const { trapFocus, disableOutsidePointerEvents, loop } = toRefs(props);
		useFocusGuards();
		useBodyScrollLock(disableOutsidePointerEvents.value);
		const searchRef = ref("");
		const timerRef = ref(0);
		const pointerGraceTimerRef = ref(0);
		const pointerGraceIntentRef = ref(null);
		const pointerDirRef = ref("right");
		const lastPointerXRef = ref(0);
		const currentItemId = ref(null);
		const rovingFocusGroupRef = ref();
		const { forwardRef, currentElement: contentElement } = useForwardExpose();
		const { handleTypeaheadSearch } = useTypeahead();
		watch(contentElement, (el) => {
			menuContext.onContentChange(el);
		});
		onUnmounted(() => {
			window.clearTimeout(timerRef.value);
		});
		function isPointerMovingToSubmenu(event) {
			const isMovingTowards = pointerDirRef.value === pointerGraceIntentRef.value?.side;
			return isMovingTowards && isPointerInGraceArea(event, pointerGraceIntentRef.value?.area);
		}
		async function handleMountAutoFocus(event) {
			emits("openAutoFocus", event);
			if (event.defaultPrevented) return;
			event.preventDefault();
			contentElement.value?.focus({ preventScroll: true });
		}
		function handleKeyDown(event) {
			if (event.defaultPrevented) return;
			const target = event.target;
			const isKeyDownInside = target.closest("[data-reka-menu-content]") === event.currentTarget;
			const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
			const isCharacterKey = event.key.length === 1;
			const el = useArrowNavigation(event, getActiveElement(), contentElement.value, {
				loop: loop.value,
				arrowKeyOptions: "vertical",
				dir: rootContext?.dir.value,
				focus: true,
				attributeName: "[data-reka-collection-item]:not([data-disabled])"
			});
			if (el) return el?.focus();
			if (event.code === "Space") return;
			const collectionItems = rovingFocusGroupRef.value?.getItems() ?? [];
			if (isKeyDownInside) {
				if (event.key === "Tab") event.preventDefault();
				if (!isModifierKey && isCharacterKey) handleTypeaheadSearch(event.key, collectionItems);
			}
			if (event.target !== contentElement.value) return;
			if (!FIRST_LAST_KEYS.includes(event.key)) return;
			event.preventDefault();
			const candidateNodes = [...collectionItems.map((item) => item.ref)];
			if (LAST_KEYS.includes(event.key)) candidateNodes.reverse();
			focusFirst(candidateNodes);
		}
		function handleBlur(event) {
			if (!event?.currentTarget?.contains?.(event.target)) {
				window.clearTimeout(timerRef.value);
				searchRef.value = "";
			}
		}
		function handlePointerMove(event) {
			if (!isMouseEvent(event)) return;
			const target = event.target;
			const pointerXHasChanged = lastPointerXRef.value !== event.clientX;
			if ((event?.currentTarget)?.contains(target) && pointerXHasChanged) {
				const newDir = event.clientX > lastPointerXRef.value ? "right" : "left";
				pointerDirRef.value = newDir;
				lastPointerXRef.value = event.clientX;
			}
		}
		provideMenuContentContext({
			onItemEnter: (event) => {
				if (isPointerMovingToSubmenu(event)) return true;
				else return false;
			},
			onItemLeave: (event) => {
				if (isPointerMovingToSubmenu(event)) return;
				contentElement.value?.focus();
				currentItemId.value = null;
			},
			onTriggerLeave: (event) => {
				if (isPointerMovingToSubmenu(event)) return true;
				else return false;
			},
			searchRef,
			pointerGraceTimerRef,
			onPointerGraceIntentChange: (intent) => {
				pointerGraceIntentRef.value = intent;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(FocusScope_default), {
				"as-child": "",
				trapped: unref(trapFocus),
				onMountAutoFocus: handleMountAutoFocus,
				onUnmountAutoFocus: _cache[7] || (_cache[7] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": unref(disableOutsidePointerEvents),
					onEscapeKeyDown: _cache[2] || (_cache[2] = ($event) => emits("escapeKeyDown", $event)),
					onPointerDownOutside: _cache[3] || (_cache[3] = ($event) => emits("pointerDownOutside", $event)),
					onFocusOutside: _cache[4] || (_cache[4] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[5] || (_cache[5] = ($event) => emits("interactOutside", $event)),
					onDismiss: _cache[6] || (_cache[6] = ($event) => emits("dismiss"))
				}, {
					default: withCtx(() => [createVNode(unref(RovingFocusGroup_default), {
						ref_key: "rovingFocusGroupRef",
						ref: rovingFocusGroupRef,
						"current-tab-stop-id": currentItemId.value,
						"onUpdate:currentTabStopId": _cache[0] || (_cache[0] = ($event) => currentItemId.value = $event),
						"as-child": "",
						orientation: "vertical",
						dir: unref(rootContext).dir.value,
						loop: unref(loop),
						onEntryFocus: _cache[1] || (_cache[1] = (event) => {
							emits("entryFocus", event);
							if (!unref(rootContext).isUsingKeyboardRef.value) event.preventDefault();
						})
					}, {
						default: withCtx(() => [createVNode(unref(PopperContent_default), {
							ref: unref(forwardRef),
							role: "menu",
							as: _ctx.as,
							"as-child": _ctx.asChild,
							"aria-orientation": "vertical",
							"data-reka-menu-content": "",
							"data-state": unref(getOpenState)(unref(menuContext).open.value),
							dir: unref(rootContext).dir.value,
							side: _ctx.side,
							"side-offset": _ctx.sideOffset,
							align: _ctx.align,
							"align-offset": _ctx.alignOffset,
							"avoid-collisions": _ctx.avoidCollisions,
							"collision-boundary": _ctx.collisionBoundary,
							"collision-padding": _ctx.collisionPadding,
							"arrow-padding": _ctx.arrowPadding,
							"prioritize-position": _ctx.prioritizePosition,
							"position-strategy": _ctx.positionStrategy,
							"update-position-strategy": _ctx.updatePositionStrategy,
							sticky: _ctx.sticky,
							"hide-when-detached": _ctx.hideWhenDetached,
							reference: _ctx.reference,
							onKeydown: handleKeyDown,
							onBlur: handleBlur,
							onPointermove: handlePointerMove
						}, {
							default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
							_: 3
						}, 8, [
							"as",
							"as-child",
							"data-state",
							"dir",
							"side",
							"side-offset",
							"align",
							"align-offset",
							"avoid-collisions",
							"collision-boundary",
							"collision-padding",
							"arrow-padding",
							"prioritize-position",
							"position-strategy",
							"update-position-strategy",
							"sticky",
							"hide-when-detached",
							"reference"
						])]),
						_: 3
					}, 8, [
						"current-tab-stop-id",
						"dir",
						"loop"
					])]),
					_: 3
				}, 8, ["disable-outside-pointer-events"])]),
				_: 3
			}, 8, ["trapped"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuContentImpl.vue
var MenuContentImpl_default = MenuContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuContentImpl_default, injectMenuContentContext };
//# sourceMappingURL=MenuContentImpl.js.map