const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_NumberField_NumberFieldRoot = require('./NumberFieldRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/NumberField/NumberFieldInput.vue?vue&type=script&setup=true&lang.ts
var NumberFieldInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "NumberFieldInput",
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
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		const rootContext = require_NumberField_NumberFieldRoot.injectNumberFieldRootContext();
		function handleWheelEvent(event) {
			if (rootContext.disableWheelChange.value) return;
			if (event.target !== require_shared_getActiveElement.getActiveElement()) return;
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			event.preventDefault();
			if (event.deltaY > 0) rootContext.invertWheelChange.value ? rootContext.handleDecrease() : rootContext.handleIncrease();
			else if (event.deltaY < 0) rootContext.invertWheelChange.value ? rootContext.handleIncrease() : rootContext.handleDecrease();
		}
		(0, vue.onMounted)(() => {
			rootContext.onInputElement(currentElement.value);
		});
		const inputValue = (0, vue.ref)(rootContext.textValue.value);
		(0, vue.watch)(() => rootContext.textValue.value, () => {
			inputValue.value = rootContext.textValue.value;
		}, {
			immediate: true,
			deep: true
		});
		function handleChange() {
			requestAnimationFrame(() => {
				inputValue.value = rootContext.textValue.value;
			});
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				id: (0, vue.unref)(rootContext).id.value,
				ref_key: "primitiveElement",
				ref: primitiveElement,
				value: inputValue.value,
				role: "spinbutton",
				type: "text",
				tabindex: "0",
				inputmode: (0, vue.unref)(rootContext).inputMode.value,
				disabled: (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
				readonly: (0, vue.unref)(rootContext).readonly.value ? "" : void 0,
				"data-readonly": (0, vue.unref)(rootContext).readonly.value ? "" : void 0,
				autocomplete: "off",
				autocorrect: "off",
				spellcheck: "false",
				"aria-roledescription": "Number field",
				"aria-valuenow": (0, vue.unref)(rootContext).modelValue.value,
				"aria-valuemin": (0, vue.unref)(rootContext).min.value,
				"aria-valuemax": (0, vue.unref)(rootContext).max.value,
				onKeydown: [
					_cache[0] || (_cache[0] = (0, vue.withKeys)((0, vue.withModifiers)(($event) => (0, vue.unref)(rootContext).handleIncrease(), ["prevent"]), ["up"])),
					_cache[1] || (_cache[1] = (0, vue.withKeys)((0, vue.withModifiers)(($event) => (0, vue.unref)(rootContext).handleDecrease(), ["prevent"]), ["down"])),
					_cache[2] || (_cache[2] = (0, vue.withKeys)((0, vue.withModifiers)(($event) => (0, vue.unref)(rootContext).handleIncrease(10), ["prevent"]), ["page-up"])),
					_cache[3] || (_cache[3] = (0, vue.withKeys)((0, vue.withModifiers)(($event) => (0, vue.unref)(rootContext).handleDecrease(10), ["prevent"]), ["page-down"])),
					_cache[4] || (_cache[4] = (0, vue.withKeys)((0, vue.withModifiers)(($event) => (0, vue.unref)(rootContext).handleMinMaxValue("min"), ["prevent"]), ["home"])),
					_cache[5] || (_cache[5] = (0, vue.withKeys)((0, vue.withModifiers)(($event) => (0, vue.unref)(rootContext).handleMinMaxValue("max"), ["prevent"]), ["end"])),
					_cache[8] || (_cache[8] = (0, vue.withKeys)(($event) => (0, vue.unref)(rootContext).applyInputValue($event.target?.value), ["enter"]))
				],
				onWheel: handleWheelEvent,
				onBeforeinput: _cache[6] || (_cache[6] = (event) => {
					const target = event.target;
					let nextValue = target.value.slice(0, target.selectionStart ?? void 0) + (event.data ?? "") + target.value.slice(target.selectionEnd ?? void 0);
					if (!(0, vue.unref)(rootContext).validate(nextValue)) event.preventDefault();
				}),
				onInput: _cache[7] || (_cache[7] = (event) => {
					const target = event.target;
					inputValue.value = target.value;
				}),
				onChange: handleChange,
				onBlur: _cache[9] || (_cache[9] = ($event) => (0, vue.unref)(rootContext).applyInputValue($event.target?.value))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"id",
				"value",
				"inputmode",
				"disabled",
				"data-disabled",
				"readonly",
				"data-readonly",
				"aria-valuenow",
				"aria-valuemin",
				"aria-valuemax"
			]);
		};
	}
});

//#endregion
//#region src/NumberField/NumberFieldInput.vue
var NumberFieldInput_default = NumberFieldInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NumberFieldInput_default', {
  enumerable: true,
  get: function () {
    return NumberFieldInput_default;
  }
});
//# sourceMappingURL=NumberFieldInput.cjs.map