import { getActiveElement } from "../shared/getActiveElement.js";
import { useArrowNavigation } from "../shared/useArrowNavigation.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectPinInputRootContext } from "./PinInputRoot.js";
import { computed, createBlock, defineComponent, nextTick, onMounted, onUnmounted, openBlock, renderSlot, unref, watch, withCtx, withKeys } from "vue";

//#region src/PinInput/PinInputInput.vue?vue&type=script&setup=true&lang.ts
var PinInputInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const context = injectPinInputRootContext();
		const inputElements = computed(() => Array.from(context.inputElements.value));
		const currentValue = computed(() => context.currentModelValue.value[props.index]);
		const disabled = computed(() => props.disabled || context.disabled.value);
		const isOtpMode = computed(() => context.otp.value);
		const isPasswordMode = computed(() => context.mask.value);
		const { primitiveElement, currentElement } = usePrimitiveElement();
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
			nextTick(() => {
				if (target && !target.value) target.placeholder = context.placeholder.value;
			});
		}
		function handleKeydown(event) {
			useArrowNavigation(event, getActiveElement(), void 0, {
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
		watch(currentValue, () => {
			if (!currentValue.value) resetPlaceholder();
		});
		onMounted(() => {
			context.onInputElementChange(currentElement.value);
		});
		onUnmounted(() => {
			context.inputElements?.value.delete(currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				autocapitalize: "none",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				autocomplete: isOtpMode.value ? "one-time-code" : "false",
				type: isPasswordMode.value ? "password" : "text",
				inputmode: unref(context).isNumericMode.value ? "numeric" : "text",
				pattern: unref(context).isNumericMode.value ? "[0-9]*" : void 0,
				placeholder: unref(context).placeholder.value,
				value: currentValue.value,
				disabled: disabled.value,
				"data-disabled": disabled.value ? "" : void 0,
				"data-complete": unref(context).isCompleted.value ? "" : void 0,
				"aria-label": `pin input ${_ctx.index + 1} of ${inputElements.value.length}`,
				onInput: _cache[0] || (_cache[0] = ($event) => handleInput($event)),
				onKeydown: [
					withKeys(handleKeydown, [
						"left",
						"right",
						"up",
						"down",
						"home",
						"end"
					]),
					withKeys(handleBackspace, ["backspace"]),
					withKeys(handleDelete, ["delete"])
				],
				onFocus: handleFocus,
				onBlur: handleBlur,
				onPaste: handlePaste
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { PinInputInput_default };
//# sourceMappingURL=PinInputInput.js.map