import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { ENTRY_FOCUS, EVENT_OPTIONS, focusFirst } from "./utils.js";
import { createBlock, createVNode, defineComponent, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/RovingFocus/RovingFocusGroup.vue?vue&type=script&setup=true&lang.ts
const [injectRovingFocusGroupContext, provideRovingFocusGroupContext] = createContext("RovingFocusGroup");
var RovingFocusGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RovingFocusGroup",
	props: {
		orientation: {
			type: String,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false,
			default: false
		},
		currentTabStopId: {
			type: [String, null],
			required: false
		},
		defaultCurrentTabStopId: {
			type: String,
			required: false
		},
		preventScrollOnEntryFocus: {
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
			required: false
		}
	},
	emits: ["entryFocus", "update:currentTabStopId"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { loop, orientation, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const currentTabStopId = useVModel(props, "currentTabStopId", emits, {
			defaultValue: props.defaultCurrentTabStopId,
			passive: props.currentTabStopId === void 0
		});
		const isTabbingBackOut = ref(false);
		const isClickFocus = ref(false);
		const focusableItemsCount = ref(0);
		const { getItems, CollectionSlot } = useCollection({ isProvider: true });
		function handleFocus(event) {
			const isKeyboardFocus = !isClickFocus.value;
			if (event.currentTarget && event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut.value) {
				const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
				event.currentTarget.dispatchEvent(entryFocusEvent);
				emits("entryFocus", entryFocusEvent);
				if (!entryFocusEvent.defaultPrevented) {
					const items = getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
					const activeItem = items.find((item) => item.getAttribute("data-active") === "");
					const highlightedItem = items.find((item) => item.getAttribute("data-highlighted") === "");
					const currentItem = items.find((item) => item.id === currentTabStopId.value);
					const candidateItems = [
						activeItem,
						highlightedItem,
						currentItem,
						...items
					].filter(Boolean);
					focusFirst(candidateItems, props.preventScrollOnEntryFocus);
				}
			}
			isClickFocus.value = false;
		}
		function handleMouseUp() {
			setTimeout(() => {
				isClickFocus.value = false;
			}, 1);
		}
		__expose({ getItems });
		provideRovingFocusGroupContext({
			loop,
			dir,
			orientation,
			currentTabStopId,
			onItemFocus: (tabStopId) => {
				currentTabStopId.value = tabStopId;
			},
			onItemShiftTab: () => {
				isTabbingBackOut.value = true;
			},
			onFocusableItemAdd: () => {
				focusableItemsCount.value++;
			},
			onFocusableItemRemove: () => {
				focusableItemsCount.value--;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionSlot), null, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					tabindex: isTabbingBackOut.value || focusableItemsCount.value === 0 ? -1 : 0,
					"data-orientation": unref(orientation),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					dir: unref(dir),
					style: { "outline": "none" },
					onMousedown: _cache[0] || (_cache[0] = ($event) => isClickFocus.value = true),
					onMouseup: handleMouseUp,
					onFocus: handleFocus,
					onBlur: _cache[1] || (_cache[1] = ($event) => isTabbingBackOut.value = false)
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"tabindex",
					"data-orientation",
					"as",
					"as-child",
					"dir"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/RovingFocus/RovingFocusGroup.vue
var RovingFocusGroup_default = RovingFocusGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RovingFocusGroup_default, injectRovingFocusGroupContext };
//# sourceMappingURL=RovingFocusGroup.js.map