function getErrorStackTrace(e) {
    if (typeof e !== "object" || e == null)
        return undefined;
    if (!("stack" in e) || typeof e.stack !== "string")
        return undefined;
    let stack = e.stack;
    const prevLine = `${e}`;
    if (stack.startsWith(prevLine)) {
        stack = stack.slice(prevLine.length);
    }
    if (stack.startsWith("\n")) {
        stack = stack.slice(1);
    }
    return stack;
}
export function printErrorStackTrace(e) {
    const stack = getErrorStackTrace(e);
    if (stack == null)
        return;
    console.error(stack);
}
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
export class LangSmithConflictError extends Error {
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
}
/**
 * LangSmithNotFoundError
 *
 * Represents an error that occurs when a requested resource is not found,
 * typically corresponding to HTTP 404 status code responses.
 *
 * @extends Error
 */
export class LangSmithNotFoundError extends Error {
    constructor(message) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "LangSmithNotFoundError";
        this.status = 404;
    }
}
export function isLangSmithNotFoundError(error) {
    return (error != null &&
        typeof error === "object" &&
        "name" in error &&
        error?.name === "LangSmithNotFoundError");
}
/**
 * Throws an appropriate error based on the response status and body.
 *
 * @param response - The fetch Response object
 * @param context - Additional context to include in the error message (e.g., operation being performed)
 * @throws {LangSmithConflictError} When the response status is 409
 * @throws {Error} For all other non-ok responses
 */
export async function raiseForStatus(response, context, consumeOnSuccess) {
    let errorBody;
    if (response.ok) {
        // consume the response body to release the connection
        // https://undici.nodejs.org/#/?id=garbage-collection
        if (consumeOnSuccess) {
            errorBody = await response.text();
        }
        return;
    }
    if (response.status === 403) {
        try {
            const errorData = await response.json();
            const errorCode = errorData?.error;
            if (errorCode === "org_scoped_key_requires_workspace") {
                errorBody =
                    "This API key is org-scoped and requires workspace specification. " +
                        "Please provide 'workspaceId' parameter, " +
                        "or set LANGSMITH_WORKSPACE_ID environment variable.";
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            const errorWithStatus = new Error(`${response.status} ${response.statusText}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            errorWithStatus.status = response?.status;
            throw errorWithStatus;
        }
    }
    if (errorBody === undefined) {
        try {
            errorBody = await response.text();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (e) {
            errorBody = "";
        }
    }
    const fullMessage = `Failed to ${context}. Received status [${response.status}]: ${response.statusText}. Message: ${errorBody}`;
    if (response.status === 404) {
        throw new LangSmithNotFoundError(fullMessage);
    }
    if (response.status === 409) {
        throw new LangSmithConflictError(fullMessage);
    }
    const err = new Error(fullMessage);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err.status = response.status;
    throw err;
}
const ERR_CONFLICTING_ENDPOINTS = "ERR_CONFLICTING_ENDPOINTS";
export class ConflictingEndpointsError extends Error {
    constructor() {
        super("You cannot provide both LANGSMITH_ENDPOINT / LANGCHAIN_ENDPOINT " +
            "and LANGSMITH_RUNS_ENDPOINTS.");
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ERR_CONFLICTING_ENDPOINTS
        });
        this.name = "ConflictingEndpointsError"; // helpful in logs
    }
}
export function isConflictingEndpointsError(err) {
    return (typeof err === "object" &&
        err !== null &&
        err.code === ERR_CONFLICTING_ENDPOINTS);
}
