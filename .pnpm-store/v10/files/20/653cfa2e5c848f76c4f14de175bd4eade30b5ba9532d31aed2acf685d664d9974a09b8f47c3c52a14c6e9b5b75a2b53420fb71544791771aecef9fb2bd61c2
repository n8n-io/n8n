import { Primitive } from "../Primitive/Primitive.js";
import { injectYearPickerRootContext } from "./YearPickerRoot.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/YearPicker/YearPickerGrid.vue?vue&type=script&setup=true&lang.ts
var YearPickerGrid_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "YearPickerGrid",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "table"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectYearPickerRootContext();
		const disabled = computed(() => rootContext.disabled.value ? true : void 0);
		const readonly = computed(() => rootContext.readonly.value ? true : void 0);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				tabindex: "-1",
				role: "application",
				"aria-labelledby": unref(rootContext).headingId,
				"aria-readonly": readonly.value,
				"aria-disabled": disabled.value,
				"data-readonly": readonly.value && "",
				"data-disabled": disabled.value && ""
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"aria-labelledby",
				"aria-readonly",
				"aria-disabled",
				"data-readonly",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/YearPicker/YearPickerGrid.vue
var YearPickerGrid_default = YearPickerGrid_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { YearPickerGrid_default };
//# sourceMappingURL=YearPickerGrid.js.map