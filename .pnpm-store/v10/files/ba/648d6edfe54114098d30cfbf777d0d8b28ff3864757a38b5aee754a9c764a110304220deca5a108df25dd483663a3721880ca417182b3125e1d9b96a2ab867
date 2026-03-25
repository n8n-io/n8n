const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const require_Select_SelectContentImpl = require('./SelectContentImpl.cjs');
const require_Select_SelectItem = require('./SelectItem.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectItemText.vue?vue&type=script&setup=true&lang.ts
var SelectItemText_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "SelectItemText",
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
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		const contentContext = require_Select_SelectContentImpl.injectSelectContentContext();
		const itemContext = require_Select_SelectItem.injectSelectItemContext();
		const { forwardRef, currentElement: itemTextElement } = require_shared_useForwardExpose.useForwardExpose();
		const optionProps = (0, vue.computed)(() => {
			return {
				value: itemContext.value,
				disabled: itemContext.disabled.value,
				textContent: itemTextElement.value?.textContent ?? itemContext.value?.toString() ?? ""
			};
		});
		(0, vue.onMounted)(() => {
			if (!itemTextElement.value) return;
			itemContext.onItemTextChange(itemTextElement.value);
			contentContext.itemTextRefCallback(itemTextElement.value, itemContext.value, itemContext.disabled.value);
			rootContext.onOptionAdd(optionProps.value);
		});
		(0, vue.onUnmounted)(() => {
			rootContext.onOptionRemove(optionProps.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				id: (0, vue.unref)(itemContext).textId,
				ref: (0, vue.unref)(forwardRef)
			}, {
				...props,
				..._ctx.$attrs
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Select/SelectItemText.vue
var SelectItemText_default = SelectItemText_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectItemText_default', {
  enumerable: true,
  get: function () {
    return SelectItemText_default;
  }
});
//# sourceMappingURL=SelectItemText.cjs.map