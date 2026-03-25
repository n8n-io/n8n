const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useArrowNavigation = require('../shared/useArrowNavigation.cjs');
const require_shared_useBodyScrollLock = require('../shared/useBodyScrollLock.cjs');
const require_shared_useFocusGuards = require('../shared/useFocusGuards.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_FocusScope_FocusScope = require('../FocusScope/FocusScope.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const require_Popper_PopperContent = require('../Popper/PopperContent.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuContentImpl.vue?vue&type=script&setup=true&lang.ts
const [injectMenuContentContext, provideMenuContentContext] = require_shared_createContext.createContext("MenuContent");
var MenuContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuContentImpl",
	props: /* @__PURE__ */ (0, vue.mergeDefaults)({
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
	}, { ...require_Popper_PopperContent.PopperContentPropsDefaultValue }),
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
		const menuContext = require_Menu_MenuRoot.injectMenuContext();
		const rootContext = require_Menu_MenuRoot.injectMenuRootContext();
		const { trapFocus, disableOutsidePointerEvents, loop } = (0, vue.toRefs)(props);
		require_shared_useFocusGuards.useFocusGuards();
		require_shared_useBodyScrollLock.useBodyScrollLock(disableOutsidePointerEvents.value);
		const searchRef = (0, vue.ref)("");
		const timerRef = (0, vue.ref)(0);
		const pointerGraceTimerRef = (0, vue.ref)(0);
		const pointerGraceIntentRef = (0, vue.ref)(null);
		const pointerDirRef = (0, vue.ref)("right");
		const lastPointerXRef = (0, vue.ref)(0);
		const currentItemId = (0, vue.ref)(null);
		const rovingFocusGroupRef = (0, vue.ref)();
		const { forwardRef, currentElement: contentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { handleTypeaheadSearch } = require_shared_useTypeahead.useTypeahead();
		(0, vue.watch)(contentElement, (el) => {
			menuContext.onContentChange(el);
		});
		(0, vue.onUnmounted)(() => {
			window.clearTimeout(timerRef.value);
		});
		function isPointerMovingToSubmenu(event) {
			const isMovingTowards = pointerDirRef.value === pointerGraceIntentRef.value?.side;
			return isMovingTowards && require_Menu_utils.isPointerInGraceArea(event, pointerGraceIntentRef.value?.area);
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
			const el = require_shared_useArrowNavigation.useArrowNavigation(event, require_shared_getActiveElement.getActiveElement(), contentElement.value, {
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
			if (!require_Menu_utils.FIRST_LAST_KEYS.includes(event.key)) return;
			event.preventDefault();
			const candidateNodes = [...collectionItems.map((item) => item.ref)];
			if (require_Menu_utils.LAST_KEYS.includes(event.key)) candidateNodes.reverse();
			require_Menu_utils.focusFirst(candidateNodes);
		}
		function handleBlur(event) {
			if (!event?.currentTarget?.contains?.(event.target)) {
				window.clearTimeout(timerRef.value);
				searchRef.value = "";
			}
		}
		function handlePointerMove(event) {
			if (!require_Menu_utils.isMouseEvent(event)) return;
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
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_FocusScope_FocusScope.FocusScope_default), {
				"as-child": "",
				trapped: (0, vue.unref)(trapFocus),
				onMountAutoFocus: handleMountAutoFocus,
				onUnmountAutoFocus: _cache[7] || (_cache[7] = ($event) => emits("closeAutoFocus", $event))
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": (0, vue.unref)(disableOutsidePointerEvents),
					onEscapeKeyDown: _cache[2] || (_cache[2] = ($event) => emits("escapeKeyDown", $event)),
					onPointerDownOutside: _cache[3] || (_cache[3] = ($event) => emits("pointerDownOutside", $event)),
					onFocusOutside: _cache[4] || (_cache[4] = ($event) => emits("focusOutside", $event)),
					onInteractOutside: _cache[5] || (_cache[5] = ($event) => emits("interactOutside", $event)),
					onDismiss: _cache[6] || (_cache[6] = ($event) => emits("dismiss"))
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default), {
						ref_key: "rovingFocusGroupRef",
						ref: rovingFocusGroupRef,
						"current-tab-stop-id": currentItemId.value,
						"onUpdate:currentTabStopId": _cache[0] || (_cache[0] = ($event) => currentItemId.value = $event),
						"as-child": "",
						orientation: "vertical",
						dir: (0, vue.unref)(rootContext).dir.value,
						loop: (0, vue.unref)(loop),
						onEntryFocus: _cache[1] || (_cache[1] = (event) => {
							emits("entryFocus", event);
							if (!(0, vue.unref)(rootContext).isUsingKeyboardRef.value) event.preventDefault();
						})
					}, {
						default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Popper_PopperContent.PopperContent_default), {
							ref: (0, vue.unref)(forwardRef),
							role: "menu",
							as: _ctx.as,
							"as-child": _ctx.asChild,
							"aria-orientation": "vertical",
							"data-reka-menu-content": "",
							"data-state": (0, vue.unref)(require_Menu_utils.getOpenState)((0, vue.unref)(menuContext).open.value),
							dir: (0, vue.unref)(rootContext).dir.value,
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
							default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'MenuContentImpl_default', {
  enumerable: true,
  get: function () {
    return MenuContentImpl_default;
  }
});
Object.defineProperty(exports, 'injectMenuContentContext', {
  enumerable: true,
  get: function () {
    return injectMenuContentContext;
  }
});
//# sourceMappingURL=MenuContentImpl.cjs.map