const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useTypeahead = require('../shared/useTypeahead.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Menu_MenuSubContent = require('../Menu/MenuSubContent.cjs');
const require_Menubar_MenubarRoot = require('./MenubarRoot.cjs');
const require_Menubar_MenubarMenu = require('./MenubarMenu.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menubar/MenubarSubContent.vue?vue&type=script&setup=true&lang.ts
var MenubarSubContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		require_shared_useForwardExpose.useForwardExpose();
		const { getItems } = require_Collection_Collection.useCollection({ key: "Menubar" });
		const rootContext = require_Menubar_MenubarRoot.injectMenubarRootContext();
		const menuContext = require_Menubar_MenubarMenu.injectMenubarMenuContext();
		function handleArrowNavigation(event) {
			const target = event.target;
			const targetIsSubTrigger = target.hasAttribute("data-reka-menubar-subtrigger");
			if (targetIsSubTrigger) return;
			let candidateValues = getItems().filter((i) => i.ref.dataset.disabled !== "").map((i) => i.ref.dataset.value);
			const currentIndex = candidateValues.indexOf(menuContext.value);
			candidateValues = rootContext.loop.value ? require_shared_useTypeahead.wrapArray(candidateValues, currentIndex + 1) : candidateValues.slice(currentIndex + 1);
			const [nextValue] = candidateValues;
			if (nextValue) rootContext.onMenuOpen(nextValue);
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuSubContent.MenuSubContent_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				"data-reka-menubar-content": "",
				style: {
					"--reka-menubar-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-menubar-content-available-width": "var(--reka-popper-available-width)",
					"--reka-menubar-content-available-height": "var(--reka-popper-available-height)",
					"--reka-menubar-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-menubar-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onKeydown: (0, vue.withKeys)(handleArrowNavigation, ["arrow-right"])
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarSubContent.vue
var MenubarSubContent_default = MenubarSubContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenubarSubContent_default', {
  enumerable: true,
  get: function () {
    return MenubarSubContent_default;
  }
});
//# sourceMappingURL=MenubarSubContent.cjs.map