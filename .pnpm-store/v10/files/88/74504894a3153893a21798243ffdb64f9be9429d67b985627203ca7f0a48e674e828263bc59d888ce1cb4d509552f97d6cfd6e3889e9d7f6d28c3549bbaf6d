import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { isClient } from "@vueuse/shared";

//#region src/Avatar/utils.ts
function resolveLoadingStatus(image, src) {
	if (!image) return "idle";
	if (!src) return "error";
	if (image.src !== src) image.src = src;
	return image.complete && image.naturalWidth > 0 ? "loaded" : "loading";
}
function useImageLoadingStatus(src, { referrerPolicy, crossOrigin } = {}) {
	const isMounted = ref(false);
	const imageRef = ref(null);
	const image = computed(() => {
		if (!isMounted.value) return null;
		if (!imageRef.value && isClient) imageRef.value = new window.Image();
		return imageRef.value;
	});
	const loadingStatus = ref(resolveLoadingStatus(image.value, src.value));
	const updateStatus = (status) => () => {
		if (isMounted.value) loadingStatus.value = status;
	};
	onMounted(() => {
		isMounted.value = true;
		watchEffect((onCleanup) => {
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
	onUnmounted(() => {
		isMounted.value = false;
	});
	return loadingStatus;
}

//#endregion
export { useImageLoadingStatus };
//# sourceMappingURL=utils.js.map