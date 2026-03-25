const require_shared_clamp = require('../shared/clamp.cjs');
const require_shared_createContext = require('../shared/createContext.cjs');

//#region src/Slider/utils.ts
function getNextSortedValues(prevValues = [], nextValue, atIndex) {
	const nextValues = [...prevValues];
	nextValues[atIndex] = nextValue;
	return nextValues.sort((a, b) => a - b);
}
function convertValueToPercentage(value, min, max) {
	const maxSteps = max - min;
	const percentPerStep = 100 / maxSteps;
	const percentage = percentPerStep * (value - min);
	return require_shared_clamp.clamp(percentage, 0, 100);
}
/**
* Returns a label for each thumb when there are two or more thumbs
*/
function getLabel(index, totalValues) {
	if (totalValues > 2) return `Value ${index + 1} of ${totalValues}`;
	else if (totalValues === 2) return ["Minimum", "Maximum"][index];
	else return void 0;
}
/**
* Given a `values` array and a `nextValue`, determine which value in
* the array is closest to `nextValue` and return its index.
*
* @example
* // returns 1
* getClosestValueIndex([10, 30], 25);
*/
function getClosestValueIndex(values, nextValue) {
	if (values.length === 1) return 0;
	const distances = values.map((value) => Math.abs(value - nextValue));
	const closestDistance = Math.min(...distances);
	return distances.indexOf(closestDistance);
}
/**
* Offsets the thumb centre point while sliding to ensure it remains
* within the bounds of the slider when reaching the edges
*/
function getThumbInBoundsOffset(width, left, direction) {
	const halfWidth = width / 2;
	const halfPercent = 50;
	const offset = linearScale([0, halfPercent], [0, halfWidth]);
	return (halfWidth - offset(left) * direction) * direction;
}
/**
* Gets an array of steps between each value.
*
* @example
* // returns [1, 9]
* getStepsBetweenValues([10, 11, 20]);
*/
function getStepsBetweenValues(values) {
	return values.slice(0, -1).map((value, index) => values[index + 1] - value);
}
/**
* Verifies the minimum steps between all values is greater than or equal
* to the expected minimum steps.
*
* @example
* // returns false
* hasMinStepsBetweenValues([1,2,3], 2);
*
* @example
* // returns true
* hasMinStepsBetweenValues([1,2,3], 1);
*/
function hasMinStepsBetweenValues(values, minStepsBetweenValues) {
	if (minStepsBetweenValues > 0) {
		const stepsBetweenValues = getStepsBetweenValues(values);
		const actualMinStepsBetweenValues = Math.min(...stepsBetweenValues);
		return actualMinStepsBetweenValues >= minStepsBetweenValues;
	}
	return true;
}
function linearScale(input, output) {
	return (value) => {
		if (input[0] === input[1] || output[0] === output[1]) return output[0];
		const ratio = (output[1] - output[0]) / (input[1] - input[0]);
		return output[0] + ratio * (value - input[0]);
	};
}
function getDecimalCount(value) {
	return (String(value).split(".")[1] || "").length;
}
function roundValue(value, decimalCount) {
	const rounder = 10 ** decimalCount;
	return Math.round(value * rounder) / rounder;
}
const PAGE_KEYS = ["PageUp", "PageDown"];
const ARROW_KEYS = [
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight"
];
const BACK_KEYS = {
	"from-left": [
		"Home",
		"PageDown",
		"ArrowDown",
		"ArrowLeft"
	],
	"from-right": [
		"Home",
		"PageDown",
		"ArrowDown",
		"ArrowRight"
	],
	"from-bottom": [
		"Home",
		"PageDown",
		"ArrowDown",
		"ArrowLeft"
	],
	"from-top": [
		"Home",
		"PageUp",
		"ArrowUp",
		"ArrowLeft"
	]
};
const [injectSliderOrientationContext, provideSliderOrientationContext] = require_shared_createContext.createContext(["SliderVertical", "SliderHorizontal"]);

//#endregion
Object.defineProperty(exports, 'ARROW_KEYS', {
  enumerable: true,
  get: function () {
    return ARROW_KEYS;
  }
});
Object.defineProperty(exports, 'BACK_KEYS', {
  enumerable: true,
  get: function () {
    return BACK_KEYS;
  }
});
Object.defineProperty(exports, 'PAGE_KEYS', {
  enumerable: true,
  get: function () {
    return PAGE_KEYS;
  }
});
Object.defineProperty(exports, 'convertValueToPercentage', {
  enumerable: true,
  get: function () {
    return convertValueToPercentage;
  }
});
Object.defineProperty(exports, 'getClosestValueIndex', {
  enumerable: true,
  get: function () {
    return getClosestValueIndex;
  }
});
Object.defineProperty(exports, 'getDecimalCount', {
  enumerable: true,
  get: function () {
    return getDecimalCount;
  }
});
Object.defineProperty(exports, 'getLabel', {
  enumerable: true,
  get: function () {
    return getLabel;
  }
});
Object.defineProperty(exports, 'getNextSortedValues', {
  enumerable: true,
  get: function () {
    return getNextSortedValues;
  }
});
Object.defineProperty(exports, 'getThumbInBoundsOffset', {
  enumerable: true,
  get: function () {
    return getThumbInBoundsOffset;
  }
});
Object.defineProperty(exports, 'hasMinStepsBetweenValues', {
  enumerable: true,
  get: function () {
    return hasMinStepsBetweenValues;
  }
});
Object.defineProperty(exports, 'injectSliderOrientationContext', {
  enumerable: true,
  get: function () {
    return injectSliderOrientationContext;
  }
});
Object.defineProperty(exports, 'linearScale', {
  enumerable: true,
  get: function () {
    return linearScale;
  }
});
Object.defineProperty(exports, 'provideSliderOrientationContext', {
  enumerable: true,
  get: function () {
    return provideSliderOrientationContext;
  }
});
Object.defineProperty(exports, 'roundValue', {
  enumerable: true,
  get: function () {
    return roundValue;
  }
});
//# sourceMappingURL=utils.cjs.map