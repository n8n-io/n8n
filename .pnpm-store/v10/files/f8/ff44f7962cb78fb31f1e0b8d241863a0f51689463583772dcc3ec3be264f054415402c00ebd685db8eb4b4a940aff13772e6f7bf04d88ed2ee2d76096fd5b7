const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useBodyScrollLock = require('../shared/useBodyScrollLock.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_shared_useHideOthers = require('../shared/useHideOthers.cjs');
const require_Popover_PopoverRoot = require('./PopoverRoot.cjs');
const require_Popover_PopoverContentImpl = require('./PopoverContentImpl.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Popover/PopoverContentModal.vue?vue&type=script&setup=true&lang.ts
var PopoverContentModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "PopoverContentModal",
	props: {
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
		},
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false
		}
	},
	emits: [
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"openAutoFocus",
		"closeAutoFocus"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const rootContext = require_Popover_PopoverRoot.injectPopoverRootContext();
		const isRightClickOutsideRef = (0, vue.ref)(false);
		require_shared_useBodyScrollLock.useBodyScrollLock(true);
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(props, emits);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		require_shared_useHideOthers.useHideOthers(currentElement);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Popover_PopoverContentImpl.PopoverContentImpl_default, (0, vue.mergeProps)((0, vue.unref)(forwarded), {
				ref: (0, vue.unref)(forwardRef),
				"trap-focus": (0, vue.unref)(rootContext).open.value,
				"disable-outside-pointer-events": "",
				onCloseAutoFocus: _cache[0] || (_cache[0] = (0, vue.withModifiers)((event) => {
					emits("closeAutoFocus", event);
					if (!isRightClickOutsideRef.value) (0, vue.unref)(rootContext).triggerElement.value?.focus();
				}, ["prevent"])),
				onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
					emits("pointerDownOutside", event);
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
					isRightClickOutsideRef.value = isRightClick;
				}),
				onFocusOutside: _cache[2] || (_cache[2] = (0, vue.withModifiers)(() => {}, ["prevent"]))
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["trap-focus"]);
		};
	}
});

//#endregion
//#region src/Popover/PopoverContentModal.vue
var PopoverContentModal_default = PopoverContentModal_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'PopoverContentModal_default', {
  enumerable: true,
  get: function () {
    return PopoverContentModal_default;
  }
});
//# sourceMappingURL=PopoverContentModal.cjs.map