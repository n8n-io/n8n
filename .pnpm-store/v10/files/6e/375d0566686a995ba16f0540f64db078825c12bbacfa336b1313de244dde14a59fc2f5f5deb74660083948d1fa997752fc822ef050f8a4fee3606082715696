import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createBlock, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Collapsible/CollapsibleRoot.vue?vue&type=script&setup=true&lang.ts
const [injectCollapsibleRootContext, provideCollapsibleRootContext] = createContext("CollapsibleRoot");
var CollapsibleRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "CollapsibleRoot",
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
		disabled: {
			type: Boolean,
			required: false
		},
		unmountOnHide: {
			type: Boolean,
			required: false,
			default: true
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
	emits: ["update:open"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const open = useVModel(props, "open", emit, {
			defaultValue: props.defaultOpen,
			passive: props.open === void 0
		});
		const { disabled, unmountOnHide } = toRefs(props);
		provideCollapsibleRootContext({
			contentId: "",
			disabled,
			open,
			unmountOnHide,
			onOpenToggle: () => {
				if (disabled.value) return;
				open.value = !open.value;
			}
		});
		__expose({ open });
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				as: _ctx.as,
				"as-child": props.asChild,
				"data-state": unref(open) ? "open" : "closed",
				"data-disabled": unref(disabled) ? "" : void 0
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { open: unref(open) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"data-state",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/Collapsible/CollapsibleRoot.vue
var CollapsibleRoot_default = CollapsibleRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CollapsibleRoot_default, injectCollapsibleRootContext };
//# sourceMappingURL=CollapsibleRoot.js.map