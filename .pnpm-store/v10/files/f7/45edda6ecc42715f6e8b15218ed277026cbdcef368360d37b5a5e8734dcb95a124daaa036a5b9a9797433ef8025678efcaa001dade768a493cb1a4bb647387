import { LLMChain } from "./llm_chain.js";
import { BufferMemory } from "../memory/buffer_memory.js";
import { PromptTemplate } from "@langchain/core/prompts";

//#region src/chains/conversation.ts
const DEFAULT_TEMPLATE = `The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.

Current conversation:
{history}
Human: {input}
AI:`;
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
var ConversationChain = class extends LLMChain {
	static lc_name() {
		return "ConversationChain";
	}
	constructor({ prompt, outputKey, memory,...rest }) {
		super({
			prompt: prompt ?? new PromptTemplate({
				template: DEFAULT_TEMPLATE,
				inputVariables: ["history", "input"]
			}),
			outputKey: outputKey ?? "response",
			memory: memory ?? new BufferMemory(),
			...rest
		});
	}
};

//#endregion
export { ConversationChain, DEFAULT_TEMPLATE };
//# sourceMappingURL=conversation.js.map