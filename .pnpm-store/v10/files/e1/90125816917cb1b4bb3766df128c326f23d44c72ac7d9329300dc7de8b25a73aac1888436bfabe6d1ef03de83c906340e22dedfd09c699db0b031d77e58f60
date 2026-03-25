const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_ScrollArea_ScrollAreaRoot = require('./ScrollAreaRoot.cjs');
const require_ScrollArea_utils = require('./utils.cjs');
const require_ScrollArea_ScrollAreaScrollbarX = require('./ScrollAreaScrollbarX.cjs');
const require_ScrollArea_ScrollAreaScrollbarY = require('./ScrollAreaScrollbarY.cjs');
const require_ScrollArea_ScrollAreaScrollbar = require('./ScrollAreaScrollbar.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/ScrollArea/ScrollAreaScrollbarVisible.vue?vue&type=script&setup=true&lang.ts
const [injectScrollAreaScrollbarVisibleContext, provideScrollAreaScrollbarVisibleContext] = require_shared_createContext.createContext("ScrollAreaScrollbarVisible");
var ScrollAreaScrollbarVisible_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "ScrollAreaScrollbarVisible",
	setup(__props) {
		const rootContext = require_ScrollArea_ScrollAreaRoot.injectScrollAreaRootContext();
		const scrollbarContext = require_ScrollArea_ScrollAreaScrollbar.injectScrollAreaScrollbarContext();
		const { forwardRef } = require_shared_useForwardExpose.useForwardExpose();
		const sizes = (0, vue.ref)({
			content: 0,
			viewport: 0,
			scrollbar: {
				size: 0,
				paddingStart: 0,
				paddingEnd: 0
			}
		});
		const hasThumb = (0, vue.computed)(() => {
			const thumbRatio = require_ScrollArea_utils.getThumbRatio(sizes.value.viewport, sizes.value.content);
			return Boolean(thumbRatio > 0 && thumbRatio < 1);
		});
		const thumbRef = (0, vue.ref)();
		const pointerOffset = (0, vue.ref)(0);
		function handleWheelScroll(event, payload) {
			if (isShowingScrollbarX.value) {
				const scrollPos = rootContext.viewport.value.scrollLeft + event.deltaY;
				rootContext.viewport.value.scrollLeft = scrollPos;
				if (require_ScrollArea_utils.isScrollingWithinScrollbarBounds(scrollPos, payload)) event.preventDefault();
			} else {
				const scrollPos = rootContext.viewport.value.scrollTop + event.deltaY;
				rootContext.viewport.value.scrollTop = scrollPos;
				if (require_ScrollArea_utils.isScrollingWithinScrollbarBounds(scrollPos, payload)) event.preventDefault();
			}
		}
		function handleThumbDown(event, payload) {
			if (isShowingScrollbarX.value) pointerOffset.value = payload.x;
			else pointerOffset.value = payload.y;
		}
		function handleThumbUp(event) {
			pointerOffset.value = 0;
		}
		function handleSizeChange(payload) {
			sizes.value = payload;
		}
		function getScrollPosition(pointerPos, dir) {
			return require_ScrollArea_utils.getScrollPositionFromPointer(pointerPos, pointerOffset.value, sizes.value, dir);
		}
		const isShowingScrollbarX = (0, vue.computed)(() => scrollbarContext.isHorizontal.value);
		function onDragScroll(payload) {
			if (isShowingScrollbarX.value) rootContext.viewport.value.scrollLeft = getScrollPosition(payload, rootContext.dir.value);
			else rootContext.viewport.value.scrollTop = getScrollPosition(payload);
		}
		function onThumbPositionChange() {
			if (isShowingScrollbarX.value) {
				if (rootContext.viewport.value && thumbRef.value) {
					const scrollPos = rootContext.viewport.value.scrollLeft;
					const offset = require_ScrollArea_utils.getThumbOffsetFromScroll(scrollPos, sizes.value, rootContext.dir.value);
					thumbRef.value.style.transform = `translate3d(${offset}px, 0, 0)`;
				}
			} else if (rootContext.viewport.value && thumbRef.value) {
				const scrollPos = rootContext.viewport.value.scrollTop;
				const offset = require_ScrollArea_utils.getThumbOffsetFromScroll(scrollPos, sizes.value);
				thumbRef.value.style.transform = `translate3d(0, ${offset}px, 0)`;
			}
		}
		function onThumbChange(element) {
			thumbRef.value = element;
		}
		provideScrollAreaScrollbarVisibleContext({
			sizes,
			hasThumb,
			handleWheelScroll,
			handleThumbDown,
			handleThumbUp,
			handleSizeChange,
			onThumbPositionChange,
			onThumbChange,
			onDragScroll
		});
		return (_ctx, _cache) => {
			return isShowingScrollbarX.value ? ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarX.ScrollAreaScrollbarX_default, (0, vue.mergeProps)({ key: 0 }, _ctx.$attrs, { ref: (0, vue.unref)(forwardRef) }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : ((0, vue.openBlock)(), (0, vue.createBlock)(require_ScrollArea_ScrollAreaScrollbarY.ScrollAreaScrollbarY_default, (0, vue.mergeProps)({ key: 1 }, _ctx.$attrs, { ref: (0, vue.unref)(forwardRef) }), {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 16));
		};
	}
});

//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarVisible.vue
var ScrollAreaScrollbarVisible_default = ScrollAreaScrollbarVisible_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'ScrollAreaScrollbarVisible_default', {
  enumerable: true,
  get: function () {
    return ScrollAreaScrollbarVisible_default;
  }
});
Object.defineProperty(exports, 'injectScrollAreaScrollbarVisibleContext', {
  enumerable: true,
  get: function () {
    return injectScrollAreaScrollbarVisibleContext;
  }
});
//# sourceMappingURL=ScrollAreaScrollbarVisible.cjs.map