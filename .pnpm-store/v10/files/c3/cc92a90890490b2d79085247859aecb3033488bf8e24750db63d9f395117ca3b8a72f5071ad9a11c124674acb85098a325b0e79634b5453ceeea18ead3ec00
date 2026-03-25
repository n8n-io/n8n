const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Editable_EditableRoot = require('./EditableRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Editable/EditablePreview.vue?vue&type=script&setup=true&lang.ts
var EditablePreview_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const context = require_Editable_EditableRoot.injectEditableRootContext();
		const placeholder = (0, vue.computed)(() => context.placeholder.value?.preview);
		function handleFocus() {
			if (context.activationMode.value === "focus") context.edit();
		}
		function handleDoubleClick() {
			if (context.activationMode.value === "dblclick") context.edit();
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				tabindex: "0",
				"data-placeholder-shown": (0, vue.unref)(context).isEditing.value ? void 0 : "",
				hidden: (0, vue.unref)(context).autoResize.value ? void 0 : (0, vue.unref)(context).isEditing.value,
				style: (0, vue.unref)(context).autoResize.value ? {
					whiteSpace: "pre",
					userSelect: "none",
					gridArea: "1 / 1 / auto / auto",
					visibility: (0, vue.unref)(context).isEditing.value ? "hidden" : void 0,
					overflow: "hidden",
					textOverflow: "ellipsis"
				} : void 0,
				onFocusin: handleFocus,
				onDblclick: handleDoubleClick
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)((0, vue.unref)(context).modelValue.value || placeholder.value), 1)])]),
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
Object.defineProperty(exports, 'EditablePreview_default', {
  enumerable: true,
  get: function () {
    return EditablePreview_default;
  }
});
//# sourceMappingURL=EditablePreview.cjs.map