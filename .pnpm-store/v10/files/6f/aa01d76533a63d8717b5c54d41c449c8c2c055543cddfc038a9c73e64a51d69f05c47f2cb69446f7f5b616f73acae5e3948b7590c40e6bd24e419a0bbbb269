//#region src/utils/error.ts
const isError = (error) => {
	if ("isError" in Error && typeof Error.isError === "function") return Error.isError(error);
	const stringTag = Object.prototype.toString.call(error);
	return stringTag === "[object Error]" || stringTag === "[object DOMException]" || stringTag === "[object DOMError]" || stringTag === "[object Exception]";
};
const getCauseError = (error) => {
	const { cause } = error;
	if (typeof cause !== "object" || cause == null) return null;
	if (!isError(cause)) return null;
	return cause;
};
const isNetworkError = (error) => {
	if (!isError(error)) return false;
	if (error.name !== "TypeError" || typeof error.message !== "string") return false;
	const msg = error.message.toLowerCase();
	const causeMsg = getCauseError(error)?.message?.toLowerCase() ?? "";
	return msg.includes("fetch") || msg.includes("network") || msg.includes("connection") || msg.includes("error sending request") || msg.includes("load failed") || msg.includes("terminated") || causeMsg.includes("other side closed") || causeMsg.includes("socket");
};
//#endregion
exports.isNetworkError = isNetworkError;

//# sourceMappingURL=error.cjs.map