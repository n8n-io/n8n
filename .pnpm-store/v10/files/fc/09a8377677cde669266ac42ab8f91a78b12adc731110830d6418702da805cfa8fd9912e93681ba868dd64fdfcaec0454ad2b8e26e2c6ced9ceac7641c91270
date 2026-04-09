const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_ColorField_ColorFieldRoot = require('./ColorFieldRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ColorField/ColorFieldInput.vue?vue&type=script&setup=true&lang.ts
var ColorFieldInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ColorFieldInput",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "input"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = require_ColorField_ColorFieldRoot.injectColorFieldRootContext();
		const isFocused = (0, vue.ref)(false);
		const inputType = (0, vue.computed)(() => {
			return rootContext.channel.value ? "text" : "text";
		});
		const inputMode = (0, vue.computed)(() => {
			return rootContext.channel.value ? "numeric" : "text";
		});
		function handleInput(event) {
			const target = event.target;
			rootContext.updateValue(target.value);
		}
		function handleBlur() {
			isFocused.value = false;
			rootContext.commit();
		}
		function handleFocus() {
			isFocused.value = true;
		}
		function handleWheel(event) {
			if (!isFocused.value) return;
			rootContext.handleWheel(event);
		}
		function handleKeydown(event) {
			switch (event.key) {
				case "ArrowUp":
					event.preventDefault();
					rootContext.increment();
					break;
				case "ArrowDown":
					event.preventDefault();
					rootContext.decrement();
					break;
				case "PageUp":
					event.preventDefault();
					rootContext.incrementPage();
					break;
				case "PageDown":
					event.preventDefault();
					rootContext.decrementPage();
					break;
				case "Home":
					event.preventDefault();
					rootContext.decrementToMin();
					break;
				case "End":
					event.preventDefault();
					rootContext.incrementToMax();
					break;
				case "Enter":
					event.preventDefault();
					rootContext.commit();
					break;
			}
		}
		function handleBeforeInput(event) {
			if (!rootContext.channel.value) return;
			const target = event.target;
			const data = event.data;
			if (data && !/[\d.-]/.test(data)) {
				event.preventDefault();
				return;
			}
			const nextValue = target.value.slice(0, target.selectionStart ?? void 0) + (data ?? "") + target.value.slice(target.selectionEnd ?? void 0);
			if (nextValue === "-" || nextValue === "." || nextValue === "-.") return;
			const numValue = parseFloat(nextValue);
			if (isNaN(numValue)) event.preventDefault();
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				"as-child": _ctx.asChild,
				as: _ctx.as,
				type: inputType.value,
				inputmode: inputMode.value,
				value: (0, vue.unref)(rootContext).inputValue.value,
				placeholder: (0, vue.unref)(rootContext).placeholder.value,
				disabled: (0, vue.unref)(rootContext).disabled.value,
				readonly: (0, vue.unref)(rootContext).readonly.value,
				"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				"data-readonly": (0, vue.unref)(rootContext).readonly.value ? "" : void 0,
				"aria-invalid": !(0, vue.unref)(rootContext).channel.value ? void 0 : void 0,
				onInput: handleInput,
				onBlur: handleBlur,
				onFocus: handleFocus,
				onKeydown: handleKeydown,
				onWheel: handleWheel,
				onBeforeinput: handleBeforeInput
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"type",
				"inputmode",
				"value",
				"placeholder",
				"disabled",
				"readonly",
				"data-disabled",
				"data-readonly",
				"aria-invalid"
			]);
		};
	}
});

//#endregion
//#region src/ColorField/ColorFieldInput.vue
var ColorFieldInput_default = ColorFieldInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ColorFieldInput_default', {
  enumerable: true,
  get: function () {
    return ColorFieldInput_default;
  }
});
//# sourceMappingURL=ColorFieldInput.cjs.map