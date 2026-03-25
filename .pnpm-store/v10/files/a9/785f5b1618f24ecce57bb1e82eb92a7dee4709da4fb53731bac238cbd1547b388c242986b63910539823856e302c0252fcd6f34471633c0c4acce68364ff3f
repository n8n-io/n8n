const require_runtime = require('../_virtual/_rolldown/runtime.cjs');
const require_utils = require('./utils.cjs');
let _langchain_core_runnables = require("@langchain/core/runnables");

//#region src/agents/withAgentName.ts
/**
* Attach formatted agent names to the messages passed to and from a language model.
*
* This is useful for making a message history with multiple agents more coherent.
*
* NOTE: agent name is consumed from the message.name field.
* If you're using an agent built with createAgent, name is automatically set.
* If you're building a custom agent, make sure to set the name on the AI message returned by the LLM.
*
* @param model - Language model to add agent name formatting to
* @param agentNameMode - How to expose the agent name to the LLM
*   - "inline": Add the agent name directly into the content field of the AI message using XML-style tags.
*     Example: "How can I help you" -> "<name>agent_name</name><content>How can I help you?</content>".
*/
function withAgentName(model, agentNameMode) {
	let processInputMessage;
	let processOutputMessage;
	if (agentNameMode === "inline") {
		processInputMessage = require_utils._addInlineAgentName;
		processOutputMessage = require_utils._removeInlineAgentName;
	} else throw new Error(`Invalid agent name mode: ${agentNameMode}. Needs to be one of: "inline"`);
	function processInputMessages(messages) {
		return messages.map(processInputMessage);
	}
	return _langchain_core_runnables.RunnableSequence.from([
		_langchain_core_runnables.RunnableLambda.from(processInputMessages),
		model,
		_langchain_core_runnables.RunnableLambda.from(processOutputMessage)
	]);
}

//#endregion
exports.withAgentName = withAgentName;
//# sourceMappingURL=withAgentName.cjs.map