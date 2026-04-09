import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectMenuRootContext } from "../Menu/MenuRoot.js";
import { injectMenuContentContext } from "../Menu/MenuContentImpl.js";
import { injectMenuSubContext } from "../Menu/MenuSub.js";
import { computed, createBlock, defineComponent, onMounted, onUnmounted, openBlock, ref, renderSlot, unref, watch, watchSyncEffect, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/DropdownMenu/DropdownMenuFilter.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuFilter_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DropdownMenuFilter",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		autoFocus: {
			type: Boolean,
			required: false
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: "",
			passive: props.modelValue === void 0
		});
		const rootContext = injectMenuRootContext();
		const contentContext = injectMenuContentContext();
		const subContext = injectMenuSubContext(null);
		watch(modelValue, (v) => {
			contentContext.searchRef.value = v ?? "";
		}, { immediate: true });
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const disabled = computed(() => props.disabled || false);
		const activedescendant = ref();
		watchSyncEffect(() => activedescendant.value = contentContext.highlightedElement.value?.id);
		onMounted(() => {
			contentContext.onFilterElementChange(currentElement.value);
			setTimeout(() => {
				if (props.autoFocus) {
					const isSubmenu = !!subContext;
					if (!isSubmenu || rootContext.isUsingKeyboardRef.value) currentElement.value?.focus();
				}
			}, 1);
		});
		onUnmounted(() => {
			contentContext.onFilterElementChange(void 0);
			contentContext.searchRef.value = "";
		});
		function handleInput(event) {
			if (disabled.value) return;
			const target = event.target;
			modelValue.value = target.value;
			contentContext.searchRef.value = target.value;
		}
		function handleKeyDown(event) {
			if (disabled.value) return;
			if ([
				"ArrowDown",
				"ArrowUp",
				"Home",
				"End"
			].includes(event.key)) {
				event.preventDefault();
				contentContext.onKeydownNavigation(event);
			} else if (event.key === "Enter") {
				event.preventDefault();
				contentContext.onKeydownEnter(event);
			} else if (event.key === "Escape" && modelValue.value) {
				event.stopPropagation();
				modelValue.value = "";
				contentContext.searchRef.value = "";
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				value: unref(modelValue),
				disabled: disabled.value ? "" : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ? true : void 0,
				"aria-activedescendant": activedescendant.value,
				type: "text",
				role: "searchbox",
				onInput: handleInput,
				onKeydown: handleKeyDown
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"value",
				"disabled",
				"data-disabled",
				"aria-disabled",
				"aria-activedescendant"
			]);
		};
	}
});

//#endregion
//#region src/DropdownMenu/DropdownMenuFilter.vue
var DropdownMenuFilter_default = DropdownMenuFilter_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DropdownMenuFilter_default };
//# sourceMappingURL=DropdownMenuFilter.js.map