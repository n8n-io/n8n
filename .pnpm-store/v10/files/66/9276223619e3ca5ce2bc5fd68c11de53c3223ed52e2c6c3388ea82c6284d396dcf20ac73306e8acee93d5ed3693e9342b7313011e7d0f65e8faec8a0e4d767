import { Primitive } from "../Primitive/Primitive.js";
import { injectEditableRootContext } from "./EditableRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Editable/EditableArea.vue?vue&type=script&setup=true&lang.ts
var EditableArea_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "EditableArea",
	props: {
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
	setup(__props) {
		const props = __props;
		const context = injectEditableRootContext();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"data-placeholder-shown": unref(context).isEditing.value ? void 0 : "",
				"data-focus": unref(context).isEditing.value ? "" : void 0,
				"data-focused": unref(context).isEditing.value ? "" : void 0,
				"data-empty": unref(context).isEmpty.value ? "" : void 0,
				"data-readonly": unref(context).readonly.value ? "" : void 0,
				"data-disabled": unref(context).disabled.value ? "" : void 0,
				style: unref(context).autoResize.value ? { display: "inline-grid" } : void 0
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"data-placeholder-shown",
				"data-focus",
				"data-focused",
				"data-empty",
				"data-readonly",
				"data-disabled",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/Editable/EditableArea.vue
var EditableArea_default = EditableArea_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { EditableArea_default };
//# sourceMappingURL=EditableArea.js.map