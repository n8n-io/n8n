
//#region src/agents/model.ts
function isBaseChatModel(model) {
	return "invoke" in model && typeof model.invoke === "function" && "_streamResponseChunks" in model;
}
function isConfigurableModel(model) {
	return typeof model === "object" && model != null && "_queuedMethodOperations" in model && "_getModelInstance" in model && typeof model._getModelInstance === "function";
}

//#endregion
exports.isBaseChatModel = isBaseChatModel;
exports.isConfigurableModel = isConfigurableModel;
//# sourceMappingURL=model.cjs.map