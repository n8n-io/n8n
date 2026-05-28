export function useLatestFetch() {
	let generation = 0;

	function next(): () => boolean {
		const thisGeneration = ++generation;
		return () => thisGeneration === generation;
	}

	return { next };
}
