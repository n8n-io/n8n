import { createContext } from "../shared/createContext.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { injectMenuContext, provideMenuContext } from "./MenuRoot.js";
import { createBlock, defineComponent, openBlock, ref, renderSlot, unref, watchEffect, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Menu/MenuSub.vue?vue&type=script&setup=true&lang.ts
const [injectMenuSubContext, provideMenuSubContext] = createContext("MenuSub");
var MenuSub_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuSub",
	props: { open: {
		type: Boolean,
		required: false,
		default: void 0
	} },
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const open = useVModel(props, "open", emits, {
			defaultValue: false,
			passive: props.open === void 0
		});
		const parentMenuContext = injectMenuContext();
		const trigger = ref();
		const content = ref();
		watchEffect((cleanupFn) => {
			if (parentMenuContext?.open.value === false) open.value = false;
			cleanupFn(() => open.value = false);
		});
		provideMenuContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			content,
			onContentChange: (element) => {
				content.value = element;
			}
		});
		provideMenuSubContext({
			triggerId: "",
			contentId: "",
			trigger,
			onTriggerChange: (element) => {
				trigger.value = element;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperRoot_default), null, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Menu/MenuSub.vue
var MenuSub_default = MenuSub_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuSub_default, injectMenuSubContext };
//# sourceMappingURL=MenuSub.js.map