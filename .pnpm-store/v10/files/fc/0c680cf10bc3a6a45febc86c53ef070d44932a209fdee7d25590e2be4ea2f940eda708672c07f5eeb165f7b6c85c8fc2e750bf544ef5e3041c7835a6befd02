import { LLMChain, LLMChainInput } from "./llm_chain.js";
import { Optional } from "../types/type-utils.js";

//#region src/chains/conversation.d.ts

/**
 * A class for conducting conversations between a human and an AI. It
 * extends the {@link LLMChain} class.
 * @example
 * ```typescript
 * const model = new ChatOpenAI({ model: "gpt-4o-mini" });
 * const chain = new ConversationChain({ llm: model });
 *
 * // Sending a greeting to the conversation chain
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1 });
 *
 * // Following up with a question in the conversation
 * const res2 = await chain.call({ input: "What's my name?" });
 * console.log({ res2 });
 * ```
 */
declare class ConversationChain extends LLMChain {
  static lc_name(): string;
  constructor({
    prompt,
    outputKey,
    memory,
    ...rest
  }: Optional<LLMChainInput, "prompt">);
}
//#endregion
export { ConversationChain };
//# sourceMappingURL=conversation.d.ts.map