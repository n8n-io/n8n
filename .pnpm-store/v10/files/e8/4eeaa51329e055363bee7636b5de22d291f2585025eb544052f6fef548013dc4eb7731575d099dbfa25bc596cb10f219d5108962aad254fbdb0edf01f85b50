const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Toolbar/ToolbarRoot.vue?vue&type=script&setup=true&lang.ts
const [injectToolbarRootContext, provideToolbarRootContext] = require_shared_createContext.createContext("ToolbarRoot");
var ToolbarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ToolbarRoot",
	props: {
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
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
		}
	},
	setup(__props) {
		const props = __props;
		const { orientation, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		provideToolbarRootContext({
			orientation,
			dir
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default), {
				"as-child": "",
				orientation: (0, vue.unref)(orientation),
				dir: (0, vue.unref)(dir),
				loop: _ctx.loop
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					role: "toolbar",
					"aria-orientation": (0, vue.unref)(orientation),
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"aria-orientation",
					"as-child",
					"as"
				])]),
				_: 3
			}, 8, [
				"orientation",
				"dir",
				"loop"
			]);
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarRoot.vue
var ToolbarRoot_default = ToolbarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToolbarRoot_default', {
  enumerable: true,
  get: function () {
    return ToolbarRoot_default;
  }
});
Object.defineProperty(exports, 'injectToolbarRootContext', {
  enumerable: true,
  get: function () {
    return injectToolbarRootContext;
  }
});
//# sourceMappingURL=ToolbarRoot.cjs.map