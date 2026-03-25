const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_TagsInput_TagsInputRoot = require('./TagsInputRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/TagsInput/TagsInputItem.vue?vue&type=script&setup=true&lang.ts
const [injectTagsInputItemContext, provideTagsInputItemContext] = require_shared_createContext.createContext("TagsInputItem");
var TagsInputItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TagsInputItem",
	props: {
		value: {
			type: [String, Object],
			required: true
		},
		disabled: {
			type: Boolean,
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
		const { value } = (0, vue.toRefs)(props);
		const context = require_TagsInput_TagsInputRoot.injectTagsInputRootContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionItem } = require_Collection_Collection.useCollection();
		const isSelected = (0, vue.computed)(() => context.selectedElement.value === currentElement.value);
		const disabled = (0, vue.computed)(() => props.disabled || context.disabled.value);
		const itemContext = provideTagsInputItemContext({
			value,
			isSelected,
			disabled,
			textId: "",
			displayValue: (0, vue.computed)(() => context.displayValue(value.value))
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), { value: (0, vue.unref)(value) }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"aria-labelledby": (0, vue.unref)(itemContext).textId,
					"aria-current": isSelected.value,
					"data-disabled": disabled.value ? "" : void 0,
					"data-state": isSelected.value ? "active" : "inactive"
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"aria-labelledby",
					"aria-current",
					"data-disabled",
					"data-state"
				])]),
				_: 3
			}, 8, ["value"]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputItem.vue
var TagsInputItem_default = TagsInputItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TagsInputItem_default', {
  enumerable: true,
  get: function () {
    return TagsInputItem_default;
  }
});
Object.defineProperty(exports, 'injectTagsInputItemContext', {
  enumerable: true,
  get: function () {
    return injectTagsInputItemContext;
  }
});
//# sourceMappingURL=TagsInputItem.cjs.map