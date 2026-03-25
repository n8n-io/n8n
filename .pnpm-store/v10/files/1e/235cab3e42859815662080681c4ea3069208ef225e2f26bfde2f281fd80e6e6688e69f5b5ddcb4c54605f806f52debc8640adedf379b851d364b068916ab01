import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createBlock, defineComponent, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/Avatar/AvatarRoot.vue?vue&type=script&setup=true&lang.ts
const [injectAvatarRootContext, provideAvatarRootContext] = createContext("AvatarRoot");
var AvatarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AvatarRoot",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		useForwardExpose();
		provideAvatarRootContext({ imageLoadingStatus: ref("idle") });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"]);
		};
	}
});

//#endregion
//#region src/Avatar/AvatarRoot.vue
var AvatarRoot_default = AvatarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AvatarRoot_default, injectAvatarRootContext };
//# sourceMappingURL=AvatarRoot.js.map