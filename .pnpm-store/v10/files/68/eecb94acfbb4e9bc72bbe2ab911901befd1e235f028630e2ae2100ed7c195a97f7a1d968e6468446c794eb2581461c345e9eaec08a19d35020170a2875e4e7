import { createContext } from "../shared/createContext.js";
import { MenuGroup_default } from "./MenuGroup.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Menu/MenuRadioGroup.vue?vue&type=script&setup=true&lang.ts
const [injectMenuRadioGroupContext, provideMenuRadioGroupContext] = createContext("MenuRadioGroup");
var MenuRadioGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuRadioGroup",
	props: {
		modelValue: {
			type: String,
			required: false,
			default: ""
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = useVModel(props, "modelValue", emits);
		provideMenuRadioGroupContext({
			modelValue,
			onValueChange: (payload) => {
				modelValue.value = payload;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(MenuGroup_default, normalizeProps(guardReactiveProps(props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menu/MenuRadioGroup.vue
var MenuRadioGroup_default = MenuRadioGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuRadioGroup_default, injectMenuRadioGroupContext };
//# sourceMappingURL=MenuRadioGroup.js.map