import { createContext } from "../shared/createContext.js";
import { useCollection } from "../Collection/Collection.js";
import { defineComponent, ref, renderSlot, toRefs } from "vue";

//#region src/Toast/ToastProvider.vue?vue&type=script&setup=true&lang.ts
const [injectToastProviderContext, provideToastProviderContext] = createContext("ToastProvider");
var ToastProvider_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const { label, duration, swipeDirection, swipeThreshold } = toRefs(props);
		useCollection({ isProvider: true });
		const viewport = ref();
		const toastCount = ref(0);
		const isFocusedToastEscapeKeyDownRef = ref(false);
		const isClosePausedRef = ref(false);
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
			return renderSlot(_ctx.$slots, "default");
		};
	}
});

//#endregion
//#region src/Toast/ToastProvider.vue
var ToastProvider_default = ToastProvider_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToastProvider_default, injectToastProviderContext };
//# sourceMappingURL=ToastProvider.js.map