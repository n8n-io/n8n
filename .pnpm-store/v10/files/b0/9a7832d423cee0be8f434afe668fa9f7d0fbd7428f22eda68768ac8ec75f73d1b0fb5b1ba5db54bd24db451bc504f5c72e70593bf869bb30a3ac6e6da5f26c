import { __export } from "../_virtual/rolldown_runtime.js";
import { LLM } from "@langchain/core/language_models/llms";
import { AI, environment } from "@raycast/api";

//#region src/llms/raycast.ts
var raycast_exports = {};
__export(raycast_exports, { RaycastAI: () => RaycastAI });
const wait = (ms) => new Promise((resolve) => {
	setTimeout(resolve, ms);
});
/**
* The RaycastAI class, which extends the LLM class and implements the RaycastAIInput interface.
*/
var RaycastAI = class extends LLM {
	lc_serializable = true;
	/**
	* The model to use for generating text.
	*/
	model;
	/**
	* The creativity parameter, also known as the "temperature".
	*/
	creativity;
	/**
	* The rate limit for API calls, in requests per minute.
	*/
	rateLimitPerMinute;
	/**
	* The timestamp of the last API call, used to enforce the rate limit.
	*/
	lastCallTimestamp = 0;
	/**
	* Creates a new instance of the RaycastAI class.
	* @param {RaycastAIInput} fields The input parameters for the RaycastAI class.
	* @throws {Error} If the Raycast AI environment is not accessible.
	*/
	constructor(fields) {
		super(fields ?? {});
		if (!environment.canAccess(AI)) throw new Error("Raycast AI environment is not accessible.");
		if (fields.model === void 0) throw new Error(`You must provide a "model" field in your params.`);
		this.model = fields.model;
		this.creativity = fields.creativity ?? .5;
		this.rateLimitPerMinute = fields.rateLimitPerMinute ?? 10;
	}
	/**
	* Returns the type of the LLM, which is "raycast_ai".
	* @return {string} The type of the LLM.
	* @ignore
	*/
	_llmType() {
		return "raycast_ai";
	}
	/**
	* Calls AI.ask with the given prompt and returns the generated text.
	* @param {string} prompt The prompt to generate text from.
	* @return {Promise<string>} A Promise that resolves to the generated text.
	* @ignore
	*/
	async _call(prompt, options) {
		const response = await this.caller.call(async () => {
			const now = Date.now();
			const timeSinceLastCall = now - this.lastCallTimestamp;
			const timeToWait = 60 / this.rateLimitPerMinute * 1e3 - timeSinceLastCall;
			if (timeToWait > 0) await wait(timeToWait);
			return await AI.ask(prompt, {
				model: this.model,
				creativity: this.creativity,
				signal: options.signal
			});
		});
		return response;
	}
};

//#endregion
export { RaycastAI, raycast_exports };
//# sourceMappingURL=raycast.js.map