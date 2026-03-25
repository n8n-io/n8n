const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Popper_PopperAnchor = require('../Popper/PopperAnchor.cjs');
const require_Popover_PopoverRoot = require('./PopoverRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Popover/PopoverAnchor.vue?vue&type=script&setup=true&lang.ts
var PopoverAnchor_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopoverAnchor",
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
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Popover_PopoverRoot.injectPopoverRootContext();
		(0, vue.onBeforeMount)(() => {
			rootContext.hasCustomAnchor.value = true;
		});
		(0, vue.onUnmounted)(() => {
			rootContext.hasCustomAnchor.value = false;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popper_PopperAnchor.PopperAnchor_default), (0, vue.normalizeProps)((0, vue.guardReactiveProps)(props)), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Popover/PopoverAnchor.vue
var PopoverAnchor_default = PopoverAnchor_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopoverAnchor_default', {
  enumerable: true,
  get: function () {
    return PopoverAnchor_default;
  }
});
//# sourceMappingURL=PopoverAnchor.cjs.map