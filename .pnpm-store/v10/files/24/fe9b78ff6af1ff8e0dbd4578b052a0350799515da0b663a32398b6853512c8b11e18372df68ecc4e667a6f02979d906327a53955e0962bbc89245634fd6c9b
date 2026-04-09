//#region src/ui/utils.ts
/**
* Returns true when `onFinish` declares at least one parameter and therefore
* needs the server-fetched thread head. A zero-arity `onFinish` is treated as
* side-effect-only and does not trigger a post-stream `getHistory` when
* branching history is not enabled.
*
* Note: functions with only default parameters report `.length === 0` in
* JavaScript; if you need the thread state, declare at least one non-default
* parameter (e.g. `(state)` or `(_state, run)`).
*/
function onFinishRequiresThreadState(onFinish) {
	if (typeof onFinish !== "function") return false;
	return onFinish.length > 0;
}
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
exports.filterStream = filterStream;
exports.findLast = findLast;
exports.onFinishRequiresThreadState = onFinishRequiresThreadState;
exports.unique = unique;

//# sourceMappingURL=utils.cjs.map