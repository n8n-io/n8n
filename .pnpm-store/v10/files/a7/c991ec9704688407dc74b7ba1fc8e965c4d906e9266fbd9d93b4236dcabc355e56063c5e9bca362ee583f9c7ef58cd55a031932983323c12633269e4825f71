const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxEmpty.vue?vue&type=script&setup=true&lang.ts
var ComboboxEmpty_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxEmpty",
	props: {
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
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const isRender = (0, vue.computed)(() => rootContext.ignoreFilter.value ? rootContext.allItems.value.size === 0 : rootContext.filterState.value.count === 0);
		return (_ctx, _cache) => {
			return isRender.value ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.normalizeProps)((0, vue.mergeProps)({ key: 0 }, props)), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", {}, () => [_cache[0] || (_cache[0] = (0, vue.createTextVNode)("No options"))])]),
				_: 3
			}, 16)) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxEmpty.vue
var ComboboxEmpty_default = ComboboxEmpty_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxEmpty_default', {
  enumerable: true,
  get: function () {
    return ComboboxEmpty_default;
  }
});
//# sourceMappingURL=ComboboxEmpty.cjs.map