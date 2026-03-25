const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_date_utils = require('../date/utils.cjs');
const require_shared_useForwardPropsEmits = require('../shared/useForwardPropsEmits.cjs');
const require_Popover_PopoverContent = require('../Popover/PopoverContent.cjs');
const require_Popover_PopoverPortal = require('../Popover/PopoverPortal.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/DateRangePicker/DateRangePickerContent.vue?vue&type=script&setup=true&lang.ts
var DateRangePickerContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DateRangePickerContent",
	props: {
		portal: {
			type: Object,
			required: false
		},
		forceMount: {
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
		const propsToForward = (0, vue.computed)(() => ({
			...props,
			portal: void 0
		}));
		const forwarded = require_shared_useForwardPropsEmits.useForwardPropsEmits(propsToForward, emits);
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Popover_PopoverPortal.PopoverPortal_default), (0, vue.normalizeProps)((0, vue.guardReactiveProps)(_ctx.portal)), {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Popover_PopoverContent.PopoverContent_default), (0, vue.mergeProps)({
					...(0, vue.unref)(forwarded),
					..._ctx.$attrs
				}, { onOpenAutoFocus: _cache[0] || (_cache[0] = (event) => {
					emits("openAutoFocus", event);
					if (!event.defaultPrevented && event.target) {
						(0, vue.unref)(require_date_utils.handleCalendarInitialFocus)(event.target);
						event.preventDefault();
					}
				}) }), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16)]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/DateRangePicker/DateRangePickerContent.vue
var DateRangePickerContent_default = DateRangePickerContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DateRangePickerContent_default', {
  enumerable: true,
  get: function () {
    return DateRangePickerContent_default;
  }
});
//# sourceMappingURL=DateRangePickerContent.cjs.map