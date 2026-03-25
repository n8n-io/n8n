const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Progress_ProgressRoot = require('./ProgressRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Progress/ProgressIndicator.vue?vue&type=script&setup=true&lang.ts
var ProgressIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ProgressIndicator",
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
		const rootContext = require_Progress_ProgressRoot.injectProgressRootContext();
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(props, {
				"data-state": (0, vue.unref)(rootContext).progressState.value,
				"data-value": (0, vue.unref)(rootContext).modelValue?.value ?? void 0,
				"data-max": (0, vue.unref)(rootContext).max.value
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"data-state",
				"data-value",
				"data-max"
			]);
		};
	}
});

//#endregion
//#region src/Progress/ProgressIndicator.vue
var ProgressIndicator_default = ProgressIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ProgressIndicator_default', {
  enumerable: true,
  get: function () {
    return ProgressIndicator_default;
  }
});
//# sourceMappingURL=ProgressIndicator.cjs.map