const require_utils_assert = require('./assert.cjs');
const require_utils_compare = require('./compare.cjs');
const require_utils_resizePanel = require('./resizePanel.cjs');

//#region src/Splitter/utils/validation.ts
function validatePanelGroupLayout({ layout: prevLayout, panelConstraints }) {
	const nextLayout = [...prevLayout];
	const nextLayoutTotalSize = nextLayout.reduce((accumulated, current) => accumulated + current, 0);
	if (nextLayout.length !== panelConstraints.length) throw new Error(`Invalid ${panelConstraints.length} panel layout: ${nextLayout.map((size) => `${size}%`).join(", ")}`);
	else if (!require_utils_compare.fuzzyNumbersEqual(nextLayoutTotalSize, 100)) {
		console.warn(`WARNING: Invalid layout total size: ${nextLayout.map((size) => `${size}%`).join(", ")}. Layout normalization will be applied.`);
		for (let index = 0; index < panelConstraints.length; index++) {
			const unsafeSize = nextLayout[index];
			require_utils_assert.assert(unsafeSize != null);
			const safeSize = 100 / nextLayoutTotalSize * unsafeSize;
			nextLayout[index] = safeSize;
		}
	}
	let remainingSize = 0;
	for (let index = 0; index < panelConstraints.length; index++) {
		const unsafeSize = nextLayout[index];
		require_utils_assert.assert(unsafeSize != null);
		const safeSize = require_utils_resizePanel.resizePanel({
			panelConstraints,
			panelIndex: index,
			size: unsafeSize
		});
		if (unsafeSize !== safeSize) {
			remainingSize += unsafeSize - safeSize;
			nextLayout[index] = safeSize;
		}
	}
	if (!require_utils_compare.fuzzyNumbersEqual(remainingSize, 0)) for (let index = 0; index < panelConstraints.length; index++) {
		const prevSize = nextLayout[index];
		require_utils_assert.assert(prevSize != null);
		const unsafeSize = prevSize + remainingSize;
		const safeSize = require_utils_resizePanel.resizePanel({
			panelConstraints,
			panelIndex: index,
			size: unsafeSize
		});
		if (prevSize !== safeSize) {
			remainingSize -= safeSize - prevSize;
			nextLayout[index] = safeSize;
			if (require_utils_compare.fuzzyNumbersEqual(remainingSize, 0)) break;
		}
	}
	return nextLayout;
}

//#endregion
Object.defineProperty(exports, 'validatePanelGroupLayout', {
  enumerable: true,
  get: function () {
    return validatePanelGroupLayout;
  }
});
//# sourceMappingURL=validation.cjs.map