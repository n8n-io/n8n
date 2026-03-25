const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Menu_utils = require('./utils.cjs');
const require_Menu_MenuAnchor = require('./MenuAnchor.cjs');
const require_Menu_MenuRoot = require('./MenuRoot.cjs');
const require_Menu_MenuContentImpl = require('./MenuContentImpl.cjs');
const require_Menu_MenuItemImpl = require('./MenuItemImpl.cjs');
const require_Menu_MenuSub = require('./MenuSub.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Menu/MenuSubTrigger.vue?vue&type=script&setup=true&lang.ts
var MenuSubTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "MenuSubTrigger",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
			type: String,
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
	setup(__props) {
		const props = __props;
		const menuContext = require_Menu_MenuRoot.injectMenuContext();
		const rootContext = require_Menu_MenuRoot.injectMenuRootContext();
		const subContext = require_Menu_MenuSub.injectMenuSubContext();
		const contentContext = require_Menu_MenuContentImpl.injectMenuContentContext();
		const openTimerRef = (0, vue.ref)(null);
		subContext.triggerId ||= require_shared_useId.useId(void 0, "reka-menu-sub-trigger");
		function clearOpenTimer() {
			if (openTimerRef.value) window.clearTimeout(openTimerRef.value);
			openTimerRef.value = null;
		}
		(0, vue.onUnmounted)(() => {
			clearOpenTimer();
		});
		function handlePointerMove(event) {
			if (!require_Menu_utils.isMouseEvent(event)) return;
			const defaultPrevented = contentContext.onItemEnter(event);
			if (defaultPrevented) return;
			if (!props.disabled && !menuContext.open.value && !openTimerRef.value) {
				contentContext.onPointerGraceIntentChange(null);
				openTimerRef.value = window.setTimeout(() => {
					menuContext.onOpenChange(true);
					clearOpenTimer();
				}, 100);
			}
		}
		async function handlePointerLeave(event) {
			if (!require_Menu_utils.isMouseEvent(event)) return;
			clearOpenTimer();
			const contentRect = menuContext.content.value?.getBoundingClientRect();
			if (contentRect?.width) {
				const side = menuContext.content.value?.dataset.side;
				const rightSide = side === "right";
				const bleed = rightSide ? -5 : 5;
				const contentNearEdge = contentRect[rightSide ? "left" : "right"];
				const contentFarEdge = contentRect[rightSide ? "right" : "left"];
				contentContext.onPointerGraceIntentChange({
					area: [
						{
							x: event.clientX + bleed,
							y: event.clientY
						},
						{
							x: contentNearEdge,
							y: contentRect.top
						},
						{
							x: contentFarEdge,
							y: contentRect.top
						},
						{
							x: contentFarEdge,
							y: contentRect.bottom
						},
						{
							x: contentNearEdge,
							y: contentRect.bottom
						}
					],
					side
				});
				window.clearTimeout(contentContext.pointerGraceTimerRef.value);
				contentContext.pointerGraceTimerRef.value = window.setTimeout(() => contentContext.onPointerGraceIntentChange(null), 300);
			} else {
				const defaultPrevented = contentContext.onTriggerLeave(event);
				if (defaultPrevented) return;
				contentContext.onPointerGraceIntentChange(null);
			}
		}
		async function handleKeyDown(event) {
			const isTypingAhead = contentContext.searchRef.value !== "";
			if (props.disabled || isTypingAhead && event.key === " ") return;
			if (require_Menu_utils.SUB_OPEN_KEYS[rootContext.dir.value].includes(event.key)) {
				menuContext.onOpenChange(true);
				await (0, vue.nextTick)();
				menuContext.content.value?.focus();
				event.preventDefault();
			}
		}
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)(require_Menu_MenuAnchor.MenuAnchor_default, { "as-child": "" }, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)(require_Menu_MenuItemImpl.MenuItemImpl_default, (0, vue.mergeProps)(props, {
					id: (0, vue.unref)(subContext).triggerId,
					ref: (vnode) => {
						(0, vue.unref)(subContext)?.onTriggerChange(vnode?.$el);
						return void 0;
					},
					"aria-haspopup": "menu",
					"aria-expanded": (0, vue.unref)(menuContext).open.value,
					"aria-controls": (0, vue.unref)(subContext).contentId,
					"data-state": (0, vue.unref)(require_Menu_utils.getOpenState)((0, vue.unref)(menuContext).open.value),
					onClick: _cache[0] || (_cache[0] = async (event) => {
						if (props.disabled || event.defaultPrevented) return;
						/**
						* We manually focus because iOS Safari doesn't always focus on click (e.g. buttons)
						* and we rely heavily on `onFocusOutside` for submenus to close when switching
						* between separate submenus.
						*/
						event.currentTarget.focus();
						if (!(0, vue.unref)(menuContext).open.value) (0, vue.unref)(menuContext).onOpenChange(true);
					}),
					onPointermove: handlePointerMove,
					onPointerleave: handlePointerLeave,
					onKeydown: handleKeyDown
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"id",
					"aria-expanded",
					"aria-controls",
					"data-state"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Menu/MenuSubTrigger.vue
var MenuSubTrigger_default = MenuSubTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'MenuSubTrigger_default', {
  enumerable: true,
  get: function () {
    return MenuSubTrigger_default;
  }
});
//# sourceMappingURL=MenuSubTrigger.cjs.map