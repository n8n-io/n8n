//#region src/util/ml-distance/distances.ts
/**
*Returns the Chebyshev distance between vectors a and b
* @link [Chebyshev algorithm](https://en.wikipedia.org/wiki/Chebyshev_distance)
* @param a - first vector
* @param b - second vector
*
*/
function chebyshev(a, b) {
	let max = 0;
	let aux = 0;
	for (let i = 0; i < a.length; i++) {
		aux = Math.abs(a[i] - b[i]);
		if (max < aux) max = aux;
	}
	return max;
}
/**
*Returns the Manhattan distance between vectors a and b
* @link [Manhattan algorithm](https://www.naun.org/main/NAUN/ijmmas/mmmas-49.pdf)
* @param a - first vector
* @param b - second vector
*
*/
function manhattan(a, b) {
	let d = 0;
	for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
	return d;
}

//#endregion
export { chebyshev, manhattan };
//# sourceMappingURL=distances.js.map