import { Primitive } from "../Primitive/Primitive.js";
import { injectEditableRootContext } from "./EditableRoot.js";
import { createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Editable/EditableEditTrigger.vue?vue&type=script&setup=true&lang.ts
var EditableEditTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "EditableEditTrigger",
	props: {
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
		const context = injectEditableRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"aria-label": "edit",
				"aria-disabled": unref(context).disabled.value ? "" : void 0,
				"data-disabled": unref(context).disabled.value ? "" : void 0,
				disabled: unref(context).disabled.value,
				type: _ctx.as === "button" ? "button" : void 0,
				hidden: unref(context).isEditing.value ? "" : void 0,
				onClick: unref(context).edit
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [_cache[0] || (_cache[0] = createTextVNode("Edit"))])]),
				_: 3
			}, 16, [
				"aria-disabled",
				"data-disabled",
				"disabled",
				"type",
				"hidden",
				"onClick"
			]);
		};
	}
});

//#endregion
//#region src/Editable/EditableEditTrigger.vue
var EditableEditTrigger_default = EditableEditTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { EditableEditTrigger_default };
//# sourceMappingURL=EditableEditTrigger.js.map