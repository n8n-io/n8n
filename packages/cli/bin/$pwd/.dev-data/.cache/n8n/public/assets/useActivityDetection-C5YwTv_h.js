import { $d as init_runtime_core_esm_bundler, Tf as watch, lf as onMounted, pd as useDebounceFn, uf as onUnmounted } from "./vendor-Hx42-oQF.js";
import { eC as DEBOUNCE_TIME, yy as getDebounceTime } from "./app-D5flEmb-.js";
//#region src/app/composables/useActivityDetection.ts
init_runtime_core_esm_bundler();
function useActivityDetection(store) {
	const recordActivity = useDebounceFn(() => {
		store.recordActivity();
	}, getDebounceTime(DEBOUNCE_TIME.COLLABORATION.ACTIVITY));
	const events = [
		"mousedown",
		"keydown",
		"touchstart"
	];
	const attachListeners = () => {
		events.forEach((event) => {
			document.addEventListener(event, recordActivity, { passive: true });
		});
	};
	const detachListeners = () => {
		events.forEach((event) => {
			document.removeEventListener(event, recordActivity);
		});
	};
	watch(() => store.isCurrentTabWriter, (isWriter) => {
		if (isWriter) attachListeners();
		else detachListeners();
	});
	onMounted(() => {
		if (store.isCurrentTabWriter) attachListeners();
	});
	onUnmounted(() => {
		detachListeners();
	});
	return { recordActivity };
}
//#endregion
export { useActivityDetection as t };
