'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.randomInt = randomInt;
function randomInt(min, max) {
	if (max === undefined) {
		max = min;
		min = 0;
	}
	return min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min));
}
//# sourceMappingURL=randomInt.js.map
