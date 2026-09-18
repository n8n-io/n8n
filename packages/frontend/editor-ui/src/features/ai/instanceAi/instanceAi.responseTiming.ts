/** A high-resolution timestamp that remains comparable across browser windows. */
export function instanceAiResponseNow(): number {
	return performance.timeOrigin + performance.now();
}
