//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/utils/error.js
/**
* LangSmithConflictError
*
* Represents an error that occurs when there's a conflict during an operation,
* typically corresponding to HTTP 409 status code responses.
*
* This error is thrown when an attempt to create or modify a resource conflicts
* with the current state of the resource on the server. Common scenarios include:
* - Attempting to create a resource that already exists
* - Trying to update a resource that has been modified by another process
* - Violating a uniqueness constraint in the data
*
* @extends Error
*
* @example
* try {
*   await createProject("existingProject");
* } catch (error) {
*   if (error instanceof ConflictError) {
*     console.log("A conflict occurred:", error.message);
*     // Handle the conflict, e.g., by suggesting a different project name
*   } else {
*     // Handle other types of errors
*   }
* }
*
* @property {string} name - Always set to 'ConflictError' for easy identification
* @property {string} message - Detailed error message including server response
*
* @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
*/
var LangSmithConflictError = class extends Error {
	constructor(message) {
		super(message);
		Object.defineProperty(this, "status", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: void 0
		});
		this.name = "LangSmithConflictError";
		this.status = 409;
	}
};
/**
* Throws an appropriate error based on the response status and body.
*
* @param response - The fetch Response object
* @param context - Additional context to include in the error message (e.g., operation being performed)
* @throws {LangSmithConflictError} When the response status is 409
* @throws {Error} For all other non-ok responses
*/
async function raiseForStatus(response, context, consumeOnSuccess) {
	let errorBody;
	if (response.ok) {
		if (consumeOnSuccess) errorBody = await response.text();
		return;
	}
	if (response.status === 403) try {
		const errorData = await response.json();
		const errorCode = errorData?.error;
		if (errorCode === "org_scoped_key_requires_workspace") errorBody = "This API key is org-scoped and requires workspace specification. Please provide 'workspaceId' parameter, or set LANGSMITH_WORKSPACE_ID environment variable.";
	} catch (e) {
		const errorWithStatus = /* @__PURE__ */ new Error(`${response.status} ${response.statusText}`);
		errorWithStatus.status = response?.status;
		throw errorWithStatus;
	}
	if (errorBody === void 0) try {
		errorBody = await response.text();
	} catch (e) {
		errorBody = "";
	}
	const fullMessage = `Failed to ${context}. Received status [${response.status}]: ${response.statusText}. Message: ${errorBody}`;
	if (response.status === 409) throw new LangSmithConflictError(fullMessage);
	const err = new Error(fullMessage);
	err.status = response.status;
	throw err;
}
const ERR_CONFLICTING_ENDPOINTS = "ERR_CONFLICTING_ENDPOINTS";
var ConflictingEndpointsError = class extends Error {
	constructor() {
		super("You cannot provide both LANGSMITH_ENDPOINT / LANGCHAIN_ENDPOINT and LANGSMITH_RUNS_ENDPOINTS.");
		Object.defineProperty(this, "code", {
			enumerable: true,
			configurable: true,
			writable: true,
			value: ERR_CONFLICTING_ENDPOINTS
		});
		this.name = "ConflictingEndpointsError";
	}
};
function isConflictingEndpointsError(err) {
	return typeof err === "object" && err !== null && err.code === ERR_CONFLICTING_ENDPOINTS;
}

//#endregion
export { ConflictingEndpointsError, isConflictingEndpointsError, raiseForStatus };
//# sourceMappingURL=error.js.map