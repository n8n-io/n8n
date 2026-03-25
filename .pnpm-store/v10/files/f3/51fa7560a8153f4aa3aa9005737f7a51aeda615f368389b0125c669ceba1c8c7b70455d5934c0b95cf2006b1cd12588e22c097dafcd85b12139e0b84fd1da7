const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useBodyScrollLock = require('../shared/useBodyScrollLock.cjs');
const require_shared_useFocusGuards = require('../shared/useFocusGuards.cjs');
const require_shared_useForwardProps = require('../shared/useForwardProps.cjs');
const require_shared_useHideOthers = require('../shared/useHideOthers.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_FocusScope_FocusScope = require('../FocusScope/FocusScope.cjs');
const require_Menu_utils = require('../Menu/utils.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Select_utils = require('./utils.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const require_Select_SelectItemAlignedPosition = require('./SelectItemAlignedPosition.cjs');
const require_Select_SelectPopperPosition = require('./SelectPopperPosition.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Select/SelectContentImpl.vue?vue&type=script&setup=true&lang.ts
const SelectContentDefaultContextValue = {
	onViewportChange: () => {},
	itemTextRefCallback: () => {},
	itemRefCallback: () => {}
};
const [injectSelectContentContext, provideSelectContentContext] = require_shared_createContext.createContext("SelectContent");
var SelectContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectContentImpl",
	props: {
		position: {
			type: String,
			required: false,
			default: "item-aligned"
		},
		bodyLock: {
			type: Boolean,
			required: false,
			default: true
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
			required: false,
			default: "start"
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
	},
	emits: [
		"closeAutoFocus",
		"escapeKeyDown",
		"pointerDownOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		require_shared_useFocusGuards.useFocusGuards();
		require_shared_useBodyScrollLock.useBodyScrollLock(props.bodyLock);
		const { CollectionSlot, getItems } = require_Collection_Collection.useCollection();
		const content = (0, vue.ref)();
		require_shared_useHideOthers.useHideOthers(content);
		const { search, handleTypeaheadSearch } = require_shared_useTypeahead.useTypeahead();
		const viewport = (0, vue.ref)();
		const selectedItem = (0, vue.ref)();
		const selectedItemText = (0, vue.ref)();
		const isPositioned = (0, vue.ref)(false);
		const firstValidItemFoundRef = (0, vue.ref)(false);
		const firstSelectedItemInArrayFoundRef = (0, vue.ref)(false);
		function focusSelectedItem() {
			if (selectedItem.value && content.value) require_Menu_utils.focusFirst([selectedItem.value, content.value]);
		}
		(0, vue.watch)(isPositioned, () => {
			focusSelectedItem();
		});
		const { onOpenChange, triggerPointerDownPosRef } = rootContext;
		(0, vue.watchEffect)((cleanupFn) => {
			if (!content.value) return;
			let pointerMoveDelta = {
				x: 0,
				y: 0
			};
			const handlePointerMove = (event) => {
				pointerMoveDelta = {
					x: Math.abs(Math.round(event.pageX) - (triggerPointerDownPosRef.value?.x ?? 0)),
					y: Math.abs(Math.round(event.pageY) - (triggerPointerDownPosRef.value?.y ?? 0))
				};
			};
			const handlePointerUp = (event) => {
				if (event.pointerType === "touch") return;
				if (pointerMoveDelta.x <= 10 && pointerMoveDelta.y <= 10) event.preventDefault();
				else if (!content.value?.contains(event.target)) onOpenChange(false);
				document.removeEventListener("pointermove", handlePointerMove);
				triggerPointerDownPosRef.value = null;
			};
			if (triggerPointerDownPosRef.value !== null) {
				document.addEventListener("pointermove", handlePointerMove);
				document.addEventListener("pointerup", handlePointerUp, {
					capture: true,
					once: true
				});
			}
			cleanupFn(() => {
				document.removeEventListener("pointermove", handlePointerMove);
				document.removeEventListener("pointerup", handlePointerUp, { capture: true });
			});
		});
		function handleKeyDown(event) {
			const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
			if (event.key === "Tab") event.preventDefault();
			if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key, getItems());
			if ([
				"ArrowUp",
				"ArrowDown",
				"Home",
				"End"
			].includes(event.key)) {
				const collectionItems = getItems().map((i) => i.ref);
				let candidateNodes = [...collectionItems];
				if (["ArrowUp", "End"].includes(event.key)) candidateNodes = candidateNodes.slice().reverse();
				if (["ArrowUp", "ArrowDown"].includes(event.key)) {
					const currentElement = event.target;
					const currentIndex = candidateNodes.indexOf(currentElement);
					candidateNodes = candidateNodes.slice(currentIndex + 1);
				}
				setTimeout(() => require_Menu_utils.focusFirst(candidateNodes));
				event.preventDefault();
			}
		}
		const pickedProps = (0, vue.computed)(() => {
			if (props.position === "popper") return props;
			else return {};
		});
		const forwardedProps = require_shared_useForwardProps.useForwardProps(pickedProps.value);
		provideSelectContentContext({
			content,
			viewport,
			onViewportChange: (node) => {
				viewport.value = node;
			},
			itemRefCallback: (node, value, disabled) => {
				const isFirstValidItem = !firstValidItemFoundRef.value && !disabled;
				const isSelectedItem = require_Select_utils.valueComparator(rootContext.modelValue.value, value, rootContext.by);
				if (rootContext.multiple.value) {
					if (firstSelectedItemInArrayFoundRef.value) return;
					if (isSelectedItem || isFirstValidItem) {
						selectedItem.value = node;
						if (isSelectedItem) firstSelectedItemInArrayFoundRef.value = true;
					}
				} else if (isSelectedItem || isFirstValidItem) selectedItem.value = node;
				if (isFirstValidItem) firstValidItemFoundRef.value = true;
			},
			selectedItem,
			selectedItemText,
			onItemLeave: () => {
				content.value?.focus();
			},
			itemTextRefCallback: (node, value, disabled) => {
				const isFirstValidItem = !firstValidItemFoundRef.value && !disabled;
				const isSelectedItem = require_Select_utils.valueComparator(rootContext.modelValue.value, value, rootContext.by);
				if (isSelectedItem || isFirstValidItem) selectedItemText.value = node;
			},
			focusSelectedItem,
			position: props.position,
			isPositioned,
			searchRef: search
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_FocusScope_FocusScope.FocusScope_default), {
					"as-child": "",
					onMountAutoFocus: _cache[6] || (_cache[6] = (0, vue.withModifiers)(() => {}, ["prevent"])),
					onUnmountAutoFocus: _cache[7] || (_cache[7] = (event) => {
						emits("closeAutoFocus", event);
						if (event.defaultPrevented) return;
						(0, vue.unref)(rootContext).triggerElement.value?.focus({ preventScroll: true });
						event.preventDefault();
					})
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), {
						"as-child": "",
						"disable-outside-pointer-events": "",
						onFocusOutside: _cache[2] || (_cache[2] = (0, vue.withModifiers)(() => {}, ["prevent"])),
						onDismiss: _cache[3] || (_cache[3] = ($event) => (0, vue.unref)(rootContext).onOpenChange(false)),
						onEscapeKeyDown: _cache[4] || (_cache[4] = ($event) => emits("escapeKeyDown", $event)),
						onPointerDownOutside: _cache[5] || (_cache[5] = ($event) => emits("pointerDownOutside", $event))
					}, {
						default: (0, vue.withCtx)(() => [((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)(_ctx.position === "popper" ? require_Select_SelectPopperPosition.SelectPopperPosition_default : require_Select_SelectItemAlignedPosition.SelectItemAlignedPosition_default), (0, vue.mergeProps)({
							..._ctx.$attrs,
							...(0, vue.unref)(forwardedProps)
						}, {
							id: (0, vue.unref)(rootContext).contentId,
							ref: (vnode) => {
								const el = (0, vue.unref)(__vueuse_core.unrefElement)(vnode);
								if (el?.hasAttribute("data-reka-popper-content-wrapper")) content.value = el.firstElementChild;
								else content.value = el;
								return void 0;
							},
							role: "listbox",
							"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
							dir: (0, vue.unref)(rootContext).dir.value,
							style: {
								display: "flex",
								flexDirection: "column",
								outline: "none"
							},
							onContextmenu: _cache[0] || (_cache[0] = (0, vue.withModifiers)(() => {}, ["prevent"])),
							onPlaced: _cache[1] || (_cache[1] = ($event) => isPositioned.value = true),
							onKeydown: handleKeyDown
						}), {
							default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
							_: 3
						}, 16, [
							"id",
							"data-state",
							"dir",
							"onKeydown"
						]))]),
						_: 3
					})]),
					_: 3
				})]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Select/SelectContentImpl.vue
var SelectContentImpl_default = SelectContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectContentDefaultContextValue', {
  enumerable: true,
  get: function () {
    return SelectContentDefaultContextValue;
  }
});
Object.defineProperty(exports, 'SelectContentImpl_default', {
  enumerable: true,
  get: function () {
    return SelectContentImpl_default;
  }
});
Object.defineProperty(exports, 'injectSelectContentContext', {
  enumerable: true,
  get: function () {
    return injectSelectContentContext;
  }
});
Object.defineProperty(exports, 'provideSelectContentContext', {
  enumerable: true,
  get: function () {
    return provideSelectContentContext;
  }
});
//# sourceMappingURL=SelectContentImpl.cjs.map