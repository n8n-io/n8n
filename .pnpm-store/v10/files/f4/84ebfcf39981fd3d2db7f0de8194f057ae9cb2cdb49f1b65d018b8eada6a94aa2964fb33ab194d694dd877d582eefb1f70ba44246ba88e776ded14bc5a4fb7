import { Primitive } from "../Primitive/Primitive.js";
import { injectEditableRootContext } from "./EditableRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, toDisplayString, unref, withCtx } from "vue";

//#region src/Editable/EditablePreview.vue?vue&type=script&setup=true&lang.ts
var EditablePreview_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "EditablePreview",
	props: {
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
		const context = injectEditableRootContext();
		const placeholder = computed(() => context.placeholder.value?.preview);
		function handleFocus() {
			if (context.activationMode.value === "focus") context.edit();
		}
		function handleDoubleClick() {
			if (context.activationMode.value === "dblclick") context.edit();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				tabindex: "0",
				"data-placeholder-shown": unref(context).isEditing.value ? void 0 : "",
				hidden: unref(context).autoResize.value ? void 0 : unref(context).isEditing.value,
				style: unref(context).autoResize.value ? {
					whiteSpace: "pre",
					userSelect: "none",
					gridArea: "1 / 1 / auto / auto",
					visibility: unref(context).isEditing.value ? "hidden" : void 0,
					overflow: "hidden",
					textOverflow: "ellipsis"
				} : void 0,
				onFocusin: handleFocus,
				onDblclick: handleDoubleClick
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [createTextVNode(toDisplayString(unref(context).modelValue.value || placeholder.value), 1)])]),
				_: 3
			}, 16, [
				"data-placeholder-shown",
				"hidden",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/Editable/EditablePreview.vue
var EditablePreview_default = EditablePreview_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { EditablePreview_default };
//# sourceMappingURL=EditablePreview.js.map