import { createContext } from "../shared/createContext.js";
import { PopperRoot_default } from "../Popper/PopperRoot.js";
import { createBlock, defineComponent, openBlock, ref, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Popover/PopoverRoot.vue?vue&type=script&setup=true&lang.ts
const [injectPopoverRootContext, providePopoverRootContext] = createContext("PopoverRoot");
var PopoverRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopoverRoot",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false,
			default: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		},
		modal: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { modal } = toRefs(props);
		const open = useVModel(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const triggerElement = ref();
		const hasCustomAnchor = ref(false);
		providePopoverRootContext({
			contentId: "",
			triggerId: "",
			modal,
			open,
			onOpenChange: (value) => {
				open.value = value;
			},
			onOpenToggle: () => {
				open.value = !open.value;
			},
			triggerElement,
			hasCustomAnchor
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperRoot_default), null, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					open: unref(open),
					close: () => open.value = false
				})]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Popover/PopoverRoot.vue
var PopoverRoot_default = PopoverRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopoverRoot_default, injectPopoverRootContext };
//# sourceMappingURL=PopoverRoot.js.map