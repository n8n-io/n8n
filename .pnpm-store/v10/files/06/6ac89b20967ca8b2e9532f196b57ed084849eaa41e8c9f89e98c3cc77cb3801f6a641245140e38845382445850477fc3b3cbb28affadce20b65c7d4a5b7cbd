import { __export } from "../_virtual/rolldown_runtime.js";
import { LLM } from "@langchain/core/language_models/llms";
import { LayerupSecurity as LayerupSecurity$1 } from "@layerup/layerup-security";

//#region src/llms/layerup_security.ts
var layerup_security_exports = {};
__export(layerup_security_exports, { LayerupSecurity: () => LayerupSecurity });
function defaultGuardrailViolationHandler(violation) {
	if (violation.canned_response) return violation.canned_response;
	const guardrailName = violation.offending_guardrail ? `Guardrail ${violation.offending_guardrail}` : "A guardrail";
	throw new Error(`${guardrailName} was violated without a proper guardrail violation handler.`);
}
var LayerupSecurity = class extends LLM {
	static lc_name() {
		return "LayerupSecurity";
	}
	lc_serializable = true;
	llm;
	layerupApiKey;
	layerupApiBaseUrl = "https://api.uselayerup.com/v1";
	promptGuardrails = [];
	responseGuardrails = [];
	mask = false;
	metadata = {};
	handlePromptGuardrailViolation = defaultGuardrailViolationHandler;
	handleResponseGuardrailViolation = defaultGuardrailViolationHandler;
	layerup;
	constructor(options) {
		super(options);
		if (!options.llm) throw new Error("Layerup Security requires an LLM to be provided.");
		else if (!options.layerupApiKey) throw new Error("Layerup Security requires an API key to be provided.");
		this.llm = options.llm;
		this.layerupApiKey = options.layerupApiKey;
		this.layerupApiBaseUrl = options.layerupApiBaseUrl || this.layerupApiBaseUrl;
		this.promptGuardrails = options.promptGuardrails || this.promptGuardrails;
		this.responseGuardrails = options.responseGuardrails || this.responseGuardrails;
		this.mask = options.mask || this.mask;
		this.metadata = options.metadata || this.metadata;
		this.handlePromptGuardrailViolation = options.handlePromptGuardrailViolation || this.handlePromptGuardrailViolation;
		this.handleResponseGuardrailViolation = options.handleResponseGuardrailViolation || this.handleResponseGuardrailViolation;
		this.layerup = new LayerupSecurity$1({
			apiKey: this.layerupApiKey,
			baseURL: this.layerupApiBaseUrl
		});
	}
	_llmType() {
		return "layerup_security";
	}
	async _call(input, options) {
		let messages = [{
			role: "user",
			content: input
		}];
		let unmaskResponse;
		if (this.mask) [messages, unmaskResponse] = await this.layerup.maskPrompt(messages, this.metadata);
		if (this.promptGuardrails.length > 0) {
			const securityResponse = await this.layerup.executeGuardrails(this.promptGuardrails, messages, input, this.metadata);
			if (!securityResponse.all_safe) {
				const replacedResponse = this.handlePromptGuardrailViolation(securityResponse);
				return replacedResponse.content;
			}
		}
		let result = await this.llm.invoke(messages[0].content, options);
		if (this.mask && unmaskResponse) result = unmaskResponse(result);
		messages.push({
			role: "assistant",
			content: result
		});
		if (this.responseGuardrails.length > 0) {
			const securityResponse = await this.layerup.executeGuardrails(this.responseGuardrails, messages, result, this.metadata);
			if (!securityResponse.all_safe) {
				const replacedResponse = this.handleResponseGuardrailViolation(securityResponse);
				return replacedResponse.content;
			}
		}
		return result;
	}
};

//#endregion
export { LayerupSecurity, layerup_security_exports };
//# sourceMappingURL=layerup_security.js.map