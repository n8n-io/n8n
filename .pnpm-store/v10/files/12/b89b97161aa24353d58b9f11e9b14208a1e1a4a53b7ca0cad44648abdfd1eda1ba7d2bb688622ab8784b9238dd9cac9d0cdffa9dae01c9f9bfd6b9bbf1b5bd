const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_shared = require_rolldown_runtime.__toESM(require("@vueuse/shared"));

//#region src/Avatar/utils.ts
function resolveLoadingStatus(image, src) {
	if (!image) return "idle";
	if (!src) return "error";
	if (image.src !== src) image.src = src;
	return image.complete && image.naturalWidth > 0 ? "loaded" : "loading";
}
function useImageLoadingStatus(src, { referrerPolicy, crossOrigin } = {}) {
	const isMounted = (0, vue.ref)(false);
	const imageRef = (0, vue.ref)(null);
	const image = (0, vue.computed)(() => {
		if (!isMounted.value) return null;
		if (!imageRef.value && __vueuse_shared.isClient) imageRef.value = new window.Image();
		return imageRef.value;
	});
	const loadingStatus = (0, vue.ref)(resolveLoadingStatus(image.value, src.value));
	const updateStatus = (status) => () => {
		if (isMounted.value) loadingStatus.value = status;
	};
	(0, vue.onMounted)(() => {
		isMounted.value = true;
		(0, vue.watchEffect)((onCleanup) => {
			const img = image.value;
			if (!img) return;
			loadingStatus.value = resolveLoadingStatus(img, src.value);
			const handleLoad = updateStatus("loaded");
			const handleError = updateStatus("error");
			img.addEventListener("load", handleLoad);
			img.addEventListener("error", handleError);
			if (referrerPolicy?.value) img.referrerPolicy = referrerPolicy.value;
			if (typeof crossOrigin?.value === "string") img.crossOrigin = crossOrigin.value;
			onCleanup(() => {
				img.removeEventListener("load", handleLoad);
				img.removeEventListener("error", handleError);
			});
		});
	});
	(0, vue.onUnmounted)(() => {
		isMounted.value = false;
	});
	return loadingStatus;
}

//#endregion
Object.defineProperty(exports, 'useImageLoadingStatus', {
  enumerable: true,
  get: function () {
    return useImageLoadingStatus;
  }
});
//# sourceMappingURL=utils.cjs.map