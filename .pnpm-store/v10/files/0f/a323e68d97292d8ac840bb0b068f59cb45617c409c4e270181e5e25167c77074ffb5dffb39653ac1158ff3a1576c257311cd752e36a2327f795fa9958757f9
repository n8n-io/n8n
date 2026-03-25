const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_getActiveElement = require('../shared/getActiveElement.cjs');
const require_shared_useArrowNavigation = require('../shared/useArrowNavigation.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Primitive_usePrimitiveElement = require('../Primitive/usePrimitiveElement.cjs');
const require_PinInput_PinInputRoot = require('./PinInputRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/PinInput/PinInputInput.vue?vue&type=script&setup=true&lang.ts
var PinInputInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PinInputInput",
	props: {
		index: {
			type: Number,
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
			required: false,
			default: "input"
		}
	},
	setup(__props) {
		const props = __props;
		const context = require_PinInput_PinInputRoot.injectPinInputRootContext();
		const inputElements = (0, vue.computed)(() => Array.from(context.inputElements.value));
		const currentValue = (0, vue.computed)(() => context.currentModelValue.value[props.index]);
		const disabled = (0, vue.computed)(() => props.disabled || context.disabled.value);
		const isOtpMode = (0, vue.computed)(() => context.otp.value);
		const isPasswordMode = (0, vue.computed)(() => context.mask.value);
		const { primitiveElement, currentElement } = require_Primitive_usePrimitiveElement.usePrimitiveElement();
		function handleInput(event) {
			const target = event.target;
			if ((event.data?.length ?? 0) > 1) {
				handleMultipleCharacter(target.value);
				return;
			}
			if (context.isNumericMode.value && !/^\d*$/.test(target.value)) {
				target.value = target.value.replace(/\D/g, "");
				return;
			}
			target.value = event.data ?? "";
			updateModelValueAt(props.index, target.value);
			const nextEl = inputElements.value[props.index + 1];
			if (nextEl) nextEl.focus();
		}
		function resetPlaceholder() {
			const target = currentElement.value;
			(0, vue.nextTick)(() => {
				if (target && !target.value) target.placeholder = context.placeholder.value;
			});
		}
		function handleKeydown(event) {
			require_shared_useArrowNavigation.useArrowNavigation(event, require_shared_getActiveElement.getActiveElement(), void 0, {
				itemsArray: inputElements.value,
				focus: true,
				loop: false,
				arrowKeyOptions: "horizontal",
				dir: context.dir.value
			});
		}
		function handleBackspace(event) {
			event.preventDefault();
			const target = event.target;
			const value = target.value;
			if (value) updateModelValueAt(props.index, "");
			else {
				const prevEl = inputElements.value[props.index - 1];
				if (prevEl) {
					prevEl.focus();
					updateModelValueAt(props.index - 1, "");
				}
			}
		}
		function handleDelete(event) {
			if (event.key === "Delete") {
				event.preventDefault();
				updateModelValueAt(props.index, "");
			}
		}
		function handleFocus(event) {
			const target = event.target;
			target.setSelectionRange(1, 1);
			if (!target.value) target.placeholder = "";
		}
		function handleBlur(event) {
			resetPlaceholder();
		}
		function handlePaste(event) {
			event.preventDefault();
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;
			const values = clipboardData.getData("text");
			handleMultipleCharacter(values);
		}
		function handleMultipleCharacter(values) {
			const tempModelValue = [...context.currentModelValue.value];
			const initialIndex = values.length >= inputElements.value.length ? 0 : props.index;
			const lastIndex = Math.min(initialIndex + values.length, inputElements.value.length);
			for (let i = initialIndex; i < lastIndex; i++) {
				const input = inputElements.value[i];
				const value = values[i - initialIndex];
				if (context.isNumericMode.value && !/^\d*$/.test(value)) continue;
				tempModelValue[i] = value;
				input.focus();
			}
			context.modelValue.value = tempModelValue;
			inputElements.value[lastIndex]?.focus();
		}
		function removeTrailingEmptyStrings(input) {
			let i = input.length - 1;
			while (i >= 0 && input[i] === "") {
				input.pop();
				i--;
			}
			return input;
		}
		function updateModelValueAt(index, value) {
			const tempModelValue = [...context.currentModelValue.value];
			if (context.isNumericMode.value) {
				const num = +value;
				if (value === "" || isNaN(num)) delete tempModelValue[index];
				else tempModelValue[index] = num;
			} else tempModelValue[index] = value;
			context.modelValue.value = removeTrailingEmptyStrings(tempModelValue);
		}
		(0, vue.watch)(currentValue, () => {
			if (!currentValue.value) resetPlaceholder();
		});
		(0, vue.onMounted)(() => {
			context.onInputElementChange(currentElement.value);
		});
		(0, vue.onUnmounted)(() => {
			context.inputElements?.value.delete(currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				autocapitalize: "none",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				autocomplete: isOtpMode.value ? "one-time-code" : "false",
				type: isPasswordMode.value ? "password" : "text",
				inputmode: (0, vue.unref)(context).isNumericMode.value ? "numeric" : "text",
				pattern: (0, vue.unref)(context).isNumericMode.value ? "[0-9]*" : void 0,
				placeholder: (0, vue.unref)(context).placeholder.value,
				value: currentValue.value,
				disabled: disabled.value,
				"data-disabled": disabled.value ? "" : void 0,
				"data-complete": (0, vue.unref)(context).isCompleted.value ? "" : void 0,
				"aria-label": `pin input ${_ctx.index + 1} of ${inputElements.value.length}`,
				onInput: _cache[0] || (_cache[0] = ($event) => handleInput($event)),
				onKeydown: [
					(0, vue.withKeys)(handleKeydown, [
						"left",
						"right",
						"up",
						"down",
						"home",
						"end"
					]),
					(0, vue.withKeys)(handleBackspace, ["backspace"]),
					(0, vue.withKeys)(handleDelete, ["delete"])
				],
				onFocus: handleFocus,
				onBlur: handleBlur,
				onPaste: handlePaste
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"autocomplete",
				"type",
				"inputmode",
				"pattern",
				"placeholder",
				"value",
				"disabled",
				"data-disabled",
				"data-complete",
				"aria-label"
			]);
		};
	}
});

//#endregion
//#region src/PinInput/PinInputInput.vue
var PinInputInput_default = PinInputInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PinInputInput_default', {
  enumerable: true,
  get: function () {
    return PinInputInput_default;
  }
});
//# sourceMappingURL=PinInputInput.cjs.map