//#region src/util/is-network-error/index.js
const objectToString = Object.prototype.toString;
const isError = (value) => objectToString.call(value) === "[object Error]";
const errorMessages = new Set([
	"network error",
	"Failed to fetch",
	"NetworkError when attempting to fetch resource.",
	"The Internet connection appears to be offline.",
	"Network request failed",
	"fetch failed",
	"terminated",
	" A network error occurred.",
	"Network connection lost"
]);
function isNetworkError(error) {
	const isValid = error && isError(error) && error.name === "TypeError" && typeof error.message === "string";
	if (!isValid) return false;
	const { message, stack } = error;
	if (message === "Load failed") return stack === void 0 || "__sentry_captured__" in error;
	if (message.startsWith("error sending request for url")) return true;
	return errorMessages.has(message);
}

//#endregion
export { isNetworkError };
//# sourceMappingURL=index.js.map