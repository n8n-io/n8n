import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { computed, createBlock, createVNode, defineComponent, openBlock, ref, renderSlot, toRefs, unref, watchEffect, withCtx } from "vue";
import { refAutoReset, useDebounceFn, useVModel } from "@vueuse/core";

//#region src/NavigationMenu/NavigationMenuRoot.vue?vue&type=script&setup=true&lang.ts
const [injectNavigationMenuContext, provideNavigationMenuContext] = createContext(["NavigationMenuRoot", "NavigationMenuSub"], "NavigationMenuContext");
var NavigationMenuRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? "",
			passive: props.modelValue === void 0
		});
		const previousValue = ref("");
		const { forwardRef, currentElement: rootNavigationMenu } = useForwardExpose();
		const indicatorTrack = ref();
		const viewport = ref();
		const activeTrigger = ref();
		const { getItems, CollectionSlot } = useCollection({
			key: "NavigationMenu",
			isProvider: true
		});
		const { delayDuration, skipDelayDuration, dir: propDir, disableClickTrigger, disableHoverTrigger, unmountOnHide } = toRefs(props);
		const dir = useDirection(propDir);
		const isDelaySkipped = refAutoReset(false, skipDelayDuration);
		const computedDelay = computed(() => {
			const isOpen = modelValue.value !== "";
			if (isOpen || isDelaySkipped.value) return 150;
			else return delayDuration.value;
		});
		const debouncedFn = useDebounceFn((val) => {
			if (typeof val === "string") {
				previousValue.value = modelValue.value;
				modelValue.value = val;
			}
		}, computedDelay);
		watchEffect(() => {
			if (!modelValue.value) return;
			const items = getItems().map((i) => i.ref);
			activeTrigger.value = items.find((item) => item.id.includes(modelValue.value));
		});
		provideNavigationMenuContext({
			isRootMenu: true,
			modelValue,
			previousValue,
			baseId: useId(void 0, "reka-navigation-menu"),
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
			return openBlock(), createBlock(unref(CollectionSlot), null, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					"aria-label": "Main",
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-orientation": _ctx.orientation,
					dir: unref(dir),
					"data-reka-navigation-menu": ""
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
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
export { NavigationMenuRoot_default, injectNavigationMenuContext, provideNavigationMenuContext };
//# sourceMappingURL=NavigationMenuRoot.js.map