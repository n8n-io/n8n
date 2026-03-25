const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useDirection = require('../shared/useDirection.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/NavigationMenu/NavigationMenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectNavigationMenuContext, provideNavigationMenuContext] = require_shared_createContext.createContext(["NavigationMenuRoot", "NavigationMenuSub"], "NavigationMenuContext");
var NavigationMenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "NavigationMenuRoot",
	props: {
		modelValue: {
			type: String,
			required: false,
			default: void 0
		},
		defaultValue: {
			type: String,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		delayDuration: {
			type: Number,
			required: false,
			default: 200
		},
		skipDelayDuration: {
			type: Number,
			required: false,
			default: 300
		},
		disableClickTrigger: {
			type: Boolean,
			required: false,
			default: false
		},
		disableHoverTrigger: {
			type: Boolean,
			required: false,
			default: false
		},
		disablePointerLeaveClose: {
			type: Boolean,
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
			required: false,
			default: "nav"
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
		const { forwardRef, currentElement: rootNavigationMenu } = require_shared_useForwardExpose.useForwardExpose();
		const indicatorTrack = (0, vue.ref)();
		const viewport = (0, vue.ref)();
		const activeTrigger = (0, vue.ref)();
		const { getItems, CollectionSlot } = require_Collection_Collection.useCollection({
			key: "NavigationMenu",
			isProvider: true
		});
		const { delayDuration, skipDelayDuration, dir: propDir, disableClickTrigger, disableHoverTrigger, unmountOnHide } = (0, vue.toRefs)(props);
		const dir = require_shared_useDirection.useDirection(propDir);
		const isDelaySkipped = (0, __vueuse_core.refAutoReset)(false, skipDelayDuration);
		const computedDelay = (0, vue.computed)(() => {
			const isOpen = modelValue.value !== "";
			if (isOpen || isDelaySkipped.value) return 150;
			else return delayDuration.value;
		});
		const debouncedFn = (0, __vueuse_core.useDebounceFn)((val) => {
			if (typeof val === "string") {
				previousValue.value = modelValue.value;
				modelValue.value = val;
			}
		}, computedDelay);
		(0, vue.watchEffect)(() => {
			if (!modelValue.value) return;
			const items = getItems().map((i) => i.ref);
			activeTrigger.value = items.find((item) => item.id.includes(modelValue.value));
		});
		provideNavigationMenuContext({
			isRootMenu: true,
			modelValue,
			previousValue,
			baseId: require_shared_useId.useId(void 0, "reka-navigation-menu"),
			disableClickTrigger,
			disableHoverTrigger,
			dir,
			unmountOnHide,
			orientation: props.orientation,
			rootNavigationMenu,
			indicatorTrack,
			activeTrigger,
			onIndicatorTrackChange: (val) => {
				indicatorTrack.value = val;
			},
			viewport,
			onViewportChange: (val) => {
				viewport.value = val;
			},
			onTriggerEnter: (val) => {
				debouncedFn(val);
			},
			onTriggerLeave: () => {
				isDelaySkipped.value = true;
				debouncedFn("");
			},
			onContentEnter: () => {
				debouncedFn();
			},
			onContentLeave: () => {
				if (!props.disablePointerLeaveClose) debouncedFn("");
			},
			onItemSelect: (val) => {
				previousValue.value = modelValue.value;
				modelValue.value = val;
			},
			onItemDismiss: () => {
				previousValue.value = modelValue.value;
				modelValue.value = "";
			}
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionSlot), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
					ref: (0, vue.unref)(forwardRef),
					"aria-label": "Main",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-orientation": _ctx.orientation,
					dir: (0, vue.unref)(dir),
					"data-reka-navigation-menu": ""
				}, {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default", { modelValue: (0, vue.unref)(modelValue) })]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"data-orientation",
					"dir"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuRoot.vue
var NavigationMenuRoot_default = NavigationMenuRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuRoot_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuRoot_default;
  }
});
Object.defineProperty(exports, 'injectNavigationMenuContext', {
  enumerable: true,
  get: function () {
    return injectNavigationMenuContext;
  }
});
Object.defineProperty(exports, 'provideNavigationMenuContext', {
  enumerable: true,
  get: function () {
    return provideNavigationMenuContext;
  }
});
//# sourceMappingURL=NavigationMenuRoot.cjs.map