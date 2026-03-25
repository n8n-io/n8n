const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_ConfigProvider_ConfigProvider = require('../ConfigProvider/ConfigProvider.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));
const defu = require_rolldown_runtime.__toESM(require("defu"));

//#region src/shared/useBodyScrollLock.ts
const useBodyLockStackCount = (0, __vueuse_core.createSharedComposable)(() => {
	const map = (0, vue.ref)(/* @__PURE__ */ new Map());
	const initialOverflow = (0, vue.ref)();
	const locked = (0, vue.computed)(() => {
		for (const value of map.value.values()) if (value) return true;
		return false;
	});
	const context = require_ConfigProvider_ConfigProvider.injectConfigProviderContext({ scrollBody: (0, vue.ref)(true) });
	let stopTouchMoveListener = null;
	const resetBodyStyle = () => {
		document.body.style.paddingRight = "";
		document.body.style.marginRight = "";
		document.body.style.pointerEvents = "";
		document.documentElement.style.removeProperty("--scrollbar-width");
		document.body.style.overflow = initialOverflow.value ?? "";
		__vueuse_shared.isIOS && stopTouchMoveListener?.();
		initialOverflow.value = void 0;
	};
	(0, vue.watch)(locked, (val, oldVal) => {
		if (!__vueuse_shared.isClient) return;
		if (!val) {
			if (oldVal) resetBodyStyle();
			return;
		}
		if (initialOverflow.value === void 0) initialOverflow.value = document.body.style.overflow;
		const verticalScrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		const defaultConfig = {
			padding: verticalScrollbarWidth,
			margin: 0
		};
		const config = context.scrollBody?.value ? typeof context.scrollBody.value === "object" ? (0, defu.defu)({
			padding: context.scrollBody.value.padding === true ? verticalScrollbarWidth : context.scrollBody.value.padding,
			margin: context.scrollBody.value.margin === true ? verticalScrollbarWidth : context.scrollBody.value.margin
		}, defaultConfig) : defaultConfig : {
			padding: 0,
			margin: 0
		};
		if (verticalScrollbarWidth > 0) {
			document.body.style.paddingRight = typeof config.padding === "number" ? `${config.padding}px` : String(config.padding);
			document.body.style.marginRight = typeof config.margin === "number" ? `${config.margin}px` : String(config.margin);
			document.documentElement.style.setProperty("--scrollbar-width", `${verticalScrollbarWidth}px`);
			document.body.style.overflow = "hidden";
		}
		if (__vueuse_shared.isIOS) stopTouchMoveListener = (0, __vueuse_core.useEventListener)(document, "touchmove", (e) => preventDefault(e), { passive: false });
		(0, vue.nextTick)(() => {
			document.body.style.pointerEvents = "none";
			document.body.style.overflow = "hidden";
		});
	}, {
		immediate: true,
		flush: "sync"
	});
	return map;
});
function useBodyScrollLock(initialState) {
	const id = Math.random().toString(36).substring(2, 7);
	const map = useBodyLockStackCount();
	map.value.set(id, initialState ?? false);
	const locked = (0, vue.computed)({
		get: () => map.value.get(id) ?? false,
		set: (value) => map.value.set(id, value)
	});
	(0, __vueuse_shared.tryOnBeforeUnmount)(() => {
		map.value.delete(id);
	});
	return locked;
}
function checkOverflowScroll(ele) {
	const style = window.getComputedStyle(ele);
	if (style.overflowX === "scroll" || style.overflowY === "scroll" || style.overflowX === "auto" && ele.clientWidth < ele.scrollWidth || style.overflowY === "auto" && ele.clientHeight < ele.scrollHeight) return true;
	else {
		const parent = ele.parentNode;
		if (!(parent instanceof Element) || parent.tagName === "BODY") return false;
		return checkOverflowScroll(parent);
	}
}
function preventDefault(rawEvent) {
	const e = rawEvent || window.event;
	const _target = e.target;
	if (_target instanceof Element && checkOverflowScroll(_target)) return false;
	if (e.touches.length > 1) return true;
	if (e.preventDefault && e.cancelable) e.preventDefault();
	return false;
}

//#endregion
Object.defineProperty(exports, 'useBodyScrollLock', {
  enumerable: true,
  get: function () {
    return useBodyScrollLock;
  }
});
//# sourceMappingURL=useBodyScrollLock.cjs.map