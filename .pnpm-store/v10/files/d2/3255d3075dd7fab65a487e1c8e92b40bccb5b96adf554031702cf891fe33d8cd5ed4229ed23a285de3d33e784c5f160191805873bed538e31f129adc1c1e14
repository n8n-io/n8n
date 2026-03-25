import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { isMouseEvent } from "./utils.js";
import { useCollection } from "../Collection/Collection.js";
import { injectMenuContentContext } from "./MenuContentImpl.js";
import { createBlock, createVNode, defineComponent, mergeProps, nextTick, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/Menu/MenuItemImpl.vue?vue&type=script&setup=true&lang.ts
var MenuItemImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "MenuItemImpl",
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
		const contentContext = injectMenuContentContext();
		const { forwardRef } = useForwardExpose();
		const { CollectionItem } = useCollection();
		const isFocused = ref(false);
		async function handlePointerMove(event) {
			if (event.defaultPrevented) return;
			if (!isMouseEvent(event)) return;
			if (props.disabled) contentContext.onItemLeave(event);
			else {
				const defaultPrevented = contentContext.onItemEnter(event);
				if (!defaultPrevented) {
					const item = event.currentTarget;
					item?.focus({ preventScroll: true });
				}
			}
		}
		async function handlePointerLeave(event) {
			await nextTick();
			if (event.defaultPrevented) return;
			if (!isMouseEvent(event)) return;
			contentContext.onItemLeave(event);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionItem), { value: { textValue: _ctx.textValue } }, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					role: "menuitem",
					tabindex: "-1"
				}, _ctx.$attrs, {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-disabled": _ctx.disabled || void 0,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-highlighted": isFocused.value ? "" : void 0,
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onFocus: _cache[0] || (_cache[0] = async (event) => {
						await nextTick();
						if (event.defaultPrevented || _ctx.disabled) return;
						isFocused.value = true;
					}),
					onBlur: _cache[1] || (_cache[1] = async (event) => {
						await nextTick();
						if (event.defaultPrevented) return;
						isFocused.value = false;
					})
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"as",
					"as-child",
					"aria-disabled",
					"data-disabled",
					"data-highlighted"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuItemImpl.vue
var MenuItemImpl_default = MenuItemImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuItemImpl_default };
//# sourceMappingURL=MenuItemImpl.js.map