import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { useIsUsingKeyboard } from "../shared/useIsUsingKeyboard.js";
import { createBlock, defineComponent, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Menu/MenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectMenuContext, provideMenuContext] = createContext(["MenuRoot", "MenuSub"], "MenuContext");
const [injectMenuRootContext, provideMenuRootContext] = createContext("MenuRoot");
var MenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuRoot",
	props: {
		open: {
			type: Boolean,
			required: false,
			default: false
		},
		dir: {
			type: String,
			required: false
		},
		modal: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { modal, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const open = useVModel(props, "open", emits);
		const content = ref();
		const isUsingKeyboardRef = useIsUsingKeyboard();
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
		provideMenuRootContext({
			onClose: () => {
				open.value = false;
			},
			isUsingKeyboardRef,
			dir,
			modal
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
//#region src/Menu/MenuRoot.vue
var MenuRoot_default = MenuRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuRoot_default, injectMenuContext, injectMenuRootContext, provideMenuContext };
//# sourceMappingURL=MenuRoot.js.map