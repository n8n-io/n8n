const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useBodyScrollLock = require('../shared/useBodyScrollLock.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardProps = require('../shared/useForwardProps.cjs');
const require_shared_useHideOthers = require('../shared/useHideOthers.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_Popper_PopperContent = require('../Popper/PopperContent.cjs');
const require_Listbox_ListboxContent = require('../Listbox/ListboxContent.cjs');
const require_Combobox_ComboboxRoot = require('./ComboboxRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Combobox/ComboboxContentImpl.vue?vue&type=script&setup=true&lang.ts
const [injectComboboxContentContext, provideComboboxContentContext] = require_shared_createContext.createContext("ComboboxContent");
var ComboboxContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
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
		const { position } = (0, vue.toRefs)(props);
		const rootContext = require_Combobox_ComboboxRoot.injectComboboxRootContext();
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		require_shared_useBodyScrollLock.useBodyScrollLock(props.bodyLock);
		require_shared_useHideOthers.useHideOthers(rootContext.parentElement);
		const pickedProps = (0, vue.computed)(() => {
			if (props.position === "popper") return props;
			else return {};
		});
		const forwardedProps = require_shared_useForwardProps.useForwardProps(pickedProps.value);
		const popperStyle = {
			"boxSizing": "border-box",
			"--reka-combobox-content-transform-origin": "var(--reka-popper-transform-origin)",
			"--reka-combobox-content-available-width": "var(--reka-popper-available-width)",
			"--reka-combobox-content-available-height": "var(--reka-popper-available-height)",
			"--reka-combobox-trigger-width": "var(--reka-popper-anchor-width)",
			"--reka-combobox-trigger-height": "var(--reka-popper-anchor-height)"
		};
		provideComboboxContentContext({ position });
		const isInputWithinContent = (0, vue.ref)(false);
		(0, vue.onMounted)(() => {
			if (rootContext.inputElement.value) {
				isInputWithinContent.value = currentElement.value.contains(rootContext.inputElement.value);
				if (isInputWithinContent.value) rootContext.inputElement.value.focus();
			}
		});
		(0, vue.onUnmounted)(() => {
			if (isInputWithinContent.value) rootContext.triggerElement.value?.focus();
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Listbox_ListboxContent.ListboxContent_default), { "as-child": "" }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), {
					"as-child": "",
					"disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
					onDismiss: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(rootContext).onOpenChange(false)),
					onFocusOutside: _cache[1] || (_cache[1] = (ev) => {
						if ((0, vue.unref)(rootContext).parentElement.value?.contains(ev.target)) ev.preventDefault();
						emits("focusOutside", ev);
					}),
					onInteractOutside: _cache[2] || (_cache[2] = ($event) => emits("interactOutside", $event)),
					onEscapeKeyDown: _cache[3] || (_cache[3] = ($event) => emits("escapeKeyDown", $event)),
					onPointerDownOutside: _cache[4] || (_cache[4] = (ev) => {
						if ((0, vue.unref)(rootContext).parentElement.value?.contains(ev.target)) ev.preventDefault();
						emits("pointerDownOutside", ev);
					})
				}, {
					default: (0, vue.withCtx)(() => [((0, vue.openBlock)(), (0, vue.createBlock)((0, vue.resolveDynamicComponent)((0, vue.unref)(position) === "popper" ? (0, vue.unref)(require_Popper_PopperContent.PopperContent_default) : (0, vue.unref)(require_Primitive_Primitive.Primitive)), (0, vue.mergeProps)({
						..._ctx.$attrs,
						...(0, vue.unref)(forwardedProps)
					}, {
						id: (0, vue.unref)(rootContext).contentId,
						ref: (0, vue.unref)(forwardRef),
						"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
						style: {
							display: "flex",
							flexDirection: "column",
							outline: "none",
							...(0, vue.unref)(position) === "popper" ? popperStyle : {}
						}
					}), {
						default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
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
Object.defineProperty(exports, 'ComboboxContentImpl_default', {
  enumerable: true,
  get: function () {
    return ComboboxContentImpl_default;
  }
});
Object.defineProperty(exports, 'injectComboboxContentContext', {
  enumerable: true,
  get: function () {
    return injectComboboxContentContext;
  }
});
//# sourceMappingURL=ComboboxContentImpl.cjs.map