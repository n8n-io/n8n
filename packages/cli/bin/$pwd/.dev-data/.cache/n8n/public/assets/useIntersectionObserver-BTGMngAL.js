import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Vf as ref, of as onBeforeUnmount } from "./vendor-Hx42-oQF.js";
//#region ../@n8n/composables/src/useIntersectionObserver.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Composable for observing element intersections with automatic cleanup
*
* @example
* const { observe } = useIntersectionObserver({
*   root: containerRef,
*   onIntersect: () => loadMore(),
* });
*
* // Observe last item in list
* observe(lastItemElement);
*/
function useIntersectionObserver(options) {
	const observer = ref(null);
	/**
	* Stop observing and clean up the observer
	*/
	const disconnect = () => {
		if (observer.value) {
			observer.value.disconnect();
			observer.value = null;
		}
	};
	/**
	* Start observing an element for intersection
	* Automatically cleans up any existing observer before creating a new one
	*/
	const observe = (element) => {
		if (!element) return;
		disconnect();
		observer.value = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				if (options.once !== false) disconnect();
				options.onIntersect();
			}
		}, {
			root: options.root.value,
			threshold: options.threshold ?? .01
		});
		observer.value.observe(element);
	};
	onBeforeUnmount(() => {
		disconnect();
	});
	return {
		observer,
		observe,
		disconnect
	};
}
//#endregion
export { useIntersectionObserver as t };
