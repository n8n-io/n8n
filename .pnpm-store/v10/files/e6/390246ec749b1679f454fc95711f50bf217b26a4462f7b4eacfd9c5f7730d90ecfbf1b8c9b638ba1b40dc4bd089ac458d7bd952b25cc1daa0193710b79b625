import { addLangChainErrorFields } from "./errors.js";
import { APIConnectionTimeoutError, APIUserAbortError } from "openai";

//#region src/utils/client.ts
function wrapOpenAIClientError(e) {
	if (!e || typeof e !== "object") return e;
	let error;
	if (e.constructor.name === APIConnectionTimeoutError.name && "message" in e && typeof e.message === "string") {
		error = new Error(e.message);
		error.name = "TimeoutError";
	} else if (e.constructor.name === APIUserAbortError.name && "message" in e && typeof e.message === "string") {
		error = new Error(e.message);
		error.name = "AbortError";
	} else if ("status" in e && e.status === 400 && "message" in e && typeof e.message === "string" && e.message.includes("tool_calls")) error = addLangChainErrorFields(e, "INVALID_TOOL_RESULTS");
	else if ("status" in e && e.status === 401) error = addLangChainErrorFields(e, "MODEL_AUTHENTICATION");
	else if ("status" in e && e.status === 429) error = addLangChainErrorFields(e, "MODEL_RATE_LIMIT");
	else if ("status" in e && e.status === 404) error = addLangChainErrorFields(e, "MODEL_NOT_FOUND");
	else error = e;
	return error;
}

//#endregion
export { wrapOpenAIClientError };
//# sourceMappingURL=client.js.map