import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { MenuRoot_default } from "../Menu/MenuRoot.js";
import { createBlock, defineComponent, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";

//#region src/ContextMenu/ContextMenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectContextMenuRootContext, provideContextMenuRootContext] = createContext("ContextMenuRoot");
var ContextMenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ContextMenuRoot",
	props: {
		pressOpenDelay: {
			type: Number,
			required: false,
			default: 700
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
		const { dir: propDir, modal, pressOpenDelay } = toRefs(props);
		useForwardExpose();
		const dir = useDirection(propDir);
		const open = ref(false);
		const triggerElement = ref();
		provideContextMenuRootContext({
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			dir,
			modal,
			triggerElement,
			pressOpenDelay
		});
		watch(open, (value) => {
			emits("update:open", value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuRoot_default), {
				open: open.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => open.value = $event),
				dir: unref(dir),
				modal: unref(modal)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"open",
				"dir",
				"modal"
			]);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuRoot.vue
var ContextMenuRoot_default = ContextMenuRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ContextMenuRoot_default, injectContextMenuRootContext };
//# sourceMappingURL=ContextMenuRoot.js.map