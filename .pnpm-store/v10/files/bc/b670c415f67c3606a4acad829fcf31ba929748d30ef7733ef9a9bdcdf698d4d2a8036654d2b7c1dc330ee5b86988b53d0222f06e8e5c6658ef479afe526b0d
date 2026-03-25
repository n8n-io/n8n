//#region src/utils/failed_handler.ts
const STATUS_NO_RETRY = [
	400,
	401,
	402,
	403,
	404,
	405,
	406,
	407,
	408,
	409
];
function failedAttemptHandler(error) {
	const status = error?.response?.status ?? 0;
	if (status === 0) {
		console.error("failedAttemptHandler", error);
		throw error;
	}
	if (STATUS_NO_RETRY.includes(+status)) throw error;
}
function ensureParams(params) {
	return {
		onFailedAttempt: failedAttemptHandler,
		...params ?? {}
	};
}

//#endregion
export { ensureParams, failedAttemptHandler };
//# sourceMappingURL=failed_handler.js.map