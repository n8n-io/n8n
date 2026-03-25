import { createContext } from "../shared/createContext.js";
import { useBodyScrollLock } from "../shared/useBodyScrollLock.js";
import { useFocusGuards } from "../shared/useFocusGuards.js";
import { useForwardProps } from "../shared/useForwardProps.js";
import { useHideOthers } from "../shared/useHideOthers.js";
import { useTypeahead } from "../shared/useTypeahead.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { FocusScope_default } from "../FocusScope/FocusScope.js";
import { focusFirst } from "../Menu/utils.js";
import { useCollection } from "../Collection/Collection.js";
import { valueComparator } from "./utils.js";
import { injectSelectRootContext } from "./SelectRoot.js";
import { SelectItemAlignedPosition_default } from "./SelectItemAlignedPosition.js";
import { SelectPopperPosition_default } from "./SelectPopperPosition.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, resolveDynamicComponent, unref, watch, watchEffect, withCtx, withModifiers } from "vue";
import { unrefElement } from "@vueuse/core";

//#region src/Select/SelectContentImpl.vue?vue&type=script&setup=true&lang.ts
const SelectContentDefaultContextValue = {
	onViewportChange: () => {},
	itemTextRefCallback: () => {},
	itemRefCallback: () => {}
};
const [injectSelectContentContext, provideSelectContentContext] = createContext("SelectContent");
var SelectContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectSelectRootContext();
		useFocusGuards();
		useBodyScrollLock(props.bodyLock);
		const { CollectionSlot, getItems } = useCollection();
		const content = ref();
		useHideOthers(content);
		const { search, handleTypeaheadSearch } = useTypeahead();
		const viewport = ref();
		const selectedItem = ref();
		const selectedItemText = ref();
		const isPositioned = ref(false);
		const firstValidItemFoundRef = ref(false);
		const firstSelectedItemInArrayFoundRef = ref(false);
		function focusSelectedItem() {
			if (selectedItem.value && content.value) focusFirst([selectedItem.value, content.value]);
		}
		watch(isPositioned, () => {
			focusSelectedItem();
		});
		const { onOpenChange, triggerPointerDownPosRef } = rootContext;
		watchEffect((cleanupFn) => {
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
				setTimeout(() => focusFirst(candidateNodes));
				event.preventDefault();
			}
		}
		const pickedProps = computed(() => {
			if (props.position === "popper") return props;
			else return {};
		});
		const forwardedProps = useForwardProps(pickedProps.value);
		provideSelectContentContext({
			content,
			viewport,
			onViewportChange: (node) => {
				viewport.value = node;
			},
			itemRefCallback: (node, value, disabled) => {
				const isFirstValidItem = !firstValidItemFoundRef.value && !disabled;
				const isSelectedItem = valueComparator(rootContext.modelValue.value, value, rootContext.by);
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
				const isSelectedItem = valueComparator(rootContext.modelValue.value, value, rootContext.by);
				if (isSelectedItem || isFirstValidItem) selectedItemText.value = node;
			},
			focusSelectedItem,
			position: props.position,
			isPositioned,
			searchRef: search
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionSlot), null, {
				default: withCtx(() => [createVNode(unref(FocusScope_default), {
					"as-child": "",
					onMountAutoFocus: _cache[6] || (_cache[6] = withModifiers(() => {}, ["prevent"])),
					onUnmountAutoFocus: _cache[7] || (_cache[7] = (event) => {
						emits("closeAutoFocus", event);
						if (event.defaultPrevented) return;
						unref(rootContext).triggerElement.value?.focus({ preventScroll: true });
						event.preventDefault();
					})
				}, {
					default: withCtx(() => [createVNode(unref(DismissableLayer_default), {
						"as-child": "",
						"disable-outside-pointer-events": "",
						onFocusOutside: _cache[2] || (_cache[2] = withModifiers(() => {}, ["prevent"])),
						onDismiss: _cache[3] || (_cache[3] = ($event) => unref(rootContext).onOpenChange(false)),
						onEscapeKeyDown: _cache[4] || (_cache[4] = ($event) => emits("escapeKeyDown", $event)),
						onPointerDownOutside: _cache[5] || (_cache[5] = ($event) => emits("pointerDownOutside", $event))
					}, {
						default: withCtx(() => [(openBlock(), createBlock(resolveDynamicComponent(_ctx.position === "popper" ? SelectPopperPosition_default : SelectItemAlignedPosition_default), mergeProps({
							..._ctx.$attrs,
							...unref(forwardedProps)
						}, {
							id: unref(rootContext).contentId,
							ref: (vnode) => {
								const el = unref(unrefElement)(vnode);
								if (el?.hasAttribute("data-reka-popper-content-wrapper")) content.value = el.firstElementChild;
								else content.value = el;
								return void 0;
							},
							role: "listbox",
							"data-state": unref(rootContext).open.value ? "open" : "closed",
							dir: unref(rootContext).dir.value,
							style: {
								display: "flex",
								flexDirection: "column",
								outline: "none"
							},
							onContextmenu: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"])),
							onPlaced: _cache[1] || (_cache[1] = ($event) => isPositioned.value = true),
							onKeydown: handleKeyDown
						}), {
							default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { SelectContentDefaultContextValue, SelectContentImpl_default, injectSelectContentContext, provideSelectContentContext };
//# sourceMappingURL=SelectContentImpl.js.map