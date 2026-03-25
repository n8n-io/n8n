const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxTrigger.vue?vue&type=script&setup=true&lang.ts
var ComboboxTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ComboboxTrigger",
	props: {
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
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const disabled = (0, vue.computed)(() => props.disabled || rootContext.disabled.value || false);
		(0, vue.onMounted)(() => {
			if (currentElement.value) rootContext.onTriggerElementChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				ref: (0, vue.unref)(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				tabindex: "-1",
				"aria-label": "Show popup",
				"aria-haspopup": "listbox",
				"aria-expanded": (0, vue.unref)(rootContext).open.value,
				"aria-controls": (0, vue.unref)(rootContext).contentId,
				"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
				disabled: disabled.value,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ?? void 0,
				onClick: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).onOpenChange(!(0, vue.unref)(rootContext).open.value))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"aria-expanded",
				"aria-controls",
				"data-state",
				"disabled",
				"data-disabled",
				"aria-disabled"
			]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxTrigger.vue
var ComboboxTrigger_default = ComboboxTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ComboboxTrigger_default', {
  enumerable: true,
  get: function () {
    return ComboboxTrigger_default;
  }
});
//# sourceMappingURL=ComboboxTrigger.cjs.map