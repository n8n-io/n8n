import { Primitive } from "../Primitive/Primitive.js";
import { injectColorFieldRootContext } from "./ColorFieldRoot.js";
import { computed, createBlock, defineComponent, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/ColorField/ColorFieldInput.vue?vue&type=script&setup=true&lang.ts
var ColorFieldInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectColorFieldRootContext();
		const isFocused = ref(false);
		const inputType = computed(() => {
			return rootContext.channel.value ? "text" : "text";
		});
		const inputMode = computed(() => {
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
			return openBlock(), createBlock(unref(Primitive), {
				"as-child": _ctx.asChild,
				as: _ctx.as,
				type: inputType.value,
				inputmode: inputMode.value,
				value: unref(rootContext).inputValue.value,
				placeholder: unref(rootContext).placeholder.value,
				disabled: unref(rootContext).disabled.value,
				readonly: unref(rootContext).readonly.value,
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
				"data-readonly": unref(rootContext).readonly.value ? "" : void 0,
				"aria-invalid": !unref(rootContext).channel.value ? void 0 : void 0,
				onInput: handleInput,
				onBlur: handleBlur,
				onFocus: handleFocus,
				onKeydown: handleKeydown,
				onWheel: handleWheel,
				onBeforeinput: handleBeforeInput
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { ColorFieldInput_default };
//# sourceMappingURL=ColorFieldInput.js.map