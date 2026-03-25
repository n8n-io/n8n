import { assert } from "./assert.js";
import { fuzzyNumbersEqual } from "./compare.js";
import { resizePanel } from "./resizePanel.js";

//#region src/Splitter/utils/validation.ts
function validatePanelGroupLayout({ layout: prevLayout, panelConstraints }) {
	const nextLayout = [...prevLayout];
	const nextLayoutTotalSize = nextLayout.reduce((accumulated, current) => accumulated + current, 0);
	if (nextLayout.length !== panelConstraints.length) throw new Error(`Invalid ${panelConstraints.length} panel layout: ${nextLayout.map((size) => `${size}%`).join(", ")}`);
	else if (!fuzzyNumbersEqual(nextLayoutTotalSize, 100)) {
		console.warn(`WARNING: Invalid layout total size: ${nextLayout.map((size) => `${size}%`).join(", ")}. Layout normalization will be applied.`);
		for (let index = 0; index < panelConstraints.length; index++) {
			const unsafeSize = nextLayout[index];
			assert(unsafeSize != null);
			const safeSize = 100 / nextLayoutTotalSize * unsafeSize;
			nextLayout[index] = safeSize;
		}
	}
	let remainingSize = 0;
	for (let index = 0; index < panelConstraints.length; index++) {
		const unsafeSize = nextLayout[index];
		assert(unsafeSize != null);
		const safeSize = resizePanel({
			panelConstraints,
			panelIndex: index,
			size: unsafeSize
		});
		if (unsafeSize !== safeSize) {
			remainingSize += unsafeSize - safeSize;
			nextLayout[index] = safeSize;
		}
	}
	if (!fuzzyNumbersEqual(remainingSize, 0)) for (let index = 0; index < panelConstraints.length; index++) {
		const prevSize = nextLayout[index];
		assert(prevSize != null);
		const unsafeSize = prevSize + remainingSize;
		const safeSize = resizePanel({
			panelConstraints,
			panelIndex: index,
			size: unsafeSize
		});
		if (prevSize !== safeSize) {
			remainingSize -= safeSize - prevSize;
			nextLayout[index] = safeSize;
			if (fuzzyNumbersEqual(remainingSize, 0)) break;
		}
	}
	return nextLayout;
}

//#endregion
export { validatePanelGroupLayout };
//# sourceMappingURL=validation.js.map