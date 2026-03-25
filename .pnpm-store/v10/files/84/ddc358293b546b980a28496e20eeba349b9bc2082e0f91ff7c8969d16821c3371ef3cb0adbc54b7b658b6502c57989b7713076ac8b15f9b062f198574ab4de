const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Avatar_AvatarRoot = require('./AvatarRoot.cjs');
const require_Avatar_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Avatar/AvatarImage.vue?vue&type=script&setup=true&lang.ts
var AvatarImage_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { src, referrerPolicy, crossOrigin } = (0, vue.toRefs)(props);
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Avatar_AvatarRoot.injectAvatarRootContext();
		const imageLoadingStatus = require_Avatar_utils.useImageLoadingStatus(src, {
			referrerPolicy,
			crossOrigin
		});
		(0, vue.watch)(imageLoadingStatus, (newValue) => {
			emits("loadingStatusChange", newValue);
			if (newValue !== "idle") rootContext.imageLoadingStatus.value = newValue;
		}, { immediate: true });
		return (_ctx, _cache) => {
			return (0, vue.withDirectives)(((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				role: "img",
				"as-child": _ctx.asChild,
				as: _ctx.as,
				src: (0, vue.unref)(src),
				"referrer-policy": (0, vue.unref)(referrerPolicy)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"src",
				"referrer-policy"
			])), [[vue.vShow, (0, vue.unref)(imageLoadingStatus) === "loaded"]]);
		};
	}
});

//#endregion
//#region src/Avatar/AvatarImage.vue
var AvatarImage_default = AvatarImage_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'AvatarImage_default', {
  enumerable: true,
  get: function () {
    return AvatarImage_default;
  }
});
//# sourceMappingURL=AvatarImage.cjs.map