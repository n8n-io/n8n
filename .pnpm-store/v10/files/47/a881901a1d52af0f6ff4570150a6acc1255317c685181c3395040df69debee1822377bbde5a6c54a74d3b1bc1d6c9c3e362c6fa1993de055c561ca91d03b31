const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Combobox_ComboboxGroup = require('./ComboboxGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxLabel.vue?vue&type=script&setup=true&lang.ts
var ComboboxLabel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxLabel",
	props: {
		for: {
			type: String,
			required: false
		},
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
		require_shared_useForwardExpose.useForwardExpose();
		const groupContext = require_Combobox_ComboboxGroup.injectComboboxGroupContext({
			id: "",
			labelId: ""
		});
		groupContext.labelId ||= require_shared_useId.useId(void 0, "reka-combobox-group-label");
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, { id: (0, vue.unref)(groupContext).labelId }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxLabel.vue
var ComboboxLabel_default = ComboboxLabel_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxLabel_default', {
  enumerable: true,
  get: function () {
    return ComboboxLabel_default;
  }
});
//# sourceMappingURL=ComboboxLabel.cjs.map