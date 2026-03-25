const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Menu_MenuAnchor = require('../Menu/MenuAnchor.cjs');
const require_ContextMenu_ContextMenuRoot = require('./ContextMenuRoot.cjs');
const require_ContextMenu_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ContextMenu/ContextMenuTrigger.vue?vue&type=script&setup=true&lang.ts
var ContextMenuTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "ContextMenuTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const { disabled } = (0, vue.toRefs)(props);
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const rootContext = require_ContextMenu_ContextMenuRoot.injectContextMenuRootContext();
		const point = (0, vue.ref)({
			x: 0,
			y: 0
		});
		const virtualEl = (0, vue.computed)(() => ({ getBoundingClientRect: () => ({
			width: 0,
			height: 0,
			left: point.value.x,
			right: point.value.x,
			top: point.value.y,
			bottom: point.value.y,
			...point.value
		}) }));
		const longPressTimer = (0, vue.ref)(0);
		function clearLongPress() {
			window.clearTimeout(longPressTimer.value);
		}
		function handleOpen(event) {
			point.value = {
				x: event.clientX,
				y: event.clientY
			};
			rootContext.onOpenChange(true);
		}
		async function handleContextMenu(event) {
			if (!disabled.value) {
				await (0, vue.nextTick)();
				if (!event.defaultPrevented) {
					clearLongPress();
					handleOpen(event);
					event.preventDefault();
				}
			}
		}
		async function handlePointerDown(event) {
			if (!disabled.value) {
				await (0, vue.nextTick)();
				if (require_ContextMenu_utils.isTouchOrPen(event) && !event.defaultPrevented) {
					clearLongPress();
					longPressTimer.value = window.setTimeout(() => handleOpen(event), rootContext.pressOpenDelay.value);
				}
			}
		}
		async function handlePointerEvent(event) {
			if (!disabled.value) {
				await (0, vue.nextTick)();
				if (require_ContextMenu_utils.isTouchOrPen(event) && !event.defaultPrevented) clearLongPress();
			}
		}
		(0, vue.onMounted)(() => {
			if (currentElement.value) rootContext.triggerElement.value = currentElement.value;
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createElementBlock)(vue.Fragment, null, [(0, vue.createVNode)((0, vue.unref)(require_Menu_MenuAnchor.MenuAnchor_default), {
				as: "template",
				reference: virtualEl.value
			}, null, 8, ["reference"]), (0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)({
				ref: (0, vue.unref)(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-state": (0, vue.unref)(rootContext).open.value ? "open" : "closed",
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				style: {
					WebkitTouchCallout: "none",
					pointerEvents: "auto"
				}
			}, _ctx.$attrs, {
				onContextmenu: handleContextMenu,
				onPointerdown: handlePointerDown,
				onPointermove: handlePointerEvent,
				onPointercancel: handlePointerEvent,
				onPointerup: handlePointerEvent
			}), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"as",
				"as-child",
				"data-state",
				"data-disabled"
			])], 64);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuTrigger.vue
var ContextMenuTrigger_default = ContextMenuTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ContextMenuTrigger_default', {
  enumerable: true,
  get: function () {
    return ContextMenuTrigger_default;
  }
});
//# sourceMappingURL=ContextMenuTrigger.cjs.map