import { $d as init_runtime_core_esm_bundler, Hd as createElementBlock, Jd as defineComponent, Vd as createCommentVNode, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default } from "./app-D5flEmb-.js";
//#region src/features/ai/chatHub/components/SkeletonAgentCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var SkeletonAgentCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SkeletonAgentCard",
	props: { showActionButton: {
		type: Boolean,
		default: true
	} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.card) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.avatar) }, null, 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.skeleton, _ctx.$style.title]) }, null, 2), createBaseVNode("div", { class: normalizeClass([_ctx.$style.skeleton, _ctx.$style.description]) }, null, 2)], 2),
				__props.showActionButton ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.skeleton, _ctx.$style.actionButton])
				}, null, 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_4c8og_450",
	skeleton: "_skeleton_4c8og_460",
	"skeleton-pulse": "_skeleton-pulse_4c8og_1",
	avatar: "_avatar_4c8og_476",
	content: "_content_4c8og_493",
	title: "_title_4c8og_501",
	description: "_description_4c8og_506",
	actionButton: "_actionButton_4c8og_511",
	shimmer: "_shimmer_4c8og_1",
	spin: "_spin_4c8og_1",
	opacityPulse: "_opacityPulse_4c8og_1",
	popoverIn: "_popoverIn_4c8og_1",
	fadeIn: "_fadeIn_4c8og_1",
	collapsibleSlideDown: "_collapsibleSlideDown_4c8og_1",
	collapsibleSlideUp: "_collapsibleSlideUp_4c8og_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_4c8og_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_4c8og_1",
	blurSwapIn: "_blurSwapIn_4c8og_1",
	blurSwapOut: "_blurSwapOut_4c8og_1",
	pulse: "_pulse_4c8og_1",
	pulseGlow: "_pulseGlow_4c8og_1",
	pulseGlowDelayed: "_pulseGlowDelayed_4c8og_1",
	fade: "_fade_4c8og_1",
	fadeInUp: "_fadeInUp_4c8og_1",
	fadeInDown: "_fadeInDown_4c8og_1",
	fadeInLeft: "_fadeInLeft_4c8og_1",
	fadeInRight: "_fadeInRight_4c8og_1",
	fadeOut: "_fadeOut_4c8og_1",
	fadeOutDown: "_fadeOutDown_4c8og_1",
	fadeOutUp: "_fadeOutUp_4c8og_1",
	fadeOutLeft: "_fadeOutLeft_4c8og_1",
	fadeOutRight: "_fadeOutRight_4c8og_1",
	ping: "_ping_4c8og_1",
	blinkBackground: "_blinkBackground_4c8og_1",
	typingBlink: "_typingBlink_4c8og_1"
} }]]);
//#endregion
export { SkeletonAgentCard_default as t };
