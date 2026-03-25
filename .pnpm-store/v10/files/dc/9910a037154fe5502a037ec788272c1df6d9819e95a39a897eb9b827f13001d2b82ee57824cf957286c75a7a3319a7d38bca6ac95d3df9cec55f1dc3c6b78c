const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Editable_EditableRoot = require('./EditableRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Editable/EditableCancelTrigger.vue?vue&type=script&setup=true&lang.ts
var EditableCancelTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "EditableCancelTrigger",
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
		const context = require_Editable_EditableRoot.injectEditableRootContext();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"aria-label": "cancel",
				"aria-disabled": (0, vue.unref)(context).disabled.value ? "" : void 0,
				"data-disabled": (0, vue.unref)(context).disabled.value ? "" : void 0,
				disabled: (0, vue.unref)(context).disabled.value,
				type: _ctx.as === "button" ? "button" : void 0,
				hidden: (0, vue.unref)(context).isEditing.value ? void 0 : "",
				onClick: (0, vue.unref)(context).cancel
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [_cache[0] || (_cache[0] = (0, vue.createTextVNode)("Cancel"))])]),
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
//#region src/Editable/EditableCancelTrigger.vue
var EditableCancelTrigger_default = EditableCancelTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'EditableCancelTrigger_default', {
  enumerable: true,
  get: function () {
    return EditableCancelTrigger_default;
  }
});
//# sourceMappingURL=EditableCancelTrigger.cjs.map