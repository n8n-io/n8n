import { createContext } from "../shared/createContext.js";
import { defineComponent, ref, renderSlot } from "vue";

//#region src/Popper/PopperRoot.vue?vue&type=script&setup=true&lang.ts
const [injectPopperRootContext, providePopperRootContext] = createContext("PopperRoot");
var PopperRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "PopperRoot",
	setup(__props) {
		const anchor = ref();
		providePopperRootContext({
			anchor,
			onAnchorChange: (element) => anchor.value = element
		});
		return (_ctx, _cache) => {
			return renderSlot(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Popper/PopperRoot.vue
var PopperRoot_default = PopperRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopperRoot_default, injectPopperRootContext };
//# sourceMappingURL=PopperRoot.js.map