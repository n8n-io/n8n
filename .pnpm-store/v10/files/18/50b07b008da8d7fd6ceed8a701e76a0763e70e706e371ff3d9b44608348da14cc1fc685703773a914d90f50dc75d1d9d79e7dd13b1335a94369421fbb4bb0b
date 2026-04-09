export function randomFloat(min = 0, max = 1): number {
	return Math.random() * (max - min) + min;
}

export function randomHex(length = 1): string {
	let s = '';
	for (let i = 0; i < length; i++) {
		s += Math.floor(Math.random() * 16).toString(16);
	}
	return s;
}

export function randomBoolean(): boolean {
	return !!Math.round(Math.random());
}

export function randomBinaryString(length = 1): string {
	let b = '';
	for (let i = 0; i < length; i++) {
		b += Math.round(Math.random());
	}
	return b;
}

export function randomInt(min = 0, max = 1): number {
	return Math.round(Math.random() * (max - min) + min);
}

/**
 * Gets a random int, r, with the probability P(r) = (base)**r
 * For example, with a probability of 1/2: P(1) = 1/2, P(2) = 1/4, etc.
 * @param probability the probability
 */
export function getRandomIntWithRecursiveProbability(probability = 0.5): number {
	return -Math.floor(Math.log(Math.random()) / Math.log(1 / probability));
}
