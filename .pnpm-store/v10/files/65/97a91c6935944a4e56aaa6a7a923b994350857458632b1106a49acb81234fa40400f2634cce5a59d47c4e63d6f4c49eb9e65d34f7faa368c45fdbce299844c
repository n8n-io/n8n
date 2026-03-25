const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Menu_MenuContent = require('../Menu/MenuContent.cjs');
const require_Menubar_MenubarRoot = require('./MenubarRoot.cjs');
const require_Menubar_MenubarMenu = require('./MenubarMenu.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menubar/MenubarContent.vue?vue&type=script&setup=true&lang.ts
var MenubarContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_Menubar_MenubarRoot.injectMenubarRootContext();
		const menuContext = require_Menubar_MenubarMenu.injectMenubarMenuContext();
		menuContext.contentId ||= require_shared_useId.useId(void 0, "reka-menubar-content");
		const { getItems } = require_Collection_Collection.useCollection({ key: "Menubar" });
		const hasInteractedOutsideRef = (0, vue.ref)(false);
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
			candidateValues = rootContext.loop.value ? require_shared_useTypeahead.wrapArray(candidateValues, currentIndex + 1) : candidateValues.slice(currentIndex + 1);
			const [nextValue] = candidateValues;
			if (nextValue) rootContext.onMenuOpen(nextValue);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuContent.MenuContent_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				id: (0, vue.unref)(menuContext).contentId,
				"data-reka-menubar-content": "",
				"aria-labelledby": (0, vue.unref)(menuContext).triggerId,
				style: {
					"--reka-menubar-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-menubar-content-available-width": "var(--reka-popper-available-width)",
					"--reka-menubar-content-available-height": "var(--reka-popper-available-height)",
					"--reka-menubar-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-menubar-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
					const menubarOpen = Boolean((0, vue.unref)(rootContext).modelValue.value);
					if (!menubarOpen && !hasInteractedOutsideRef.value) (0, vue.unref)(menuContext).triggerElement.value?.focus();
					hasInteractedOutsideRef.value = false;
					event.preventDefault();
				}),
				onFocusOutside: _cache[1] || (_cache[1] = (event) => {
					const target = event.target;
					const isMenubarTrigger = (0, vue.unref)(getItems)().filter((i) => i.ref.dataset.disabled !== "").some((i) => i.ref.contains(target));
					if (isMenubarTrigger) event.preventDefault();
				}),
				onInteractOutside: _cache[2] || (_cache[2] = (event) => {
					hasInteractedOutsideRef.value = true;
				}),
				onEntryFocus: _cache[3] || (_cache[3] = (event) => {
					if (!(0, vue.unref)(menuContext).wasKeyboardTriggerOpenRef.value) event.preventDefault();
				}),
				onKeydown: (0, vue.withKeys)(handleArrowNavigation, ["arrow-right", "arrow-left"])
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id", "aria-labelledby"]);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarContent.vue
var MenubarContent_default = MenubarContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenubarContent_default', {
  enumerable: true,
  get: function () {
    return MenubarContent_default;
  }
});
//# sourceMappingURL=MenubarContent.cjs.map