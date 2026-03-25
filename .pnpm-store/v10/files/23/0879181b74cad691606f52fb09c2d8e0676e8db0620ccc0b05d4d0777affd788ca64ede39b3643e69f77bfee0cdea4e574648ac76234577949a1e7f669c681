const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_errors = require('./errors.cjs');
const openai = require_rolldown_runtime.__toESM(require("openai"));

//#region src/utils/client.ts
function wrapOpenAIClientError(e) {
	if (!e || typeof e !== "object") return e;
	let error;
	if (e.constructor.name === openai.APIConnectionTimeoutError.name && "message" in e && typeof e.message === "string") {
		error = new Error(e.message);
		error.name = "TimeoutError";
	} else if (e.constructor.name === openai.APIUserAbortError.name && "message" in e && typeof e.message === "string") {
		error = new Error(e.message);
		error.name = "AbortError";
	} else if ("status" in e && e.status === 400 && "message" in e && typeof e.message === "string" && e.message.includes("tool_calls")) error = require_errors.addLangChainErrorFields(e, "INVALID_TOOL_RESULTS");
	else if ("status" in e && e.status === 401) error = require_errors.addLangChainErrorFields(e, "MODEL_AUTHENTICATION");
	else if ("status" in e && e.status === 429) error = require_errors.addLangChainErrorFields(e, "MODEL_RATE_LIMIT");
	else if ("status" in e && e.status === 404) error = require_errors.addLangChainErrorFields(e, "MODEL_NOT_FOUND");
	else error = e;
	return error;
}

//#endregion
exports.wrapOpenAIClientError = wrapOpenAIClientError;
//# sourceMappingURL=client.cjs.map