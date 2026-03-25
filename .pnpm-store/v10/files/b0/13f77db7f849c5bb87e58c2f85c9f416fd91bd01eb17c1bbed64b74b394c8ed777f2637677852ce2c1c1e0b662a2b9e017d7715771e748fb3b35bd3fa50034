import { handleCalendarInitialFocus } from "../date/utils.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { PopoverContent_default } from "../Popover/PopoverContent.js";
import { PopoverPortal_default } from "../Popover/PopoverPortal.js";
import { computed, createBlock, createVNode, defineComponent, guardReactiveProps, mergeProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/DatePicker/DatePickerContent.vue?vue&type=script&setup=true&lang.ts
var DatePickerContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DatePickerContent",
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
		const propsToForward = computed(() => ({
			...props,
			portal: void 0
		}));
		const forwarded = useForwardPropsEmits(propsToForward, emits);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopoverPortal_default), normalizeProps(guardReactiveProps(_ctx.portal)), {
				default: withCtx(() => [createVNode(unref(PopoverContent_default), mergeProps({
					...unref(forwarded),
					..._ctx.$attrs
				}, { onOpenAutoFocus: _cache[0] || (_cache[0] = (event) => {
					emits("openAutoFocus", event);
					if (!event.defaultPrevented && event.target) {
						unref(handleCalendarInitialFocus)(event.target);
						event.preventDefault();
					}
				}) }), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16)]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/DatePicker/DatePickerContent.vue
var DatePickerContent_default = DatePickerContent_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DatePickerContent_default };
//# sourceMappingURL=DatePickerContent.js.map