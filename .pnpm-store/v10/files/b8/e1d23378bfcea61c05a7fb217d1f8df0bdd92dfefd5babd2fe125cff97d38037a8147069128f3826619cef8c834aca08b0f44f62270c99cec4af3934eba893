const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/connery.ts
var connery_exports = {};
require_rolldown_runtime.__export(connery_exports, {
	ConneryAction: () => ConneryAction,
	ConneryService: () => ConneryService
});
/**
* A LangChain Tool object wrapping a Connery action.
* ConneryAction is a structured tool that can be used only in the agents supporting structured tools.
* @extends StructuredTool
*/
var ConneryAction = class extends __langchain_core_tools.StructuredTool {
	name;
	description;
	schema;
	/**
	* Creates a ConneryAction instance based on the provided Connery Action.
	* @param _action The Connery Action.
	* @param _service The ConneryService instance.
	* @returns A ConneryAction instance.
	*/
	constructor(_action, _service) {
		super();
		this._action = _action;
		this._service = _service;
		this.name = this._action.id;
		this.description = this._action.title + (this._action.description ? `: ${this._action.description}` : "");
		this.schema = this.createInputSchema();
	}
	/**
	* Runs the Connery Action with the provided input.
	* @param arg The input object expected by the action.
	* @returns A promise that resolves to a JSON string containing the output of the action.
	*/
	_call(arg) {
		return this._service.runAction(this._action.id, arg);
	}
	/**
	* Creates a Zod schema for the input object expected by the Connery action.
	* @returns A Zod schema for the input object expected by the Connery action.
	*/
	createInputSchema() {
		const dynamicInputFields = {};
		this._action.inputParameters.forEach((param) => {
			const isRequired = param.validation?.required ?? false;
			let fieldSchema = zod_v3.z.string();
			fieldSchema = isRequired ? fieldSchema : fieldSchema.optional();
			const fieldDescription = param.title + (param.description ? `: ${param.description}` : "");
			fieldSchema = fieldSchema.describe(fieldDescription);
			dynamicInputFields[param.key] = fieldSchema;
		});
		return zod_v3.z.object(dynamicInputFields);
	}
};
/**
* A service for working with Connery Actions.
*/
var ConneryService = class {
	runnerUrl;
	apiKey;
	asyncCaller;
	/**
	* Creates a ConneryService instance.
	* @param params A ConneryServiceParams object.
	* If not provided, the values are retrieved from the CONNERY_RUNNER_URL
	* and CONNERY_RUNNER_API_KEY environment variables.
	* @returns A ConneryService instance.
	*/
	constructor(params) {
		const runnerUrl = params?.runnerUrl ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("CONNERY_RUNNER_URL");
		const apiKey = params?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("CONNERY_RUNNER_API_KEY");
		if (!runnerUrl || !apiKey) throw new Error("CONNERY_RUNNER_URL and CONNERY_RUNNER_API_KEY environment variables must be set.");
		this.runnerUrl = runnerUrl;
		this.apiKey = apiKey;
		this.asyncCaller = new __langchain_core_utils_async_caller.AsyncCaller(params ?? {});
	}
	/**
	* Returns the list of Connery Actions wrapped as a LangChain StructuredTool objects.
	* @returns A promise that resolves to an array of ConneryAction objects.
	*/
	async listActions() {
		const actions = await this._listActions();
		return actions.map((action) => new ConneryAction(action, this));
	}
	/**
	* Returns the specified Connery action wrapped as a LangChain StructuredTool object.
	* @param actionId The ID of the action to return.
	* @returns A promise that resolves to a ConneryAction object.
	*/
	async getAction(actionId) {
		const action = await this._getAction(actionId);
		return new ConneryAction(action, this);
	}
	/**
	* Runs the specified Connery action with the provided input.
	* @param actionId The ID of the action to run.
	* @param input The input object expected by the action.
	* @returns A promise that resolves to a JSON string containing the output of the action.
	*/
	async runAction(actionId, input = {}) {
		const result = await this._runAction(actionId, input);
		return JSON.stringify(result);
	}
	/**
	* Returns the list of actions available in the Connery runner.
	* @returns A promise that resolves to an array of Action objects.
	*/
	async _listActions() {
		const response = await this.asyncCaller.call(fetch, `${this.runnerUrl}/v1/actions`, {
			method: "GET",
			headers: this._getHeaders()
		});
		await this._handleError(response, "Failed to list actions");
		const apiResponse = await response.json();
		return apiResponse.data;
	}
	/**
	* Returns the specified action available in the Connery runner.
	* @param actionId The ID of the action to return.
	* @returns A promise that resolves to an Action object.
	* @throws An error if the action with the specified ID is not found.
	*/
	async _getAction(actionId) {
		const actions = await this._listActions();
		const action = actions.find((a) => a.id === actionId);
		if (!action) throw new Error(`The action with ID "${actionId}" was not found in the list of available actions in the Connery runner.`);
		return action;
	}
	/**
	* Runs the specified Connery action with the provided input.
	* @param actionId The ID of the action to run.
	* @param input The input object expected by the action.
	* @returns A promise that resolves to a RunActionResult object.
	*/
	async _runAction(actionId, input = {}) {
		const response = await this.asyncCaller.call(fetch, `${this.runnerUrl}/v1/actions/${actionId}/run`, {
			method: "POST",
			headers: this._getHeaders(),
			body: JSON.stringify({ input })
		});
		await this._handleError(response, "Failed to run action");
		const apiResponse = await response.json();
		return apiResponse.data.output;
	}
	/**
	* Returns a standard set of HTTP headers to be used in API calls to the Connery runner.
	* @returns An object containing the standard set of HTTP headers.
	*/
	_getHeaders() {
		return {
			"Content-Type": "application/json",
			"x-api-key": this.apiKey
		};
	}
	/**
	* Shared error handler for API calls to the Connery runner.
	* If the response is not ok, an error is thrown containing the error message returned by the Connery runner.
	* Otherwise, the promise resolves to void.
	* @param response The response object returned by the Connery runner.
	* @param errorMessage The error message to be used in the error thrown if the response is not ok.
	* @returns A promise that resolves to void.
	* @throws An error containing the error message returned by the Connery runner.
	*/
	async _handleError(response, errorMessage) {
		if (response.ok) return;
		const apiErrorResponse = await response.json();
		throw new Error(`${errorMessage}. Status code: ${response.status}. Error message: ${apiErrorResponse.error.message}`);
	}
};

//#endregion
exports.ConneryAction = ConneryAction;
exports.ConneryService = ConneryService;
Object.defineProperty(exports, 'connery_exports', {
  enumerable: true,
  get: function () {
    return connery_exports;
  }
});
//# sourceMappingURL=connery.cjs.map