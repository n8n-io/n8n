
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
Object.defineProperty(exports, 'debounce', {
  enumerable: true,
  get: function () {
    return debounce;
  }
});
//# sourceMappingURL=debounce.cjs.map