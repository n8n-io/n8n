import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { useId } from "../shared/useId.js";
import { wrapArray } from "../shared/useTypeahead.js";
import { useCollection } from "../Collection/Collection.js";
import { MenuContent_default } from "../Menu/MenuContent.js";
import { injectMenubarRootContext } from "./MenubarRoot.js";
import { injectMenubarMenuContext } from "./MenubarMenu.js";
import { createBlock, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, withCtx, withKeys } from "vue";

//#region src/Menubar/MenubarContent.vue?vue&type=script&setup=true&lang.ts
var MenubarContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenubarContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
		},
		side: {
			type: null,
			required: false
		},
		sideOffset: {
			type: Number,
			required: false
		},
		sideFlip: {
			type: Boolean,
			required: false
		},
		align: {
			type: null,
			required: false,
			default: "start"
		},
		alignOffset: {
			type: Number,
			required: false
		},
		alignFlip: {
			type: Boolean,
			required: false
		},
		avoidCollisions: {
			type: Boolean,
			required: false
		},
		collisionBoundary: {
			type: null,
			required: false
		},
		collisionPadding: {
			type: [Number, Object],
			required: false
		},
		arrowPadding: {
			type: Number,
			required: false
		},
		sticky: {
			type: String,
			required: false
		},
		hideWhenDetached: {
			type: Boolean,
			required: false
		},
		positionStrategy: {
			type: String,
			required: false
		},
		updatePositionStrategy: {
			type: String,
			required: false
		},
		disableUpdateOnLayoutShift: {
			type: Boolean,
			required: false
		},
		prioritizePosition: {
			type: Boolean,
			required: false
		},
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
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(props, emits);
		useForwardExpose();
		const rootContext = injectMenubarRootContext();
		const menuContext = injectMenubarMenuContext();
		menuContext.contentId ||= useId(void 0, "reka-menubar-content");
		const { getItems } = useCollection({ key: "Menubar" });
		const hasInteractedOutsideRef = ref(false);
		function handleArrowNavigation(event) {
			const target = event.target;
			const targetIsSubTrigger = target.hasAttribute("data-reka-menubar-subtrigger");
			const prevMenuKey = rootContext.dir.value === "rtl" ? "ArrowRight" : "ArrowLeft";
			const isPrevKey = prevMenuKey === event.key;
			const isNextKey = !isPrevKey;
			if (isNextKey && targetIsSubTrigger) return;
			let candidateValues = getItems().filter((i) => i.ref.dataset.disabled !== "").map((i) => i.ref.dataset.value);
			if (isPrevKey) candidateValues.reverse();
			const currentIndex = candidateValues.indexOf(menuContext.value);
			candidateValues = rootContext.loop.value ? wrapArray(candidateValues, currentIndex + 1) : candidateValues.slice(currentIndex + 1);
			const [nextValue] = candidateValues;
			if (nextValue) rootContext.onMenuOpen(nextValue);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuContent_default), mergeProps(unref(forwarded), {
				id: unref(menuContext).contentId,
				"data-reka-menubar-content": "",
				"aria-labelledby": unref(menuContext).triggerId,
				style: {
					"--reka-menubar-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-menubar-content-available-width": "var(--reka-popper-available-width)",
					"--reka-menubar-content-available-height": "var(--reka-popper-available-height)",
					"--reka-menubar-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-menubar-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					const menubarOpen = Boolean(unref(rootContext).modelValue.value);
					if (!menubarOpen && !hasInteractedOutsideRef.value) unref(menuContext).triggerElement.value?.focus();
					hasInteractedOutsideRef.value = false;
					event.preventDefault();
				}),
				onFocusOutside: _cache[1] || (_cache[1] = (event) => {
					const target = event.target;
					const isMenubarTrigger = unref(getItems)().filter((i) => i.ref.dataset.disabled !== "").some((i) => i.ref.contains(target));
					if (isMenubarTrigger) event.preventDefault();
				}),
				onInteractOutside: _cache[2] || (_cache[2] = (event) => {
					hasInteractedOutsideRef.value = true;
				}),
				onEntryFocus: _cache[3] || (_cache[3] = (event) => {
					if (!unref(menuContext).wasKeyboardTriggerOpenRef.value) event.preventDefault();
				}),
				onKeydown: withKeys(handleArrowNavigation, ["arrow-right", "arrow-left"])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id", "aria-labelledby"]);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarContent.vue
var MenubarContent_default = MenubarContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenubarContent_default };
//# sourceMappingURL=MenubarContent.js.map