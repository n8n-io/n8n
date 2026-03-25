const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_openai = require_rolldown_runtime.__toESM(require("@langchain/openai"));
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));

//#region src/chains/openai_moderation.ts
/**
* Class representing a chain for moderating text using the OpenAI
* Moderation API. It extends the BaseChain class and implements the
* OpenAIModerationChainInput interface.
* @example
* ```typescript
* const moderation = new OpenAIModerationChain({ throwError: true });
*
* const badString = "Bad naughty words from user";
*
* try {
*   const { output: moderatedContent, results } = await moderation.call({
*     input: badString,
*   });
*
*   if (results[0].category_scores["harassment/threatening"] > 0.01) {
*     throw new Error("Harassment detected!");
*   }
*
*   const model = new OpenAI({ temperature: 0 });
*   const promptTemplate = "Hello, how are you today {person}?";
*   const prompt = new PromptTemplate({
*     template: promptTemplate,
*     inputVariables: ["person"],
*   });
*   const chain = new LLMChain({ llm: model, prompt });
*   const response = await chain.call({ person: moderatedContent });
*   console.log({ response });
* } catch (error) {
*   console.error("Naughty words detected!");
* }
* ```
*/
var OpenAIModerationChain = class extends require_base.BaseChain {
	static lc_name() {
		return "OpenAIModerationChain";
	}
	get lc_secrets() {
		return { openAIApiKey: "OPENAI_API_KEY" };
	}
	inputKey = "input";
	outputKey = "output";
	openAIApiKey;
	openAIOrganization;
	clientConfig;
	client;
	throwError;
	caller;
	constructor(fields) {
		super(fields);
		this.throwError = fields?.throwError ?? false;
		this.openAIApiKey = fields?.apiKey ?? fields?.openAIApiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("OPENAI_API_KEY");
		if (!this.openAIApiKey) throw new Error("OpenAI API key not found");
		this.openAIOrganization = fields?.openAIOrganization;
		this.clientConfig = {
			...fields?.configuration,
			apiKey: this.openAIApiKey,
			organization: this.openAIOrganization
		};
		this.client = new __langchain_openai.OpenAIClient(this.clientConfig);
		this.caller = new __langchain_core_utils_async_caller.AsyncCaller(fields ?? {});
	}
	_moderate(text, results) {
		if (results.flagged) {
			const errorStr = "Text was found that violates OpenAI's content policy.";
			if (this.throwError) throw new Error(errorStr);
			else return errorStr;
		}
		return text;
	}
	async _call(values) {
		const text = values[this.inputKey];
		const moderationRequest = { input: text };
		let mod;
		try {
			mod = await this.caller.call(() => this.client.moderations.create(moderationRequest));
		} catch (error) {
			if (error instanceof Error) throw error;
			else throw new Error(error);
		}
		const output = this._moderate(text, mod.results[0]);
		return {
			[this.outputKey]: output,
			results: mod.results
		};
	}
	_chainType() {
		return "moderation_chain";
	}
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return [this.outputKey];
	}
};

//#endregion
exports.OpenAIModerationChain = OpenAIModerationChain;
//# sourceMappingURL=openai_moderation.cjs.map