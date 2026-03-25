import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectAvatarRootContext } from "./AvatarRoot.js";
import { useImageLoadingStatus } from "./utils.js";
import { createBlock, defineComponent, openBlock, renderSlot, toRefs, unref, vShow, watch, withCtx, withDirectives } from "vue";

//#region src/Avatar/AvatarImage.vue?vue&type=script&setup=true&lang.ts
var AvatarImage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AvatarImage",
	props: {
		src: {
			type: String,
			required: true
		},
		referrerPolicy: {
			type: null,
			required: false
		},
		crossOrigin: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "img"
		}
	},
	emits: ["loadingStatusChange"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { src, referrerPolicy, crossOrigin } = toRefs(props);
		useForwardExpose();
		const rootContext = injectAvatarRootContext();
		const imageLoadingStatus = useImageLoadingStatus(src, {
			referrerPolicy,
			crossOrigin
		});
		watch(imageLoadingStatus, (newValue) => {
			emits("loadingStatusChange", newValue);
			if (newValue !== "idle") rootContext.imageLoadingStatus.value = newValue;
		}, { immediate: true });
		return (_ctx, _cache) => {
			return withDirectives((openBlock(), createBlock(unref(Primitive), {
				role: "img",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				src: unref(src),
				"referrer-policy": unref(referrerPolicy)
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"src",
				"referrer-policy"
			])), [[vShow, unref(imageLoadingStatus) === "loaded"]]);
		};
	}
});

//#endregion
//#region src/Avatar/AvatarImage.vue
var AvatarImage_default = AvatarImage_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AvatarImage_default };
//# sourceMappingURL=AvatarImage.js.map