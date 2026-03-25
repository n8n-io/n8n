import { useForwardExpose } from "../shared/useForwardExpose.js";
import { MenuSub_default } from "../Menu/MenuSub.js";
import { createBlock, defineComponent, isRef, openBlock, renderSlot, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/ContextMenu/ContextMenuSub.vue?vue&type=script&setup=true&lang.ts
var ContextMenuSub_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ContextMenuSub",
	props: {
		defaultOpen: {
			type: Boolean,
			required: false
		},
		open: {
			type: Boolean,
			required: false,
			default: void 0
		}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		useForwardExpose();
		const open = useVModel(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuSub_default), {
				open: unref(open),
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isRef(open) ? open.value = $event : null)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { open: unref(open) })]),
				_: 3
			}, 8, ["open"]);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuSub.vue
var ContextMenuSub_default = ContextMenuSub_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ContextMenuSub_default };
//# sourceMappingURL=ContextMenuSub.js.map