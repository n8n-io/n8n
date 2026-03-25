const require_utils_assert = require('./assert.cjs');
const require_utils_compare = require('./compare.cjs');
const require_utils_resizePanel = require('./resizePanel.cjs');

//#region src/Splitter/utils/layout.ts
function compareLayouts(a, b) {
	if (a.length !== b.length) return false;
	else for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false;
	return true;
}
function adjustLayoutByDelta({ delta, layout: prevLayout, panelConstraints: panelConstraintsArray, pivotIndices, trigger }) {
	if (require_utils_compare.fuzzyNumbersEqual(delta, 0)) return prevLayout;
	const nextLayout = [...prevLayout];
	const [firstPivotIndex, secondPivotIndex] = pivotIndices;
	require_utils_assert.assert(firstPivotIndex != null);
	require_utils_assert.assert(secondPivotIndex != null);
	let deltaApplied = 0;
	if (trigger === "keyboard") {
		{
			const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
			const panelConstraints = panelConstraintsArray[index];
			require_utils_assert.assert(panelConstraints);
			if (panelConstraints.collapsible) {
				const prevSize = prevLayout[index];
				require_utils_assert.assert(prevSize != null);
				const panelConstraints$1 = panelConstraintsArray[index];
				require_utils_assert.assert(panelConstraints$1);
				const { collapsedSize = 0, minSize = 0 } = panelConstraints$1;
				if (require_utils_compare.fuzzyNumbersEqual(prevSize, collapsedSize)) {
					const localDelta = minSize - prevSize;
					if (require_utils_compare.fuzzyCompareNumbers(localDelta, Math.abs(delta)) > 0) delta = delta < 0 ? 0 - localDelta : localDelta;
				}
			}
		}
		{
			const index = delta < 0 ? firstPivotIndex : secondPivotIndex;
			const panelConstraints = panelConstraintsArray[index];
			require_utils_assert.assert(panelConstraints);
			const { collapsible } = panelConstraints;
			if (collapsible) {
				const prevSize = prevLayout[index];
				require_utils_assert.assert(prevSize != null);
				const panelConstraints$1 = panelConstraintsArray[index];
				require_utils_assert.assert(panelConstraints$1);
				const { collapsedSize = 0, minSize = 0 } = panelConstraints$1;
				if (require_utils_compare.fuzzyNumbersEqual(prevSize, minSize)) {
					const localDelta = prevSize - collapsedSize;
					if (require_utils_compare.fuzzyCompareNumbers(localDelta, Math.abs(delta)) > 0) delta = delta < 0 ? 0 - localDelta : localDelta;
				}
			}
		}
	}
	{
		const increment = delta < 0 ? 1 : -1;
		let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
		let maxAvailableDelta = 0;
		while (true) {
			const prevSize = prevLayout[index];
			require_utils_assert.assert(prevSize != null);
			const maxSafeSize = require_utils_resizePanel.resizePanel({
				panelConstraints: panelConstraintsArray,
				panelIndex: index,
				size: 100
			});
			const delta$1 = maxSafeSize - prevSize;
			maxAvailableDelta += delta$1;
			index += increment;
			if (index < 0 || index >= panelConstraintsArray.length) break;
		}
		const minAbsDelta = Math.min(Math.abs(delta), Math.abs(maxAvailableDelta));
		delta = delta < 0 ? 0 - minAbsDelta : minAbsDelta;
	}
	{
		const pivotIndex = delta < 0 ? firstPivotIndex : secondPivotIndex;
		let index = pivotIndex;
		while (index >= 0 && index < panelConstraintsArray.length) {
			const deltaRemaining = Math.abs(delta) - Math.abs(deltaApplied);
			const prevSize = prevLayout[index];
			require_utils_assert.assert(prevSize != null);
			const unsafeSize = prevSize - deltaRemaining;
			const safeSize = require_utils_resizePanel.resizePanel({
				panelConstraints: panelConstraintsArray,
				panelIndex: index,
				size: unsafeSize
			});
			if (!require_utils_compare.fuzzyNumbersEqual(prevSize, safeSize)) {
				deltaApplied += prevSize - safeSize;
				nextLayout[index] = safeSize;
				if (deltaApplied.toPrecision(3).localeCompare(Math.abs(delta).toPrecision(3), void 0, { numeric: true }) >= 0) break;
			}
			if (delta < 0) index--;
			else index++;
		}
	}
	if (require_utils_compare.fuzzyNumbersEqual(deltaApplied, 0)) return prevLayout;
	{
		const pivotIndex = delta < 0 ? secondPivotIndex : firstPivotIndex;
		const prevSize = prevLayout[pivotIndex];
		require_utils_assert.assert(prevSize != null);
		const unsafeSize = prevSize + deltaApplied;
		const safeSize = require_utils_resizePanel.resizePanel({
			panelConstraints: panelConstraintsArray,
			panelIndex: pivotIndex,
			size: unsafeSize
		});
		nextLayout[pivotIndex] = safeSize;
		if (!require_utils_compare.fuzzyNumbersEqual(safeSize, unsafeSize)) {
			let deltaRemaining = unsafeSize - safeSize;
			const pivotIndex$1 = delta < 0 ? secondPivotIndex : firstPivotIndex;
			let index = pivotIndex$1;
			while (index >= 0 && index < panelConstraintsArray.length) {
				const prevSize$1 = nextLayout[index];
				require_utils_assert.assert(prevSize$1 != null);
				const unsafeSize$1 = prevSize$1 + deltaRemaining;
				const safeSize$1 = require_utils_resizePanel.resizePanel({
					panelConstraints: panelConstraintsArray,
					panelIndex: index,
					size: unsafeSize$1
				});
				if (!require_utils_compare.fuzzyNumbersEqual(prevSize$1, safeSize$1)) {
					deltaRemaining -= safeSize$1 - prevSize$1;
					nextLayout[index] = safeSize$1;
				}
				if (require_utils_compare.fuzzyNumbersEqual(deltaRemaining, 0)) break;
				if (delta > 0) index--;
				else index++;
			}
		}
	}
	const totalSize = nextLayout.reduce((total, size) => size + total, 0);
	if (!require_utils_compare.fuzzyNumbersEqual(totalSize, 100)) return prevLayout;
	return nextLayout;
}

//#endregion
Object.defineProperty(exports, 'adjustLayoutByDelta', {
  enumerable: true,
  get: function () {
    return adjustLayoutByDelta;
  }
});
Object.defineProperty(exports, 'compareLayouts', {
  enumerable: true,
  get: function () {
    return compareLayouts;
  }
});
//# sourceMappingURL=layout.cjs.map