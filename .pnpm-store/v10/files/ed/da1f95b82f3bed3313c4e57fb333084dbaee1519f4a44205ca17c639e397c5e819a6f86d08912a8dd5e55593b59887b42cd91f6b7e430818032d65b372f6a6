import { AIMessage, BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { LanguageModelLike } from "@langchain/core/language_models/base";

//#region src/prebuilt/agentName.d.ts
type AgentNameMode = "inline";
/**
 * Attach formatted agent names to the messages passed to and from a language model.
 *
 * This is useful for making a message history with multiple agents more coherent.
 *
 * NOTE: agent name is consumed from the message.name field.
 * If you're using an agent built with createReactAgent, name is automatically set.
 * If you're building a custom agent, make sure to set the name on the AI message returned by the LLM.
 *
 * @deprecated migrated to `langchain` package.
 *
 * @param message - Message to add agent name formatting to
 * @returns Message with agent name formatting
 *
 * @internal
 */

/**
 * Attach formatted agent names to the messages passed to and from a language model.
 *
 * This is useful for making a message history with multiple agents more coherent.
 *
 * * @deprecated migrated to `langchain` package.
 *
 * NOTE: agent name is consumed from the message.name field.
 * If you're using an agent built with createReactAgent, name is automatically set.
 * If you're building a custom agent, make sure to set the name on the AI message returned by the LLM.
 *
 * @param model - Language model to add agent name formatting to
 * @param agentNameMode - How to expose the agent name to the LLM
 *   - "inline": Add the agent name directly into the content field of the AI message using XML-style tags.
 *     Example: "How can I help you" -> "<name>agent_name</name><content>How can I help you?</content>".
 */
declare function withAgentName(model: LanguageModelLike, agentNameMode: AgentNameMode): LanguageModelLike;
//#endregion
export { AgentNameMode, withAgentName };
//# sourceMappingURL=agentName.d.ts.map