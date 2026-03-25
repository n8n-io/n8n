import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusItem_default } from "../RovingFocus/RovingFocusItem.js";
import { injectTabsRootContext } from "./TabsRoot.js";
import { makeContentId, makeTriggerId } from "./utils.js";
import { computed, createBlock, createVNode, defineComponent, openBlock, renderSlot, unref, withCtx, withKeys, withModifiers } from "vue";

//#region src/Tabs/TabsTrigger.vue?vue&type=script&setup=true&lang.ts
var TabsTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TabsTrigger",
	props: {
		value: {
			type: [String, Number],
			required: true
		},
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
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = useForwardExpose();
		const rootContext = injectTabsRootContext();
		const triggerId = computed(() => makeTriggerId(rootContext.baseId, props.value));
		const contentId = computed(() => makeContentId(rootContext.baseId, props.value));
		const isSelected = computed(() => props.value === rootContext.modelValue.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusItem_default), {
				"as-child": "",
				focusable: !_ctx.disabled,
				active: isSelected.value
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					id: triggerId.value,
					ref: unref(forwardRef),
					role: "tab",
					type: _ctx.as === "button" ? "button" : void 0,
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-selected": isSelected.value ? "true" : "false",
					"aria-controls": contentId.value,
					"data-state": isSelected.value ? "active" : "inactive",
					disabled: _ctx.disabled,
					"data-disabled": _ctx.disabled ? "" : void 0,
					"data-orientation": unref(rootContext).orientation.value,
					onMousedown: _cache[0] || (_cache[0] = withModifiers((event) => {
						if (!_ctx.disabled && event.ctrlKey === false) unref(rootContext).changeModelValue(_ctx.value);
						else event.preventDefault();
					}, ["left"])),
					onKeydown: _cache[1] || (_cache[1] = withKeys(($event) => unref(rootContext).changeModelValue(_ctx.value), ["enter", "space"])),
					onFocus: _cache[2] || (_cache[2] = () => {
						const isAutomaticActivation = unref(rootContext).activationMode !== "manual";
						if (!isSelected.value && !_ctx.disabled && isAutomaticActivation) unref(rootContext).changeModelValue(_ctx.value);
					})
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"id",
					"type",
					"as",
					"as-child",
					"aria-selected",
					"aria-controls",
					"data-state",
					"disabled",
					"data-disabled",
					"data-orientation"
				])]),
				_: 3
			}, 8, ["focusable", "active"]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsTrigger.vue
var TabsTrigger_default = TabsTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TabsTrigger_default };
//# sourceMappingURL=TabsTrigger.js.map