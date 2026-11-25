//#region ../@n8n/composables/src/useLatestFetch.ts
function useLatestFetch() {
	let generation = 0;
	function next() {
		const thisGeneration = ++generation;
		return () => thisGeneration === generation;
	}
	function invalidate() {
		generation++;
	}
	return {
		invalidate,
		next
	};
}
//#endregion
export { useLatestFetch as t };
