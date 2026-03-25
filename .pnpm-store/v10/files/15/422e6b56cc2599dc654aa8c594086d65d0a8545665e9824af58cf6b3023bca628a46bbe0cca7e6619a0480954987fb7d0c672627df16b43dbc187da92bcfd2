const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_TagsInput_TagsInputRoot = require('./TagsInputRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/TagsInput/TagsInputClear.vue?vue&type=script&setup=true&lang.ts
var TagsInputClear_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TagsInputClear",
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
		require_shared_useForwardExpose.useForwardExpose();
		const context = require_TagsInput_TagsInputRoot.injectTagsInputRootContext();
		function handleCancel() {
			if (context.disabled.value) return;
			context.modelValue.value = [];
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				type: _ctx.as === "button" ? "button" : void 0,
				"data-disabled": (0, vue.unref)(context).disabled.value ? "" : void 0,
				onClick: handleCancel
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["type", "data-disabled"]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputClear.vue
var TagsInputClear_default = TagsInputClear_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TagsInputClear_default', {
  enumerable: true,
  get: function () {
    return TagsInputClear_default;
  }
});
//# sourceMappingURL=TagsInputClear.cjs.map