const require_load_index = require('../load/index.cjs');
const require_base = require('./base.cjs');

//#region src/hub/index.ts
/**
* Pull a prompt from the hub.
*
* @param ownerRepoCommit The name of the repo containing the prompt, as well as an optional commit hash separated by a slash.
* @param options.apiKey LangSmith API key to use when pulling the prompt
* @param options.apiUrl LangSmith API URL to use when pulling the prompt
* @param options.includeModel Whether to also instantiate and attach a model instance to the prompt,
*   if the prompt has associated model metadata. If set to true, invoking the resulting pulled prompt will
*   also invoke the instantiated model. For non-OpenAI models, you must also set "modelClass" to the
*   correct class of the model.
* @param options.modelClass If includeModel is true, the class of the model to instantiate. Required
*   for non-OpenAI models. If you are running in Node or another environment that supports dynamic imports,
*   you may instead import this function from "langchain/hub/node" and pass "includeModel: true" instead
*   of specifying this parameter.
* @returns
*/
async function pull(ownerRepoCommit, options) {
	const promptObject = await require_base.basePull(ownerRepoCommit, options);
	try {
		const loadedPrompt = await require_load_index.load(JSON.stringify(promptObject.manifest), void 0, require_base.generateOptionalImportMap(options?.modelClass), require_base.generateModelImportMap(options?.modelClass));
		return require_base.bindOutputSchema(loadedPrompt);
	} catch (e) {
		if (options?.includeModel) throw new Error([
			e.message,
			"",
			`To load prompts with an associated non-OpenAI model, you must use the "langchain/hub/node" entrypoint, or pass a "modelClass" parameter like this:`,
			"",
			"```",
			`import { pull } from "langchain/hub";`,
			`import { ChatAnthropic } from "@langchain/anthropic";`,
			"",
			`const prompt = await pull("my-prompt", {`,
			`  includeModel: true,`,
			`  modelClass: ChatAnthropic,`,
			`});`,
			"```"
		].join("\n"));
		else throw e;
	}
}

//#endregion
exports.pull = pull;
exports.push = require_base.basePush;
//# sourceMappingURL=index.cjs.map