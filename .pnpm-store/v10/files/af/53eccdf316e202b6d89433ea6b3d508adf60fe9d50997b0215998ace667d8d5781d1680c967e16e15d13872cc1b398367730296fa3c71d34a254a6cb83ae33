import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { wrapArray } from "../shared/useTypeahead.js";
import { useCollection } from "../Collection/Collection.js";
import { MenuSubContent_default } from "../Menu/MenuSubContent.js";
import { injectMenubarRootContext } from "./MenubarRoot.js";
import { injectMenubarMenuContext } from "./MenubarMenu.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx, withKeys } from "vue";

//#region src/Menubar/MenubarSubContent.vue?vue&type=script&setup=true&lang.ts
var MenubarSubContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenubarSubContent",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		loop: {
			type: Boolean,
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
		"entryFocus",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(props, emits);
		useForwardExpose();
		const { getItems } = useCollection({ key: "Menubar" });
		const rootContext = injectMenubarRootContext();
		const menuContext = injectMenubarMenuContext();
		function handleArrowNavigation(event) {
			const target = event.target;
			const targetIsSubTrigger = target.hasAttribute("data-reka-menubar-subtrigger");
			if (targetIsSubTrigger) return;
			let candidateValues = getItems().filter((i) => i.ref.dataset.disabled !== "").map((i) => i.ref.dataset.value);
			const currentIndex = candidateValues.indexOf(menuContext.value);
			candidateValues = rootContext.loop.value ? wrapArray(candidateValues, currentIndex + 1) : candidateValues.slice(currentIndex + 1);
			const [nextValue] = candidateValues;
			if (nextValue) rootContext.onMenuOpen(nextValue);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuSubContent_default), mergeProps(unref(forwarded), {
				"data-reka-menubar-content": "",
				style: {
					"--reka-menubar-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-menubar-content-available-width": "var(--reka-popper-available-width)",
					"--reka-menubar-content-available-height": "var(--reka-popper-available-height)",
					"--reka-menubar-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-menubar-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onKeydown: withKeys(handleArrowNavigation, ["arrow-right"])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarSubContent.vue
var MenubarSubContent_default = MenubarSubContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenubarSubContent_default };
//# sourceMappingURL=MenubarSubContent.js.map