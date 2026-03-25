import { z } from "zod/v4";

//#region src/agents/middleware/error.ts
/**
* Error thrown when the configuration for a retry middleware is invalid.
*/
var InvalidRetryConfigError = class extends Error {
	cause;
	constructor(error) {
		const message = z.prettifyError(error).slice(2);
		super(message);
		this.name = "InvalidRetryConfigError";
		this.cause = error;
	}
};

//#endregion
export { InvalidRetryConfigError };
//# sourceMappingURL=error.js.map