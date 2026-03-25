const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useEmitAsProps = require('../shared/useEmitAsProps.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_ToggleGroup_ToggleGroupRoot = require('../ToggleGroup/ToggleGroupRoot.cjs');
const require_Toolbar_ToolbarRoot = require('./ToolbarRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Toolbar/ToolbarToggleGroup.vue?vue&type=script&setup=true&lang.ts
var ToolbarToggleGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToolbarToggleGroup",
	props: {
		rovingFocus: {
			type: Boolean,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		orientation: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		type: {
			type: String,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Toolbar_ToolbarRoot.injectToolbarRootContext();
		const emitsAsProps = require_shared_useEmitAsProps.useEmitAsProps(emits);
		require_shared_useForwardExpose.useForwardExpose();
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_ToggleGroup_ToggleGroupRoot.ToggleGroupRoot_default), (0, vue.mergeProps)({
				...props,
				...(0, vue.unref)(emitsAsProps)
			}, {
				"data-orientation": (0, vue.unref)(rootContext).orientation.value,
				dir: (0, vue.unref)(rootContext).dir.value,
				"roving-focus": false
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["data-orientation", "dir"]);
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarToggleGroup.vue
var ToolbarToggleGroup_default = ToolbarToggleGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToolbarToggleGroup_default', {
  enumerable: true,
  get: function () {
    return ToolbarToggleGroup_default;
  }
});
//# sourceMappingURL=ToolbarToggleGroup.cjs.map