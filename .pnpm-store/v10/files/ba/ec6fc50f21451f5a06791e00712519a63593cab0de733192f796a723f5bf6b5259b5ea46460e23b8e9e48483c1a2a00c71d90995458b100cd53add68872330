const require_chat_models_universal = require('../chat_models/universal.cjs');
const require_load_index = require('../load/index.cjs');
const require_base = require('./base.cjs');

//#region src/hub/node.ts
/**
* Pull a prompt from the hub.
* @param ownerRepoCommit The name of the repo containing the prompt, as well as an optional commit hash separated by a slash.
* @param options.apiKey LangSmith API key to use when pulling the prompt
* @param options.apiUrl LangSmith API URL to use when pulling the prompt
* @param options.includeModel Whether to also instantiate and attach a model instance to the prompt,
*   if the prompt has associated model metadata. If set to true, invoking the resulting pulled prompt will
*   also invoke the instantiated model. You must have the appropriate LangChain integration package installed.
* @returns
*/
async function pull(ownerRepoCommit, options) {
	const promptObject = await require_base.basePull(ownerRepoCommit, options);
	let modelClass;
	if (options?.includeModel) {
		if (Array.isArray(promptObject.manifest.kwargs?.last?.kwargs?.bound?.id)) {
			const modelName = promptObject.manifest.kwargs?.last?.kwargs?.bound?.id.at(-1);
			if (modelName) {
				modelClass = await require_chat_models_universal.getChatModelByClassName(modelName);
				if (!modelClass) console.warn(`Received unknown model name from prompt hub: "${modelName}"`);
			}
		}
	}
	const loadedPrompt = await require_load_index.load(JSON.stringify(promptObject.manifest), void 0, require_base.generateOptionalImportMap(modelClass), require_base.generateModelImportMap(modelClass));
	return require_base.bindOutputSchema(loadedPrompt);
}

//#endregion
exports.pull = pull;
exports.push = require_base.basePush;
//# sourceMappingURL=node.cjs.map