'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.randomString = randomString;
const alphabet_1 = require('@n8n/constants/alphabet');
const randomInt_1 = require('../random/randomInt');
function randomString(minLength, maxLength) {
	const length =
		maxLength === undefined ? minLength : (0, randomInt_1.randomInt)(minLength, maxLength + 1);
	return [...crypto.getRandomValues(new Uint32Array(length))]
		.map((byte) => alphabet_1.ALPHABET[byte % alphabet_1.ALPHABET.length])
		.join('');
}
//# sourceMappingURL=randomString.js.map
