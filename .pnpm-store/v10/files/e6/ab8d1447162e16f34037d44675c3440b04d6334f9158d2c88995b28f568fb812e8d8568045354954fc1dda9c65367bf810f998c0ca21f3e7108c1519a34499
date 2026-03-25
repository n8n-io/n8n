const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Toast/ToastProvider.vue?vue&type=script&setup=true&lang.ts
const [injectToastProviderContext, provideToastProviderContext] = require_shared_createContext.createContext("ToastProvider");
var ToastProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ToastProvider",
	props: {
		label: {
			type: String,
			required: false,
			default: "Notification"
		},
		duration: {
			type: Number,
			required: false,
			default: 5e3
		},
		swipeDirection: {
			type: String,
			required: false,
			default: "right"
		},
		swipeThreshold: {
			type: Number,
			required: false,
			default: 50
		}
	},
	setup(__props) {
		const props = __props;
		const { label, duration, swipeDirection, swipeThreshold } = (0, vue.toRefs)(props);
		require_Collection_Collection.useCollection({ isProvider: true });
		const viewport = (0, vue.ref)();
		const toastCount = (0, vue.ref)(0);
		const isFocusedToastEscapeKeyDownRef = (0, vue.ref)(false);
		const isClosePausedRef = (0, vue.ref)(false);
		if (props.label && typeof props.label === "string" && !props.label.trim()) {
			const error = "Invalid prop `label` supplied to `ToastProvider`. Expected non-empty `string`.";
			throw new Error(error);
		}
		provideToastProviderContext({
			label,
			duration,
			swipeDirection,
			swipeThreshold,
			toastCount,
			viewport,
			onViewportChange(el) {
				viewport.value = el;
			},
			onToastAdd() {
				toastCount.value++;
			},
			onToastRemove() {
				toastCount.value--;
			},
			isFocusedToastEscapeKeyDownRef,
			isClosePausedRef
		});
		return (_ctx, _cache) => {
			return (0, vue.renderSlot)(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Toast/ToastProvider.vue
var ToastProvider_default = ToastProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ToastProvider_default', {
  enumerable: true,
  get: function () {
    return ToastProvider_default;
  }
});
Object.defineProperty(exports, 'injectToastProviderContext', {
  enumerable: true,
  get: function () {
    return injectToastProviderContext;
  }
});
//# sourceMappingURL=ToastProvider.cjs.map