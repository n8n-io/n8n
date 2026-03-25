const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Editable_EditableRoot = require('./EditableRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Editable/EditableArea.vue?vue&type=script&setup=true&lang.ts
var EditableArea_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const context = require_Editable_EditableRoot.injectEditableRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"data-placeholder-shown": (0, vue.unref)(context).isEditing.value ? void 0 : "",
				"data-focus": (0, vue.unref)(context).isEditing.value ? "" : void 0,
				"data-focused": (0, vue.unref)(context).isEditing.value ? "" : void 0,
				"data-empty": (0, vue.unref)(context).isEmpty.value ? "" : void 0,
				"data-readonly": (0, vue.unref)(context).readonly.value ? "" : void 0,
				"data-disabled": (0, vue.unref)(context).disabled.value ? "" : void 0,
				style: (0, vue.unref)(context).autoResize.value ? { display: "inline-grid" } : void 0
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'EditableArea_default', {
  enumerable: true,
  get: function () {
    return EditableArea_default;
  }
});
//# sourceMappingURL=EditableArea.cjs.map