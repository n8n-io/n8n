const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useForwardProps = require('../shared/useForwardProps.cjs');
const require_shared_useGraceArea = require('../shared/useGraceArea.cjs');
const require_DismissableLayer_DismissableLayer = require('../DismissableLayer/DismissableLayer.cjs');
const require_Popper_PopperContent = require('../Popper/PopperContent.cjs');
const require_HoverCard_HoverCardRoot = require('./HoverCardRoot.cjs');
const require_HoverCard_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/HoverCard/HoverCardContentImpl.vue?vue&type=script&setup=true&lang.ts
var HoverCardContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "HoverCardContentImpl",
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
		const forwarded = require_shared_useForwardProps.useForwardProps(props);
		const { forwardRef, currentElement: contentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_HoverCard_HoverCardRoot.injectHoverCardRootContext();
		const { isPointerInTransit, onPointerExit } = require_shared_useGraceArea.useGraceArea(rootContext.triggerElement, contentElement);
		(0, __vueuse_shared.syncRef)(rootContext.isPointerInTransitRef, isPointerInTransit, { direction: "rtl" });
		onPointerExit(() => {
			rootContext.onClose();
		});
		const containSelection = (0, vue.ref)(false);
		let originalBodyUserSelect;
		(0, vue.watchEffect)((cleanupFn) => {
			if (containSelection.value) {
				const body = document.body;
				originalBodyUserSelect = body.style.userSelect || body.style.webkitUserSelect;
				body.style.userSelect = "none";
				body.style.webkitUserSelect = "none";
				cleanupFn(() => {
					body.style.userSelect = originalBodyUserSelect;
					body.style.webkitUserSelect = originalBodyUserSelect;
				});
			}
		});
		function handlePointerUp() {
			containSelection.value = false;
			rootContext.isPointerDownOnContentRef.value = false;
			(0, vue.nextTick)(() => {
				const hasSelection = document.getSelection()?.toString() !== "";
				if (hasSelection) rootContext.hasSelectionRef.value = true;
			});
		}
		(0, vue.onMounted)(() => {
			if (contentElement.value) {
				document.addEventListener("pointerup", handlePointerUp);
				const tabbables = require_HoverCard_utils.getTabbableNodes(contentElement.value);
				tabbables.forEach((tabbable) => tabbable.setAttribute("tabindex", "-1"));
			}
		});
		(0, vue.onUnmounted)(() => {
			document.removeEventListener("pointerup", handlePointerUp);
			rootContext.hasSelectionRef.value = false;
			rootContext.isPointerDownOnContentRef.value = false;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_DismissableLayer_DismissableLayer.DismissableLayer_default), {
				"as-child": "",
				"disable-outside-pointer-events": false,
				onEscapeKeyDown: _cache[1] || (_cache[1] = ($event) => emits("escapeKeyDown", $event)),
				onPointerDownOutside: _cache[2] || (_cache[2] = ($event) => emits("pointerDownOutside", $event)),
				onFocusOutside: _cache[3] || (_cache[3] = (0, vue.withModifiers)(($event) => emits("focusOutside", $event), ["prevent"])),
				onDismiss: (0, vue.unref)(rootContext).onDismiss
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Popper_PopperContent.PopperContent_default), (0, vue.mergeProps)({
					...(0, vue.unref)(forwarded),
					..._ctx.$attrs
				}, {
					ref: (0, vue.unref)(forwardRef),
					"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
					style: {
						"userSelect": containSelection.value ? "text" : void 0,
						"WebkitUserSelect": containSelection.value ? "text" : void 0,
						"--reka-hover-card-content-transform-origin": "var(--reka-popper-transform-origin)",
						"--reka-hover-card-content-available-width": "var(--reka-popper-available-width)",
						"--reka-hover-card-content-available-height": "var(--reka-popper-available-height)",
						"--reka-hover-card-trigger-width": "var(--reka-popper-anchor-width)",
						"--reka-hover-card-trigger-height": "var(--reka-popper-anchor-height)"
					},
					onPointerdown: _cache[0] || (_cache[0] = (event) => {
						if (event.currentTarget.contains(event.target)) containSelection.value = true;
						(0, vue.unref)(rootContext).hasSelectionRef.value = false;
						(0, vue.unref)(rootContext).isPointerDownOnContentRef.value = true;
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["data-state", "style"])]),
				_: 3
			}, 8, ["onDismiss"]);
		};
	}
});

//#endregion
//#region src/HoverCard/HoverCardContentImpl.vue
var HoverCardContentImpl_default = HoverCardContentImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'HoverCardContentImpl_default', {
  enumerable: true,
  get: function () {
    return HoverCardContentImpl_default;
  }
});
//# sourceMappingURL=HoverCardContentImpl.cjs.map