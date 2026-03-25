const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Presence_Presence = require('../Presence/Presence.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_NavigationMenu_NavigationMenuRoot = require('./NavigationMenuRoot.cjs');
const require_NavigationMenu_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/NavigationMenu/NavigationMenuViewport.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuViewport_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "NavigationMenuViewport",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
		align: {
			type: String,
			required: false,
			default: "center"
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
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const menuContext = require_NavigationMenu_NavigationMenuRoot.injectNavigationMenuContext();
		const { activeTrigger, rootNavigationMenu, modelValue } = menuContext;
		const size = (0, vue.ref)();
		const position = (0, vue.ref)();
		const open = (0, vue.computed)(() => !!menuContext.modelValue.value);
		(0, vue.watch)(currentElement, () => {
			menuContext.onViewportChange(currentElement.value);
		});
		const content = (0, vue.ref)();
		(0, vue.watch)([modelValue, open], () => {
			if (!currentElement.value) return;
			requestAnimationFrame(() => {
				const el = currentElement.value?.querySelector("[data-state=open]");
				content.value = el;
			});
		}, {
			immediate: true,
			flush: "post"
		});
		function updatePosition() {
			if (content.value && activeTrigger.value && rootNavigationMenu.value) {
				const bodyWidth = document.documentElement.offsetWidth;
				const bodyHeight = document.documentElement.offsetHeight;
				const rootRect = rootNavigationMenu.value.getBoundingClientRect();
				const rect = activeTrigger.value.getBoundingClientRect();
				const { offsetWidth, offsetHeight } = content.value;
				const startPositionLeft = rect.left - rootRect.left;
				const startPositionTop = rect.top - rootRect.top;
				let posLeft = null;
				let posTop = null;
				switch (props.align) {
					case "start":
						posLeft = startPositionLeft;
						posTop = startPositionTop;
						break;
					case "end":
						posLeft = startPositionLeft - offsetWidth + rect.width;
						posTop = startPositionTop - offsetHeight + rect.height;
						break;
					default:
						posLeft = startPositionLeft - offsetWidth / 2 + rect.width / 2;
						posTop = startPositionTop - offsetHeight / 2 + rect.height / 2;
				}
				const screenOffset = 10;
				if (posLeft + rootRect.left < screenOffset) posLeft = screenOffset - rootRect.left;
				const rightOffset = posLeft + rootRect.left + offsetWidth;
				if (rightOffset > bodyWidth - screenOffset) {
					posLeft -= rightOffset - bodyWidth + screenOffset;
					if (posLeft < screenOffset - rootRect.left) posLeft = screenOffset - rootRect.left;
				}
				if (posTop + rootRect.top < screenOffset) posTop = screenOffset - rootRect.top;
				const bottomOffset = posTop + rootRect.top + offsetHeight;
				if (bottomOffset > bodyHeight - screenOffset) {
					posTop -= bottomOffset - bodyHeight + screenOffset;
					if (posTop < screenOffset - rootRect.top) posTop = screenOffset - rootRect.top;
				}
				posLeft = Math.round(posLeft);
				posTop = Math.round(posTop);
				position.value = {
					left: posLeft,
					top: posTop
				};
			}
		}
		(0, __vueuse_core.useResizeObserver)(content, () => {
			if (content.value) {
				size.value = {
					width: content.value.offsetWidth,
					height: content.value.offsetHeight
				};
				updatePosition();
			}
		});
		(0, __vueuse_core.useResizeObserver)([globalThis.document?.body, rootNavigationMenu], () => {
			updatePosition();
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Presence_Presence.Presence_default), {
				present: _ctx.forceMount || open.value,
				"force-mount": !(0, vue.unref)(menuContext).unmountOnHide.value,
				onAfterLeave: _cache[2] || (_cache[2] = () => {
					size.value = void 0;
					position.value = void 0;
				})
			}, {
				default: (0, vue.withCtx)(({ present }) => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
					ref: (0, vue.unref)(forwardRef),
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-state": (0, vue.unref)(require_NavigationMenu_utils.getOpenState)(open.value),
					"data-orientation": (0, vue.unref)(menuContext).orientation,
					style: {
						pointerEvents: !open.value && (0, vue.unref)(menuContext).isRootMenu ? "none" : void 0,
						["--reka-navigation-menu-viewport-width"]: size.value ? `${size.value?.width}px` : void 0,
						["--reka-navigation-menu-viewport-height"]: size.value ? `${size.value?.height}px` : void 0,
						["--reka-navigation-menu-viewport-left"]: position.value ? `${position.value?.left}px` : void 0,
						["--reka-navigation-menu-viewport-top"]: position.value ? `${position.value?.top}px` : void 0
					},
					hidden: !present,
					onPointerenter: _cache[0] || (_cache[0] = ($event) => (0, vue.unref)(menuContext).onContentEnter((0, vue.unref)(menuContext).modelValue.value)),
					onPointerleave: _cache[1] || (_cache[1] = ($event) => (0, vue.unref)(require_NavigationMenu_utils.whenMouse)(() => (0, vue.unref)(menuContext).onContentLeave())($event))
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 2
				}, 1040, [
					"as",
					"as-child",
					"data-state",
					"data-orientation",
					"style",
					"hidden"
				])]),
				_: 3
			}, 8, ["present", "force-mount"]);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuViewport.vue
var NavigationMenuViewport_default = NavigationMenuViewport_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'NavigationMenuViewport_default', {
  enumerable: true,
  get: function () {
    return NavigationMenuViewport_default;
  }
});
//# sourceMappingURL=NavigationMenuViewport.cjs.map