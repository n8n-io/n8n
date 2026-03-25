const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Menu_MenuContent = require('../Menu/MenuContent.cjs');
const require_DropdownMenu_DropdownMenuRoot = require('./DropdownMenuRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DropdownMenu/DropdownMenuContent.vue?vue&type=script&setup=true&lang.ts
var DropdownMenuContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DropdownMenuContent",
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
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_DropdownMenu_DropdownMenuRoot.injectDropdownMenuRootContext();
		const hasInteractedOutsideRef = (0, vue.ref)(false);
		function handleCloseAutoFocus(event) {
			if (event.defaultPrevented) return;
			if (!hasInteractedOutsideRef.value) setTimeout(() => {
				rootContext.triggerElement.value?.focus();
			}, 0);
			hasInteractedOutsideRef.value = false;
			event.preventDefault();
		}
		rootContext.contentId ||= require_shared_useId.useId(void 0, "reka-dropdown-menu-content");
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Menu_MenuContent.MenuContent_default), (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				id: (0, vue.unref)(rootContext).contentId,
				"aria-labelledby": (0, vue.unref)(rootContext)?.triggerId,
				style: {
					"--reka-dropdown-menu-content-transform-origin": "var(--reka-popper-transform-origin)",
					"--reka-dropdown-menu-content-available-width": "var(--reka-popper-available-width)",
					"--reka-dropdown-menu-content-available-height": "var(--reka-popper-available-height)",
					"--reka-dropdown-menu-trigger-width": "var(--reka-popper-anchor-width)",
					"--reka-dropdown-menu-trigger-height": "var(--reka-popper-anchor-height)"
				},
				onCloseAutoFocus: handleCloseAutoFocus,
				onInteractOutside: _cache[0] || (_cache[0] = (event) => {
					if (event.defaultPrevented) return;
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
					if (!(0, vue.unref)(rootContext).modal.value || isRightClick) hasInteractedOutsideRef.value = true;
					if ((0, vue.unref)(rootContext).triggerElement.value?.contains(event.target)) event.preventDefault();
				})
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id", "aria-labelledby"]);
		};
	}
});

//#endregion
//#region src/DropdownMenu/DropdownMenuContent.vue
var DropdownMenuContent_default = DropdownMenuContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DropdownMenuContent_default', {
  enumerable: true,
  get: function () {
    return DropdownMenuContent_default;
  }
});
//# sourceMappingURL=DropdownMenuContent.cjs.map