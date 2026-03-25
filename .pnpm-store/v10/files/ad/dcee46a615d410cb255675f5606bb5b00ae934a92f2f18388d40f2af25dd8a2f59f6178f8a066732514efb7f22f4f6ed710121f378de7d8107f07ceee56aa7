import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectTagsInputRootContext } from "./TagsInputRoot.js";
import { createBlock, defineComponent, nextTick, onMounted, openBlock, ref, renderSlot, unref, withCtx, withKeys } from "vue";

//#region src/TagsInput/TagsInputInput.vue?vue&type=script&setup=true&lang.ts
var TagsInputInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TagsInputInput",
	props: {
		placeholder: {
			type: String,
			required: false
		},
		autoFocus: {
			type: Boolean,
			required: false
		},
		maxLength: {
			type: Number,
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
		const context = injectTagsInputRootContext();
		const { forwardRef, currentElement } = useForwardExpose();
		function handleBlur(event) {
			context.selectedElement.value = void 0;
			if (!context.addOnBlur.value) return;
			const target = event.target;
			if (!target.value) return;
			const isAdded = context.onAddValue(target.value);
			if (isAdded) target.value = "";
		}
		function handleTab(event) {
			if (!context.addOnTab.value) return;
			handleCustomKeydown(event);
		}
		const isComposing = ref(false);
		function onCompositionStart() {
			isComposing.value = true;
		}
		function onCompositionEnd() {
			nextTick(() => {
				isComposing.value = false;
			});
		}
		async function handleCustomKeydown(event) {
			if (isComposing.value) return;
			await nextTick();
			if (event.defaultPrevented) return;
			const target = event.target;
			if (!target.value) return;
			const isAdded = context.onAddValue(target.value);
			if (isAdded) target.value = "";
			event.preventDefault();
		}
		function handleInput(event) {
			context.isInvalidInput.value = false;
			if (event.data === null) return;
			const delimiter = context.delimiter.value;
			const matchesDelimiter = delimiter === event.data || delimiter instanceof RegExp && delimiter.test(event.data);
			if (matchesDelimiter) {
				const target = event.target;
				target.value = target.value.replace(delimiter, "");
				const isAdded = context.onAddValue(target.value);
				if (isAdded) target.value = "";
			}
		}
		function handlePaste(event) {
			if (context.addOnPaste.value) {
				event.preventDefault();
				const clipboardData = event.clipboardData;
				if (!clipboardData) return;
				const value = clipboardData.getData("text");
				if (context.delimiter.value) {
					const splitValue = value.split(context.delimiter.value);
					splitValue.forEach((v) => {
						context.onAddValue(v);
					});
				} else context.onAddValue(value);
			}
		}
		onMounted(() => {
			const inputEl = currentElement.value.nodeName === "INPUT" ? currentElement.value : currentElement.value.querySelector("input");
			if (!inputEl) return;
			setTimeout(() => {
				if (props.autoFocus) inputEl?.focus();
			}, 1);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				id: unref(context).id?.value,
				ref: unref(forwardRef),
				type: "text",
				autocomplete: "off",
				autocorrect: "off",
				autocapitalize: "off",
				as: _ctx.as,
				"as-child": _ctx.asChild,
				maxlength: _ctx.maxLength,
				placeholder: _ctx.placeholder,
				disabled: unref(context).disabled.value,
				"data-invalid": unref(context).isInvalidInput.value ? "" : void 0,
				onInput: handleInput,
				onKeydown: [
					withKeys(handleCustomKeydown, ["enter"]),
					withKeys(handleTab, ["tab"]),
					unref(context).onInputKeydown
				],
				onBlur: handleBlur,
				onCompositionstart: onCompositionStart,
				onCompositionend: onCompositionEnd,
				onPaste: handlePaste
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"id",
				"as",
				"as-child",
				"maxlength",
				"placeholder",
				"disabled",
				"data-invalid",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputInput.vue
var TagsInputInput_default = TagsInputInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TagsInputInput_default };
//# sourceMappingURL=TagsInputInput.js.map