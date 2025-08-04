'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.retryUntil = void 0;
const retryUntil = async (assertion, { intervalMs = 200, timeoutMs = 5000 } = {}) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();
		const tryAgain = () => {
			setTimeout(async () => {
				try {
					resolve(await assertion());
				} catch (error) {
					if (Date.now() - startTime > timeoutMs) {
						reject(error);
					} else {
						tryAgain();
					}
				}
			}, intervalMs);
		};
		tryAgain();
	});
};
exports.retryUntil = retryUntil;
//# sourceMappingURL=retry-until.js.map
