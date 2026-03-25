const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Select_utils = require('./utils.cjs');
const require_Select_SelectRoot = require('./SelectRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/SelectValue.vue?vue&type=script&setup=true&lang.ts
var SelectValue_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SelectValue",
	props: {
		placeholder: {
			type: String,
			required: false,
			default: ""
		},
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
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Select_SelectRoot.injectSelectRootContext();
		(0, vue.onMounted)(() => {
			rootContext.valueElement = currentElement;
		});
		const selectedLabel = (0, vue.computed)(() => {
			let list = [];
			const options = Array.from(rootContext.optionsSet.value);
			const getOption = (value) => options.find((option) => require_Select_utils.valueComparator(value, option.value, rootContext.by));
			if (Array.isArray(rootContext.modelValue.value)) list = rootContext.modelValue.value.map((value) => getOption(value)?.textContent ?? "");
			else list = [getOption(rootContext.modelValue.value)?.textContent ?? ""];
			return list.filter(Boolean);
		});
		const slotText = (0, vue.computed)(() => {
			return selectedLabel.value.length ? selectedLabel.value.join(", ") : props.placeholder;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				style: { pointerEvents: "none" },
				"data-placeholder": selectedLabel.value.length ? void 0 : props.placeholder
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {
					selectedLabel: selectedLabel.value,
					modelValue: (0, vue.unref)(rootContext).modelValue.value
				}, () => [(0, vue.createTextVNode)((0, vue.toDisplayString)(slotText.value), 1)])]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-placeholder"
			]);
		};
	}
});

//#endregion
//#region src/Select/SelectValue.vue
var SelectValue_default = SelectValue_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SelectValue_default', {
  enumerable: true,
  get: function () {
    return SelectValue_default;
  }
});
//# sourceMappingURL=SelectValue.cjs.map