import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { handleSelect } from "./utils.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, toRefs, unref, withCtx, withModifiers } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/RadioGroup/Radio.vue?vue&type=script&setup=true&lang.ts
var Radio_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "Radio",
	props: {
		id: {
			type: String,
			required: false
		},
		value: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		checked: {
			type: Boolean,
			required: false,
			default: void 0
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["update:checked", "select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const checked = useVModel(props, "checked", emits, { passive: props.checked === void 0 });
		const { value } = toRefs(props);
		const { forwardRef, currentElement: triggerElement } = useForwardExpose();
		const isFormControl = useFormControl(triggerElement);
		const ariaLabel = computed(() => props.id && triggerElement.value ? document.querySelector(`[for="${props.id}"]`)?.innerText ?? props.value : void 0);
		function handleClick(event) {
			if (props.disabled) return;
			handleSelect(event, props.value, (ev) => {
				emits("select", ev);
				if (ev?.defaultPrevented) return;
				checked.value = true;
				if (isFormControl.value) ev.stopPropagation();
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				id: _ctx.id,
				ref: unref(forwardRef),
				role: "radio",
				type: _ctx.as === "button" ? "button" : void 0,
				as: _ctx.as,
				"aria-checked": unref(checked),
				"aria-label": ariaLabel.value,
				"as-child": _ctx.asChild,
				disabled: _ctx.disabled ? "" : void 0,
				"data-state": unref(checked) ? "checked" : "unchecked",
				"data-disabled": _ctx.disabled ? "" : void 0,
				value: unref(value),
				required: _ctx.required,
				name: _ctx.name,
				onClick: withModifiers(handleClick, ["stop"])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { checked: unref(checked) }), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
					key: 0,
					type: "radio",
					tabindex: "-1",
					value: unref(value),
					checked: !!unref(checked),
					name: _ctx.name,
					disabled: _ctx.disabled,
					required: _ctx.required
				}, null, 8, [
					"value",
					"checked",
					"name",
					"disabled",
					"required"
				])) : createCommentVNode("v-if", true)]),
				_: 3
			}, 16, [
				"id",
				"type",
				"as",
				"aria-checked",
				"aria-label",
				"as-child",
				"disabled",
				"data-state",
				"data-disabled",
				"value",
				"required",
				"name"
			]);
		};
	}
});

//#endregion
//#region src/RadioGroup/Radio.vue
var Radio_default = Radio_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { Radio_default };
//# sourceMappingURL=Radio.js.map