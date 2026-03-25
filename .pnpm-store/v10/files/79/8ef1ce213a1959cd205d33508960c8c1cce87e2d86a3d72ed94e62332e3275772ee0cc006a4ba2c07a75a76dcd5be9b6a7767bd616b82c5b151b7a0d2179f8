const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/shared/useSize.ts
function useSize(element) {
	const size = (0, vue.ref)();
	const width = (0, vue.computed)(() => size.value?.width ?? 0);
	const height = (0, vue.computed)(() => size.value?.height ?? 0);
	(0, vue.onMounted)(() => {
		const el = (0, __vueuse_core.unrefElement)(element);
		if (el) {
			size.value = {
				width: el.offsetWidth,
				height: el.offsetHeight
			};
			const resizeObserver = new ResizeObserver((entries) => {
				if (!Array.isArray(entries)) return;
				if (!entries.length) return;
				const entry = entries[0];
				let width$1;
				let height$1;
				if ("borderBoxSize" in entry) {
					const borderSizeEntry = entry.borderBoxSize;
					const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
					width$1 = borderSize.inlineSize;
					height$1 = borderSize.blockSize;
				} else {
					width$1 = el.offsetWidth;
					height$1 = el.offsetHeight;
				}
				size.value = {
					width: width$1,
					height: height$1
				};
			});
			resizeObserver.observe(el, { box: "border-box" });
			return () => resizeObserver.unobserve(el);
		} else size.value = void 0;
	});
	return {
		width,
		height
	};
}

//#endregion
Object.defineProperty(exports, 'useSize', {
  enumerable: true,
  get: function () {
    return useSize;
  }
});
//# sourceMappingURL=useSize.cjs.map