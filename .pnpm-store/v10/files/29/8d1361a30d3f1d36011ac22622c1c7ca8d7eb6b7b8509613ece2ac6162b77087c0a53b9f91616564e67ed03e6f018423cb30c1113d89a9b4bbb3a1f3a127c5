import { __export } from "../_virtual/rolldown_runtime.js";
import { GenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms/replicate.ts
var replicate_exports = {};
__export(replicate_exports, { Replicate: () => Replicate });
/**
* Class responsible for managing the interaction with the Replicate API.
* It handles the API key and model details, makes the actual API calls,
* and converts the API response into a format usable by the rest of the
* LangChain framework.
* @example
* ```typescript
* const model = new Replicate({
*   model: "replicate/flan-t5-xl:3ae0799123a1fe11f8c89fd99632f843fc5f7a761630160521c4253149754523",
* });
*
* const res = await model.invoke(
*   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
* );
* console.log({ res });
* ```
*/
var Replicate = class Replicate extends LLM {
	static lc_name() {
		return "Replicate";
	}
	get lc_secrets() {
		return { apiKey: "REPLICATE_API_TOKEN" };
	}
	lc_serializable = true;
	model;
	input;
	apiKey;
	promptKey;
	constructor(fields) {
		super(fields);
		const apiKey = fields?.apiKey ?? getEnvironmentVariable("REPLICATE_API_KEY") ?? getEnvironmentVariable("REPLICATE_API_TOKEN");
		if (!apiKey) throw new Error("Please set the REPLICATE_API_TOKEN environment variable");
		this.apiKey = apiKey;
		this.model = fields.model;
		this.input = fields.input ?? {};
		this.promptKey = fields.promptKey;
	}
	_llmType() {
		return "replicate";
	}
	/** @ignore */
	async _call(prompt, options) {
		const replicate = await this._prepareReplicate();
		const input = await this._getReplicateInput(replicate, prompt);
		const output = await this.caller.callWithOptions({ signal: options.signal }, () => replicate.run(this.model, { input }));
		if (typeof output === "string") return output;
		else if (Array.isArray(output)) return output.join("");
		else return String(output);
	}
	async *_streamResponseChunks(prompt, options, runManager) {
		const replicate = await this._prepareReplicate();
		const input = await this._getReplicateInput(replicate, prompt);
		const stream = await this.caller.callWithOptions({ signal: options?.signal }, async () => replicate.stream(this.model, { input }));
		for await (const chunk of stream) {
			if (chunk.event === "output") {
				yield new GenerationChunk({
					text: chunk.data,
					generationInfo: chunk
				});
				await runManager?.handleLLMNewToken(chunk.data ?? "");
			}
			if (chunk.event === "done") yield new GenerationChunk({
				text: "",
				generationInfo: { finished: true }
			});
		}
	}
	/** @ignore */
	static async imports() {
		try {
			const { default: Replicate$1 } = await import("replicate");
			return { Replicate: Replicate$1 };
		} catch {
			throw new Error("Please install replicate as a dependency with, e.g. `pnpm install replicate`");
		}
	}
	async _prepareReplicate() {
		const imports = await Replicate.imports();
		return new imports.Replicate({
			userAgent: "langchain",
			auth: this.apiKey
		});
	}
	async _getReplicateInput(replicate, prompt) {
		if (this.promptKey === void 0) {
			const [modelString, versionString] = this.model.split(":");
			const version = await replicate.models.versions.get(modelString.split("/")[0], modelString.split("/")[1], versionString);
			const openapiSchema = version.openapi_schema;
			const inputProperties = openapiSchema?.components?.schemas?.Input?.properties;
			if (inputProperties === void 0) this.promptKey = "prompt";
			else {
				const sortedInputProperties = Object.entries(inputProperties).sort(([_keyA, valueA], [_keyB, valueB]) => {
					const orderA = valueA["x-order"] || 0;
					const orderB = valueB["x-order"] || 0;
					return orderA - orderB;
				});
				this.promptKey = sortedInputProperties[0][0] ?? "prompt";
			}
		}
		return {
			[this.promptKey]: prompt,
			...this.input
		};
	}
};

//#endregion
export { Replicate, replicate_exports };
//# sourceMappingURL=replicate.js.map