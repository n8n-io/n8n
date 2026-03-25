const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_RovingFocus_RovingFocusGroup = require('../RovingFocus/RovingFocusGroup.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Menubar/MenubarRoot.vue?vue&type=script&setup=true&lang.ts
const [injectMenubarRootContext, provideMenubarRootContext] = require_shared_createContext.createContext("MenubarRoot");
var MenubarRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenubarRoot",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		defaultValue: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionSlot } = require_Collection_Collection.useCollection({
			key: "Menubar",
			isProvider: true
		});
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emit, {
			defaultValue: props.defaultValue ?? "",
			passive: props.modelValue === void 0
		});
		const currentTabStopId = (0, vue.ref)(null);
		const { dir: propDir, loop } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		provideMenubarRootContext({
			modelValue,
			dir,
			loop,
			onMenuOpen: (value) => {
				modelValue.value = value;
				currentTabStopId.value = value;
			},
			onMenuClose: () => {
				modelValue.value = "";
			},
			onMenuToggle: (value) => {
				modelValue.value = modelValue.value ? "" : value;
				currentTabStopId.value = value;
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_RovingFocus_RovingFocusGroup.RovingFocusGroup_default), {
					"current-tab-stop-id": currentTabStopId.value,
					"onUpdate:currentTabStopId": _cache[0] || (_cache[0] = ($event) => currentTabStopId.value = $event),
					orientation: "horizontal",
					loop: (0, vue.unref)(loop),
					dir: (0, vue.unref)(dir),
					"as-child": ""
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
						ref: (0, vue.unref)(forwardRef),
						role: "menubar"
					}, {
						default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
						_: 3
					}, 512)]),
					_: 3
				}, 8, [
					"current-tab-stop-id",
					"loop",
					"dir"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Menubar/MenubarRoot.vue
var MenubarRoot_default = MenubarRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenubarRoot_default', {
  enumerable: true,
  get: function () {
    return MenubarRoot_default;
  }
});
Object.defineProperty(exports, 'injectMenubarRootContext', {
  enumerable: true,
  get: function () {
    return injectMenubarRootContext;
  }
});
//# sourceMappingURL=MenubarRoot.cjs.map