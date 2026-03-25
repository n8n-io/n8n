//#region src/ui/utils.ts
function unique(array) {
	return [...new Set(array)];
}
function findLast(array, predicate) {
	for (let i = array.length - 1; i >= 0; i -= 1) if (predicate(array[i])) return array[i];
}
async function* filterStream(stream, filter) {
	while (true) {
		const { value, done } = await stream.next();
		if (done) return value;
		if (filter(value)) yield value;
	}
}
//#endregion
export { filterStream, findLast, unique };

//# sourceMappingURL=utils.js.map