//#region src/ui/errors.ts
var StreamError = class extends Error {
	constructor(data) {
		super(data.message);
		this.name = data.name ?? data.error ?? "StreamError";
	}
	static isStructuredError(error) {
		return typeof error === "object" && error != null && "message" in error;
	}
};

//#endregion
export { StreamError };
//# sourceMappingURL=errors.js.map