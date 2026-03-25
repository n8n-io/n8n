const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Avatar_AvatarRoot = require('./AvatarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Avatar/AvatarFallback.vue?vue&type=script&setup=true&lang.ts
var AvatarFallback_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const rootContext = require_Avatar_AvatarRoot.injectAvatarRootContext();
		require_shared_useForwardExpose.useForwardExpose();
		const canRender = (0, vue.ref)(props.delayMs === void 0);
		(0, vue.watchEffect)((onCleanup) => {
			if (props.delayMs && __vueuse_shared.isClient) {
				const timerId = window.setTimeout(() => {
					canRender.value = true;
				}, props.delayMs);
				onCleanup(() => {
					window.clearTimeout(timerId);
				});
			}
		});
		return (_ctx, _cache) => {
			return canRender.value && (0, vue.unref)(rootContext).imageLoadingStatus.value !== "loaded" ? ((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				key: 0,
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as-child", "as"])) : (0, vue.createCommentVNode)("v-if", true);
		};
	}
});

//#endregion
//#region src/Avatar/AvatarFallback.vue
var AvatarFallback_default = AvatarFallback_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AvatarFallback_default', {
  enumerable: true,
  get: function () {
    return AvatarFallback_default;
  }
});
//# sourceMappingURL=AvatarFallback.cjs.map