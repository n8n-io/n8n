import { createContext } from "../shared/createContext.js";
import { handleAndDispatchCustomEvent } from "../shared/handleAndDispatchCustomEvent.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { valueComparator } from "./utils.js";
import { injectListboxRootContext } from "./ListboxRoot.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx, withKeys, withMemo, withModifiers } from "vue";

//#region src/Listbox/ListboxItem.vue?vue&type=script&setup=true&lang.ts
const LISTBOX_SELECT = "listbox.select";
const [injectListboxItemContext, provideListboxItemContext] = createContext("ListboxItem");
var ListboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ListboxItem",
	props: {
		value: {
			type: null,
			required: true
		},
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
			default: "div"
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const id = useId(void 0, "reka-listbox-item");
		const { CollectionItem } = useCollection();
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectListboxRootContext();
		const isHighlighted = computed(() => currentElement.value === rootContext.highlightedElement.value);
		const isSelected = computed(() => valueComparator(rootContext.modelValue.value, props.value, rootContext.by));
		const disabled = computed(() => rootContext.disabled.value || props.disabled);
		async function handleSelect(ev) {
			emits("select", ev);
			if (ev?.defaultPrevented) return;
			if (!disabled.value && ev) {
				rootContext.onValueChange(props.value);
				rootContext.changeHighlight(currentElement.value);
			}
		}
		function handleSelectCustomEvent(ev) {
			const eventDetail = {
				originalEvent: ev,
				value: props.value
			};
			handleAndDispatchCustomEvent(LISTBOX_SELECT, handleSelect, eventDetail);
		}
		provideListboxItemContext({ isSelected });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionItem), { value: _ctx.value }, {
				default: withCtx(() => [withMemo([isHighlighted.value, isSelected.value], () => createVNode(unref(Primitive), mergeProps({ id: unref(id) }, _ctx.$attrs, {
					ref: unref(forwardRef),
					role: "option",
					tabindex: unref(rootContext).focusable.value ? isHighlighted.value ? "0" : "-1" : -1,
					"aria-selected": isSelected.value,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					disabled: disabled.value ? "" : void 0,
					"data-disabled": disabled.value ? "" : void 0,
					"data-highlighted": isHighlighted.value ? "" : void 0,
					"data-state": isSelected.value ? "checked" : "unchecked",
					onClick: handleSelectCustomEvent,
					onKeydown: withKeys(withModifiers(handleSelectCustomEvent, ["prevent"]), ["space"]),
					onPointermove: _cache[0] || (_cache[0] = (event) => {
						if (unref(rootContext).highlightedElement.value === unref(currentElement)) return;
						if (unref(rootContext).highlightOnHover.value) unref(rootContext).changeHighlight(unref(currentElement), false);
						else unref(rootContext).focusable.value || unref(rootContext).changeHighlight(unref(currentElement), false);
					})
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"tabindex",
					"aria-selected",
					"as",
					"as-child",
					"disabled",
					"data-disabled",
					"data-highlighted",
					"data-state",
					"onKeydown"
				]), _cache, 1)]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxItem.vue
var ListboxItem_default = ListboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ListboxItem_default, injectListboxItemContext };
//# sourceMappingURL=ListboxItem.js.map