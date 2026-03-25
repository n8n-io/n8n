const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_TagsInput_TagsInputRoot = require('./TagsInputRoot.cjs');
const require_TagsInput_TagsInputItem = require('./TagsInputItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const ohash = require_rolldown_runtime.__toESM(require("ohash"));

//#region src/TagsInput/TagsInputItemDelete.vue?vue&type=script&setup=true&lang.ts
var TagsInputItemDelete_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TagsInputItemDelete",
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
		const itemContext = require_TagsInput_TagsInputItem.injectTagsInputItemContext();
		const disabled = (0, vue.computed)(() => itemContext.disabled?.value || context.disabled.value);
		function handleDelete() {
			if (disabled.value) return;
			const index = context.modelValue.value.findIndex((i) => (0, ohash.isEqual)(i, itemContext.value.value));
			context.onRemoveValue(index);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ tabindex: "-1" }, props, {
				"aria-labelledby": (0, vue.unref)(itemContext).textId,
				"aria-current": (0, vue.unref)(itemContext).isSelected.value,
				"data-state": (0, vue.unref)(itemContext).isSelected.value ? "active" : "inactive",
				"data-disabled": disabled.value ? "" : void 0,
				type: _ctx.as === "button" ? "button" : void 0,
				onClick: handleDelete
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"aria-labelledby",
				"aria-current",
				"data-state",
				"data-disabled",
				"type"
			]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputItemDelete.vue
var TagsInputItemDelete_default = TagsInputItemDelete_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TagsInputItemDelete_default', {
  enumerable: true,
  get: function () {
    return TagsInputItemDelete_default;
  }
});
//# sourceMappingURL=TagsInputItemDelete.cjs.map