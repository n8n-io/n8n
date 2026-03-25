//#region src/Splitter/utils/debounce.ts
function debounce(callback, durationMs = 10) {
	let timeoutId = null;
	const callable = (...args) => {
		if (timeoutId !== null) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			callback(...args);
		}, durationMs);
	};
	return callable;
}

//#endregion
export { debounce };
//# sourceMappingURL=debounce.js.map