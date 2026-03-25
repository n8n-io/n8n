import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { focusFirst, getFocusIntent, wrapArray } from "./utils.js";
import { injectRovingFocusGroupContext } from "./RovingFocusGroup.js";
import { computed, createBlock, createVNode, defineComponent, nextTick, onMounted, onUnmounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/RovingFocus/RovingFocusItem.vue?vue&type=script&setup=true&lang.ts
var RovingFocusItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RovingFocusItem",
	props: {
		tabStopId: {
			type: String,
			required: false
		},
		focusable: {
			type: Boolean,
			required: false,
			default: true
		},
		active: {
			type: Boolean,
			required: false
		},
		allowShiftKey: {
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
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const context = injectRovingFocusGroupContext();
		const randomId = useId();
		const id = computed(() => props.tabStopId || randomId);
		const isCurrentTabStop = computed(() => context.currentTabStopId.value === id.value);
		const { getItems, CollectionItem } = useCollection();
		onMounted(() => {
			if (props.focusable) context.onFocusableItemAdd();
		});
		onUnmounted(() => {
			if (props.focusable) context.onFocusableItemRemove();
		});
		function handleKeydown(event) {
			if (event.key === "Tab" && event.shiftKey) {
				context.onItemShiftTab();
				return;
			}
			if (event.target !== event.currentTarget) return;
			const focusIntent = getFocusIntent(event, context.orientation.value, context.dir.value);
			if (focusIntent !== void 0) {
				if (event.metaKey || event.ctrlKey || event.altKey || (props.allowShiftKey ? false : event.shiftKey)) return;
				event.preventDefault();
				let candidateNodes = [...getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "")];
				if (focusIntent === "last") candidateNodes.reverse();
				else if (focusIntent === "prev" || focusIntent === "next") {
					if (focusIntent === "prev") candidateNodes.reverse();
					const currentIndex = candidateNodes.indexOf(event.currentTarget);
					candidateNodes = context.loop.value ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
				}
				nextTick(() => focusFirst(candidateNodes));
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionItem), null, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					tabindex: isCurrentTabStop.value ? 0 : -1,
					"data-orientation": unref(context).orientation.value,
					"data-active": _ctx.active ? "" : void 0,
					"data-disabled": !_ctx.focusable ? "" : void 0,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					onMousedown: _cache[0] || (_cache[0] = (event) => {
						if (!_ctx.focusable) event.preventDefault();
						else unref(context).onItemFocus(id.value);
					}),
					onFocus: _cache[1] || (_cache[1] = ($event) => unref(context).onItemFocus(id.value)),
					onKeydown: handleKeydown
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"tabindex",
					"data-orientation",
					"data-active",
					"data-disabled",
					"as",
					"as-child"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/RovingFocus/RovingFocusItem.vue
var RovingFocusItem_default = RovingFocusItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RovingFocusItem_default };
//# sourceMappingURL=RovingFocusItem.js.map