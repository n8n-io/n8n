const require_language_models_llms = require("../../language_models/llms.cjs");
//#region src/utils/testing/llms.ts
var FakeLLM = class extends require_language_models_llms.LLM {
	response;
	thrownErrorString;
	constructor(fields) {
		super(fields);
		this.response = fields.response;
		this.thrownErrorString = fields.thrownErrorString;
	}
	_llmType() {
		return "fake";
	}
	async _call(prompt, _options, runManager) {
		if (this.thrownErrorString) throw new Error(this.thrownErrorString);
		const response = this.response ?? prompt;
		await runManager?.handleLLMNewToken(response);
		return response;
	}
};
var FakeStreamingLLM = class extends require_language_models_llms.LLM {
	sleep = 50;
	responses;
	thrownErrorString;
	constructor(fields) {
		super(fields);
		this.sleep = fields.sleep ?? this.sleep;
		this.responses = fields.responses;
		this.thrownErrorString = fields.thrownErrorString;
	}
	_llmType() {
		return "fake";
	}
	async _call(prompt) {
		if (this.thrownErrorString) throw new Error(this.thrownErrorString);
		const response = this.responses?.[0];
		this.responses = this.responses?.slice(1);
		return response ?? prompt;
	}
	async *_streamResponseChunks(input, _options, runManager) {
		if (this.thrownErrorString) throw new Error(this.thrownErrorString);
		const response = this.responses?.[0];
		this.responses = this.responses?.slice(1);
		for (const c of response ?? input) {
			await new Promise((resolve) => setTimeout(resolve, this.sleep));
			yield {
				text: c,
				generationInfo: {}
			};
			await runManager?.handleLLMNewToken(c);
		}
	}
};
//#endregion
exports.FakeLLM = FakeLLM;
exports.FakeStreamingLLM = FakeStreamingLLM;

//# sourceMappingURL=llms.cjs.map