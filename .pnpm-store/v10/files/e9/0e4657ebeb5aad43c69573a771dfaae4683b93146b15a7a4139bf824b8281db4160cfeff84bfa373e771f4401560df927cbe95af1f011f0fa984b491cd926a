
//#region src/hub/base.ts
/**
* Push a prompt to the hub.
* If the specified repo doesn't already exist, it will be created.
* @param repoFullName The full name of the repo.
* @param runnable The prompt to push.
* @param options
* @returns The URL of the newly pushed prompt in the hub.
*/
async function basePush(repoFullName, runnable, options) {
	const Client = await loadLangSmith();
	const client = new Client(options);
	const payloadOptions = {
		object: runnable,
		parentCommitHash: options?.parentCommitHash,
		isPublic: options?.isPublic ?? options?.newRepoIsPublic,
		description: options?.description ?? options?.newRepoDescription,
		readme: options?.readme,
		tags: options?.tags
	};
	return client.pushPrompt(repoFullName, payloadOptions);
}
async function basePull(ownerRepoCommit, options) {
	const Client = await loadLangSmith();
	const client = new Client(options);
	const promptObject = await client.pullPromptCommit(ownerRepoCommit, { includeModel: options?.includeModel });
	if (promptObject.manifest.kwargs?.metadata === void 0) promptObject.manifest.kwargs = {
		...promptObject.manifest.kwargs,
		metadata: {}
	};
	promptObject.manifest.kwargs.metadata = {
		...promptObject.manifest.kwargs.metadata,
		lc_hub_owner: promptObject.owner,
		lc_hub_repo: promptObject.repo,
		lc_hub_commit_hash: promptObject.commit_hash
	};
	if (promptObject.manifest.kwargs.template_format === "mustache") {
		const stripDotNotation = (varName) => varName.split(".")[0];
		const { input_variables } = promptObject.manifest.kwargs;
		if (Array.isArray(input_variables)) promptObject.manifest.kwargs.input_variables = input_variables.map(stripDotNotation);
		const { messages } = promptObject.manifest.kwargs;
		if (Array.isArray(messages)) promptObject.manifest.kwargs.messages = messages.map((message) => {
			const nestedVars = message?.kwargs?.prompt?.kwargs?.input_variables;
			if (Array.isArray(nestedVars)) message.kwargs.prompt.kwargs.input_variables = nestedVars.map(stripDotNotation);
			return message;
		});
	}
	return promptObject;
}
function generateModelImportMap(modelClass) {
	const modelImportMap = {};
	if (modelClass !== void 0) {
		const modelLcName = modelClass?.lc_name();
		let importMapKey;
		if (modelLcName === "ChatOpenAI") importMapKey = "chat_models__openai";
		else if (modelLcName === "ChatAnthropic") importMapKey = "chat_models__anthropic";
		else if (modelLcName === "ChatAzureOpenAI") importMapKey = "chat_models__openai";
		else if (modelLcName === "ChatVertexAI") importMapKey = "chat_models__vertexai";
		else if (modelLcName === "ChatGoogleGenerativeAI") importMapKey = "chat_models__google_genai";
		else if (modelLcName === "ChatBedrockConverse") importMapKey = "chat_models__chat_bedrock_converse";
		else if (modelLcName === "ChatMistral") importMapKey = "chat_models__mistralai";
		else if (modelLcName === "ChatFireworks") importMapKey = "chat_models__fireworks";
		else if (modelLcName === "ChatGroq") importMapKey = "chat_models__groq";
		else throw new Error("Received unsupported model class when pulling prompt.");
		modelImportMap[importMapKey] = {
			...modelImportMap[importMapKey],
			[modelLcName]: modelClass
		};
	}
	return modelImportMap;
}
function generateOptionalImportMap(modelClass) {
	const optionalImportMap = {};
	if (modelClass !== void 0) {
		const modelLcName = modelClass?.lc_name();
		let optionalImportMapKey;
		if (modelLcName === "ChatGoogleGenerativeAI") optionalImportMapKey = "langchain_google_genai/chat_models";
		else if (modelLcName === "ChatBedrockConverse") optionalImportMapKey = "langchain_aws/chat_models";
		else if (modelLcName === "ChatGroq") optionalImportMapKey = "langchain_groq/chat_models";
		if (optionalImportMapKey !== void 0) optionalImportMap[optionalImportMapKey] = { [modelLcName]: modelClass };
	}
	return optionalImportMap;
}
function bindOutputSchema(loadedSequence) {
	if ("first" in loadedSequence && loadedSequence.first !== null && typeof loadedSequence.first === "object" && "schema" in loadedSequence.first && "last" in loadedSequence && loadedSequence.last !== null && typeof loadedSequence.last === "object") {
		if ("bound" in loadedSequence.last && loadedSequence.last.bound !== null && typeof loadedSequence.last.bound === "object" && "withStructuredOutput" in loadedSequence.last.bound && typeof loadedSequence.last.bound.withStructuredOutput === "function") loadedSequence.last.bound = loadedSequence.last.bound.withStructuredOutput(loadedSequence.first.schema);
		else if ("withStructuredOutput" in loadedSequence.last && typeof loadedSequence.last.withStructuredOutput === "function") loadedSequence.last = loadedSequence.last.withStructuredOutput(loadedSequence.first.schema);
	}
	return loadedSequence;
}
/**
* Dynamically load the LangSmith client.
* @returns The LangSmith client.
*/
async function loadLangSmith() {
	try {
		const { Client } = await import("langsmith");
		return Client;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new Error(`Error loading "langsmith" package, install it via \`npm install langsmith\` before you use this function.\nError: ${errorMessage}`);
	}
}

//#endregion
exports.basePull = basePull;
exports.basePush = basePush;
exports.bindOutputSchema = bindOutputSchema;
exports.generateModelImportMap = generateModelImportMap;
exports.generateOptionalImportMap = generateOptionalImportMap;
//# sourceMappingURL=base.cjs.map