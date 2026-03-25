const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_VisuallyHidden_VisuallyHidden = require('../VisuallyHidden/VisuallyHidden.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Select/BubbleSelect.vue?vue&type=script&setup=true&lang.ts
var BubbleSelect_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "BubbleSelect",
	props: {
		autocomplete: {
			type: String,
			required: false
		},
		autofocus: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		form: {
			type: String,
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		size: {
			type: Number,
			required: false
		},
		value: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const selectElement = (0, vue.ref)();
		(0, vue.watch)(() => props.value, (cur, prev) => {
			const selectProto = window.HTMLSelectElement.prototype;
			const descriptor = Object.getOwnPropertyDescriptor(selectProto, "value");
			const setValue = descriptor.set;
			if (cur !== prev && setValue && selectElement.value) {
				const event = new Event("change", { bubbles: true });
				setValue.call(selectElement.value, cur);
				selectElement.value.dispatchEvent(event);
			}
		});
		/**
		* We purposefully use a `select` here to support form autofill as much
		* as possible.
		*
		* We purposefully do not add the `value` attribute here to allow the value
		* to be set programmatically and bubble to any parent form `onChange` event.
		*
		* We use `VisuallyHidden` rather than `display: "none"` because Safari autofill
		* won't work otherwise.
		*/
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_VisuallyHidden_VisuallyHidden.VisuallyHidden_default), { "as-child": "" }, {
				default: (0, vue.withCtx)(() => [(0, vue.createElementVNode)("select", (0, vue.mergeProps)({
					ref_key: "selectElement",
					ref: selectElement
				}, props), [(0, vue.renderSlot)(_ctx.$slots, "default")], 16)]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Select/BubbleSelect.vue
var BubbleSelect_default = BubbleSelect_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'BubbleSelect_default', {
  enumerable: true,
  get: function () {
    return BubbleSelect_default;
  }
});
//# sourceMappingURL=BubbleSelect.cjs.map