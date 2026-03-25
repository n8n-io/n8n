const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_shared_useNonce = require('../shared/useNonce.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Viewport/Viewport.vue?vue&type=script&setup=true&lang.ts
var Viewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "Viewport",
	props: {
		nonce: {
			type: String,
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
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const { nonce: propNonce } = (0, vue.toRefs)(props);
		const nonce = require_shared_useNonce.useNonce(propNonce);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				..._ctx.$attrs,
				...props
			}, {
				ref: (0, vue.unref)(forwardRef),
				"data-reka-viewport": "",
				role: "presentation",
				style: {
					position: "relative",
					flex: 1,
					overflow: "auto"
				}
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16), (0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				as: "style",
				nonce: (0, vue.unref)(nonce)
			}, {
				default: (0, vue.withCtx)(() => _cache[0] || (_cache[0] = [(0, vue.createTextVNode)(" /* Hide scrollbars cross-browser and enable momentum scroll for touch devices */ [data-reka-viewport] { scrollbar-width:none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; } [data-reka-viewport]::-webkit-scrollbar { display: none; } ")])),
				_: 1,
				__: [0]
			}, 8, ["nonce"])], 64);
		};
	}
});

//#endregion
//#region src/Viewport/Viewport.vue
var Viewport_default = Viewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'Viewport_default', {
  enumerable: true,
  get: function () {
    return Viewport_default;
  }
});
//# sourceMappingURL=Viewport.cjs.map