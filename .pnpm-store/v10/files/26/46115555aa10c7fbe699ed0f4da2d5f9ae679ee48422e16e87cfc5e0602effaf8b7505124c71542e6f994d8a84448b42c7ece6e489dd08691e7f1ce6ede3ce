import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { MenuRoot_default } from "../Menu/MenuRoot.js";
import { injectMenubarRootContext } from "./MenubarRoot.js";
import { computed, createBlock, defineComponent, openBlock, ref, renderSlot, unref, watch, withCtx } from "vue";

//#region src/Menubar/MenubarMenu.vue?vue&type=script&setup=true&lang.ts
const [injectMenubarMenuContext, provideMenubarMenuContext] = createContext("MenubarMenu");
var MenubarMenu_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenubarMenu",
	props: { value: {
		type: String,
		required: false
	} },
	setup(__props) {
		const props = __props;
		const value = useId(props.value);
		const rootContext = injectMenubarRootContext();
		useForwardExpose();
		const triggerElement = ref();
		const wasKeyboardTriggerOpenRef = ref(false);
		const open = computed(() => rootContext.modelValue.value === value);
		watch(open, () => {
			if (!open.value) wasKeyboardTriggerOpenRef.value = false;
		});
		provideMenubarMenuContext({
			value,
			triggerElement,
			triggerId: value,
			contentId: "",
			wasKeyboardTriggerOpenRef
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuRoot_default), {
				open: open.value,
				modal: false,
				dir: unref(rootContext).dir.value,
				"onUpdate:open": _cache[0] || (_cache[0] = (value$1) => {
					if (!value$1) unref(rootContext).onMenuClose();
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["open", "dir"]);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarMenu.vue
var MenubarMenu_default = MenubarMenu_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenubarMenu_default, injectMenubarMenuContext };
//# sourceMappingURL=MenubarMenu.js.map