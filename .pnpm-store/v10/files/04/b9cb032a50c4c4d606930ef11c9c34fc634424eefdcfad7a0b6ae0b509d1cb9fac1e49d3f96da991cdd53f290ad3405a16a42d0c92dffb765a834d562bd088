const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Tabs/TabsRoot.vue?vue&type=script&setup=true&lang.ts
const [injectTabsRootContext, provideTabsRootContext] = require_shared_createContext.createContext("TabsRoot");
var TabsRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "TabsRoot",
	props: {
		defaultValue: {
			type: null,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false
		},
		activationMode: {
			type: String,
			required: false,
			default: "automatic"
		},
		modelValue: {
			type: null,
			required: false
		},
		unmountOnHide: {
			type: Boolean,
			required: false,
			default: true
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { orientation, unmountOnHide, dir: propDir } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		require_shared_useForwardExpose.useForwardExpose();
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const tabsList = (0, vue.ref)();
		provideTabsRootContext({
			modelValue,
			changeModelValue: (value) => {
				modelValue.value = value;
			},
			orientation,
			dir,
			unmountOnHide,
			activationMode: props.activationMode,
			baseId: require_shared_useId.useId(void 0, "reka-tabs"),
			tabsList
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				dir: (0, vue.unref)(dir),
				"data-orientation": (0, vue.unref)(orientation),
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
				_: 3
			}, 8, [
				"dir",
				"data-orientation",
				"as-child",
				"as"
			]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsRoot.vue
var TabsRoot_default = TabsRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'TabsRoot_default', {
  enumerable: true,
  get: function () {
    return TabsRoot_default;
  }
});
Object.defineProperty(exports, 'injectTabsRootContext', {
  enumerable: true,
  get: function () {
    return injectTabsRootContext;
  }
});
//# sourceMappingURL=TabsRoot.cjs.map