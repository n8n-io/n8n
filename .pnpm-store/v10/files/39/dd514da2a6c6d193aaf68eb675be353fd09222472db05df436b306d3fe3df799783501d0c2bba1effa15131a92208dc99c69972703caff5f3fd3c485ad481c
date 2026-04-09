import { clamp } from "../shared/clamp.js";

//#region src/ColorArea/utils.ts
function linearScale(input, output) {
	return (value) => {
		if (input[0] === input[1] || output[0] === output[1]) return output[0];
		const ratio = (output[1] - output[0]) / (input[1] - input[0]);
		return output[0] + ratio * (value - input[0]);
	};
}
function convertValueToPercentage(value, min, max) {
	if (max === min) return 0;
	const maxSteps = max - min;
	const percentPerStep = 100 / maxSteps;
	const percentage = percentPerStep * (value - min);
	return clamp(percentage, 0, 100);
}

//#endregion
export { convertValueToPercentage, linearScale };
//# sourceMappingURL=utils.js.map