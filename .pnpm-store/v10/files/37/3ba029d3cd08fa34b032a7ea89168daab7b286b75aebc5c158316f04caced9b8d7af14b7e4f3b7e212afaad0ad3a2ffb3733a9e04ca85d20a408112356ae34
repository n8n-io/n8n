import { useEmitAsProps } from "../shared/useEmitAsProps.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { ToggleGroupRoot_default } from "../ToggleGroup/ToggleGroupRoot.js";
import { injectToolbarRootContext } from "./ToolbarRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toolbar/ToolbarToggleGroup.vue?vue&type=script&setup=true&lang.ts
var ToolbarToggleGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToolbarToggleGroup",
	props: {
		rovingFocus: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		orientation: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		type: {
			type: String,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = injectToolbarRootContext();
		const emitsAsProps = useEmitAsProps(emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ToggleGroupRoot_default), mergeProps({
				...props,
				...unref(emitsAsProps)
			}, {
				"data-orientation": unref(rootContext).orientation.value,
				dir: unref(rootContext).dir.value,
				"roving-focus": false
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["data-orientation", "dir"]);
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarToggleGroup.vue
var ToolbarToggleGroup_default = ToolbarToggleGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToolbarToggleGroup_default };
//# sourceMappingURL=ToolbarToggleGroup.js.map