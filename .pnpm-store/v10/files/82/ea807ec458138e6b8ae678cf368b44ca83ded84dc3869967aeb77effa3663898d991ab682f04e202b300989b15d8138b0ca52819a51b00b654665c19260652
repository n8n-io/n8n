import { createContext } from "../shared/createContext.js";
import { useBodyScrollLock } from "../shared/useBodyScrollLock.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardProps } from "../shared/useForwardProps.js";
import { useHideOthers } from "../shared/useHideOthers.js";
import { Primitive } from "../Primitive/Primitive.js";
import { DismissableLayer_default } from "../DismissableLayer/DismissableLayer.js";
import { PopperContent_default } from "../Popper/PopperContent.js";
import { ListboxContent_default } from "../Listbox/ListboxContent.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, ref, renderSlot, resolveDynamicComponent, toRefs, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxContentImpl.vue?vue&type=script&setup=true&lang.ts
const [injectComboboxContentContext, provideComboboxContentContext] = createContext("ComboboxContent");
var ComboboxContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxContentImpl",
	props: {
		position: {
			type: String,
			required: false,
			default: "inline"
		},
		bodyLock: {
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
		"interactOutside"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { position } = toRefs(props);
		const rootContext = injectComboboxRootContext();
		const { forwardRef, currentElement } = useForwardExpose();
		useBodyScrollLock(props.bodyLock);
		useHideOthers(rootContext.parentElement);
		const pickedProps = computed(() => {
			if (props.position === "popper") return props;
			else return {};
		});
		const forwardedProps = useForwardProps(pickedProps.value);
		const popperStyle = {
			"boxSizing": "border-box",
			"--reka-combobox-content-transform-origin": "var(--reka-popper-transform-origin)",
			"--reka-combobox-content-available-width": "var(--reka-popper-available-width)",
			"--reka-combobox-content-available-height": "var(--reka-popper-available-height)",
			"--reka-combobox-trigger-width": "var(--reka-popper-anchor-width)",
			"--reka-combobox-trigger-height": "var(--reka-popper-anchor-height)"
		};
		provideComboboxContentContext({ position });
		const isInputWithinContent = ref(false);
		onMounted(() => {
			if (rootContext.inputElement.value) {
				isInputWithinContent.value = currentElement.value.contains(rootContext.inputElement.value);
				if (isInputWithinContent.value) rootContext.inputElement.value.focus();
			}
		});
		onUnmounted(() => {
			if (isInputWithinContent.value) rootContext.triggerElement.value?.focus();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ListboxContent_default), { "as-child": "" }, {
				default: withCtx(() => [createVNode(unref(DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					onDismiss: _cache[0] || (_cache[0] = ($event) => unref(rootContext).onOpenChange(false)),
					onFocusOutside: _cache[1] || (_cache[1] = (ev) => {
						if (unref(rootContext).parentElement.value?.contains(ev.target)) ev.preventDefault();
						emits("focusOutside", ev);
					}),
					onInteractOutside: _cache[2] || (_cache[2] = ($event) => emits("interactOutside", $event)),
					onEscapeKeyDown: _cache[3] || (_cache[3] = ($event) => emits("escapeKeyDown", $event)),
					onPointerDownOutside: _cache[4] || (_cache[4] = (ev) => {
						if (unref(rootContext).parentElement.value?.contains(ev.target)) ev.preventDefault();
						emits("pointerDownOutside", ev);
					})
				}, {
					default: withCtx(() => [(openBlock(), createBlock(resolveDynamicComponent(unref(position) === "popper" ? unref(PopperContent_default) : unref(Primitive)), mergeProps({
						..._ctx.$attrs,
						...unref(forwardedProps)
					}, {
						id: unref(rootContext).contentId,
						ref: unref(forwardRef),
						"data-state": unref(rootContext).open.value ? "open" : "closed",
						style: {
							display: "flex",
							flexDirection: "column",
							outline: "none",
							...unref(position) === "popper" ? popperStyle : {}
						}
					}), {
						default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
						_: 3
					}, 16, [
						"id",
						"data-state",
						"style"
					]))]),
					_: 3
				}, 8, ["disable-outside-pointer-events"])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxContentImpl.vue
var ComboboxContentImpl_default = ComboboxContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxContentImpl_default, injectComboboxContentContext };
//# sourceMappingURL=ComboboxContentImpl.js.map