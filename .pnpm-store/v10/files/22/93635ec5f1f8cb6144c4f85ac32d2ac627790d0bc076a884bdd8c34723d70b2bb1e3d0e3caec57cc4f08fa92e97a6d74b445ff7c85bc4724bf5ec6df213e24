const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/NavigationMenu/NavigationMenuSub.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuSub_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "NavigationMenuSub",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		defaultValue: {
			type: String,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
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
		const modelValue = (0, __vueuse_core.useVModel)(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? "",
			passive: props.modelValue === void 0
		});
		const previousValue = (0, vue.ref)("");
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const indicatorTrack = (0, vue.ref)();
		const viewport = (0, vue.ref)();
		const activeTrigger = (0, vue.ref)();
		const { getItems, CollectionSlot } = require_Collection_Collection.useCollection({
			key: "NavigationMenu",
			isProvider: true
		});
		(0, vue.watchEffect)(() => {
			if (!modelValue.value) return;
			const items = getItems().map((i) => i.ref);
			activeTrigger.value = items.find((item) => item.id.includes(modelValue.value));
		});
		require_NavigationMenu_NavigationMenuRoot.provideNavigationMenuContext({
			...menuContext,
			isRootMenu: false,
			modelValue,
			previousValue,
			activeTrigger,
			orientation: props.orientation,
			rootNavigationMenu: currentElement,
			indicatorTrack,
			onIndicatorTrackChange: (val) => {
				indicatorTrack.value = val;
			},
			viewport,
			onViewportChange: (val) => {
				viewport.value = val;
			},
			onTriggerEnter: (val) => {
				modelValue.value = val;
			},
			onTriggerLeave: () => {},
			onContentEnter: () => {},
			onContentLeave: () => {},
			onItemSelect: (val) => {
				modelValue.value = val;
			},
			onItemDismiss: () => {
				modelValue.value = "";
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					"data-orientation": _ctx.orientation,
					"as-child": props.asChild,
					as: _ctx.as,
					"data-reka-navigation-menu": ""
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
					_: 3
				}, 8, [
					"data-orientation",
					"as-child",
					"as"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuSub.vue
var NavigationMenuSub_default = NavigationMenuSub_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuSub_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuSub_default;
  }
});
//# sourceMappingURL=NavigationMenuSub.cjs.map