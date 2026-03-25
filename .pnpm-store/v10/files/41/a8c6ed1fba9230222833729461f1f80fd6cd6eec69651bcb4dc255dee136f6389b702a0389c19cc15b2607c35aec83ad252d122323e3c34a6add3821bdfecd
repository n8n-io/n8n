import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { createBlock, createVNode, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Toolbar/ToolbarRoot.vue?vue&type=script&setup=true&lang.ts
const [injectToolbarRootContext, provideToolbarRootContext] = createContext("ToolbarRoot");
var ToolbarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToolbarRoot",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
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
	setup(__props) {
		const props = __props;
		const { orientation, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const { forwardRef } = useForwardExpose();
		provideToolbarRootContext({
			orientation,
			dir
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusGroup_default), {
				"as-child": "",
				orientation: unref(orientation),
				dir: unref(dir),
				loop: _ctx.loop
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					role: "toolbar",
					"aria-orientation": unref(orientation),
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"aria-orientation",
					"as-child",
					"as"
				])]),
				_: 3
			}, 8, [
				"orientation",
				"dir",
				"loop"
			]);
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarRoot.vue
var ToolbarRoot_default = ToolbarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToolbarRoot_default, injectToolbarRootContext };
//# sourceMappingURL=ToolbarRoot.js.map