import { useKbd } from "../shared/useKbd.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectEditableRootContext } from "./EditableRoot.js";
import { computed, createBlock, defineComponent, mergeProps, nextTick, onMounted, openBlock, renderSlot, unref, watch, withCtx, withKeys } from "vue";

//#region src/Editable/EditableInput.vue?vue&type=script&setup=true&lang.ts
var EditableInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "EditableInput",
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
		const kbd = useKbd();
		const context = injectEditableRootContext();
		const disabled = computed(() => context.disabled.value);
		const placeholder = computed(() => context.placeholder.value?.edit);
		const { primitiveElement, currentElement: inputRef } = usePrimitiveElement();
		onMounted(() => {
			context.inputRef.value = inputRef.value;
			if (context.startWithEditMode.value) {
				context.inputRef.value?.focus({ preventScroll: true });
				if (context.selectOnFocus.value) context.inputRef.value?.select();
			}
		});
		watch(context.isEditing, (value) => {
			if (value) nextTick(() => {
				context.inputRef.value?.focus({ preventScroll: true });
				if (context.selectOnFocus.value) context.inputRef.value?.select();
			});
		});
		function handleSubmitKeyDown(event) {
			if ((context.submitMode.value === "enter" || context.submitMode.value === "both") && event.key === kbd.ENTER && !event.shiftKey && !event.metaKey) context.submit();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({
				ref_key: "primitiveElement",
				ref: primitiveElement
			}, props, {
				value: unref(context).inputValue.value,
				placeholder: placeholder.value,
				disabled: disabled.value,
				maxlength: unref(context).maxLength.value,
				"data-disabled": disabled.value ? "" : void 0,
				"data-readonly": unref(context).readonly.value ? "" : void 0,
				readonly: unref(context).readonly.value,
				"aria-label": "editable input",
				hidden: unref(context).autoResize.value ? void 0 : !unref(context).isEditing.value,
				style: unref(context).autoResize.value ? {
					all: "unset",
					gridArea: "1 / 1 / auto / auto",
					visibility: !unref(context).isEditing.value ? "hidden" : void 0
				} : void 0,
				onInput: _cache[0] || (_cache[0] = ($event) => unref(context).inputValue.value = $event.target.value),
				onKeydown: [withKeys(handleSubmitKeyDown, ["enter", "space"]), withKeys(unref(context).cancel, ["esc"])]
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"value",
				"placeholder",
				"disabled",
				"maxlength",
				"data-disabled",
				"data-readonly",
				"readonly",
				"hidden",
				"style",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/Editable/EditableInput.vue
var EditableInput_default = EditableInput_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { EditableInput_default };
//# sourceMappingURL=EditableInput.js.map