import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectAvatarRootContext } from "./AvatarRoot.js";
import { createBlock, createCommentVNode, defineComponent, openBlock, ref, renderSlot, unref, watchEffect, withCtx } from "vue";
import { isClient } from "@vueuse/shared";

//#region src/Avatar/AvatarFallback.vue?vue&type=script&setup=true&lang.ts
var AvatarFallback_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "AvatarFallback",
	props: {
		delayMs: {
			type: Number,
			required: false
		},
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
		const props = __props;
		const rootContext = injectAvatarRootContext();
		useForwardExpose();
		const canRender = ref(props.delayMs === void 0);
		watchEffect((onCleanup) => {
			if (props.delayMs && isClient) {
				const timerId = window.setTimeout(() => {
					canRender.value = true;
				}, props.delayMs);
				onCleanup(() => {
					window.clearTimeout(timerId);
				});
			}
		});
		return (_ctx, _cache) => {
			return canRender.value && unref(rootContext).imageLoadingStatus.value !== "loaded" ? (openBlock(), createBlock(unref(Primitive), {
				key: 0,
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"])) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Avatar/AvatarFallback.vue
var AvatarFallback_default = AvatarFallback_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { AvatarFallback_default };
//# sourceMappingURL=AvatarFallback.js.map