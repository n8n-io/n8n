const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_DismissableLayer_DismissableLayer = require('./DismissableLayer.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DismissableLayer/DismissableLayerBranch.vue?vue&type=script&setup=true&lang.ts
var DismissableLayerBranch_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DismissableLayerBranch",
	props: {
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
		(0, vue.onMounted)(() => {
			require_DismissableLayer_DismissableLayer.context.branches.add(currentElement.value);
		});
		(0, vue.onUnmounted)(() => {
			require_DismissableLayer_DismissableLayer.context.branches.delete(currentElement.value);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({ ref: (0, vue.unref)(forwardRef) }, props), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/DismissableLayer/DismissableLayerBranch.vue
var DismissableLayerBranch_default = DismissableLayerBranch_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DismissableLayerBranch_default', {
  enumerable: true,
  get: function () {
    return DismissableLayerBranch_default;
  }
});
//# sourceMappingURL=DismissableLayerBranch.cjs.map