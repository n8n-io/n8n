import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectDialogRootContext } from "./DialogRoot.js";
import { createBlock, defineComponent, mergeProps, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Dialog/DialogTrigger.vue?vue&type=script&setup=true&lang.ts
var DialogTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DialogTrigger",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectDialogRootContext();
		const { forwardRef, currentElement } = useForwardExpose();
		rootContext.contentId ||= useId(void 0, "reka-dialog-content");
		onMounted(() => {
			rootContext.triggerElement.value = currentElement.value;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				ref: unref(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				"aria-haspopup": "dialog",
				"aria-expanded": unref(rootContext).open.value || false,
				"aria-controls": unref(rootContext).open.value ? unref(rootContext).contentId : void 0,
				"data-state": unref(rootContext).open.value ? "open" : "closed",
				onClick: unref(rootContext).onOpenToggle
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"aria-expanded",
				"aria-controls",
				"data-state",
				"onClick"
			]);
		};
	}
});

//#endregion
//#region src/Dialog/DialogTrigger.vue
var DialogTrigger_default = DialogTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DialogTrigger_default };
//# sourceMappingURL=DialogTrigger.js.map