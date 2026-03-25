const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Popper_PopperRoot = require('./PopperRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Popper/PopperAnchor.vue?vue&type=script&setup=true&lang.ts
var PopperAnchor_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopperAnchor",
	props: {
		reference: {
			type: null,
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
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Popper_PopperRoot.injectPopperRootContext();
		(0, vue.watchPostEffect)(() => {
			rootContext.onAnchorChange(props.reference ?? currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as", "as-child"]);
		};
	}
});

//#endregion
//#region src/Popper/PopperAnchor.vue
var PopperAnchor_default = PopperAnchor_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopperAnchor_default', {
  enumerable: true,
  get: function () {
    return PopperAnchor_default;
  }
});
//# sourceMappingURL=PopperAnchor.cjs.map