import { PromptTemplate } from "@langchain/core/prompts";

//#region src/memory/prompt.ts
const _DEFAULT_SUMMARIZER_TEMPLATE = `Progressively summarize the lines of conversation provided, adding onto the previous summary returning a new summary.

EXAMPLE
Current summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good.

New lines of conversation:
Human: Why do you think artificial intelligence is a force for good?
AI: Because artificial intelligence will help humans reach their full potential.

New summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;
const SUMMARY_PROMPT = /* @__PURE__ */ new PromptTemplate({
	inputVariables: ["summary", "new_lines"],
	template: _DEFAULT_SUMMARIZER_TEMPLATE
});
const _DEFAULT_ENTITY_MEMORY_CONVERSATION_TEMPLATE = `You are an assistant to a human, powered by a large language model trained by OpenAI.

You are designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, you are able to generate human-like text based on the input you receive, allowing you to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.

You are constantly learning and improving, and your capabilities are constantly evolving. You are able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. You have access to some personalized information provided by the human in the Context section below. Additionally, you are able to generate your own text based on the input you receive, allowing you to engage in discussions and provide explanations and descriptions on a wide range of topics.

Overall, you are a powerful tool that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether the human needs help with a specific question or just wants to have a conversation about a particular topic, you are here to assist.

Context:
{entities}

Current conversation:
{history}
Last line:
Human: {input}
You:`;
const ENTITY_MEMORY_CONVERSATION_TEMPLATE = /* @__PURE__ */ new PromptTemplate({
	inputVariables: [
		"entities",
		"history",
		"input"
	],
	template: _DEFAULT_ENTITY_MEMORY_CONVERSATION_TEMPLATE
});
const _DEFAULT_ENTITY_EXTRACTION_TEMPLATE = `You are an AI assistant reading the transcript of a conversation between an AI and a human. Extract all of the proper nouns from the last line of conversation. As a guideline, a proper noun is generally capitalized. You should definitely extract all names and places.

The conversation history is provided just in case of a coreference (e.g. "What do you know about him" where "him" is defined in a previous line) -- ignore items mentioned there that are not in the last line.

Return the output as a single comma-separated list, or NONE if there is nothing of note to return (e.g. the user is just issuing a greeting or having a simple conversation).

EXAMPLE
Conversation history:
Person #1: my name is Jacob. how's it going today?
AI: "It's going great! How about you?"
Person #1: good! busy working on Langchain. lots to do.
AI: "That sounds like a lot of work! What kind of things are you doing to make Langchain better?"
Last line:
Person #1: i'm trying to improve Langchain's interfaces, the UX, its integrations with various products the user might want ... a lot of stuff.
Output: Jacob,Langchain
END OF EXAMPLE

EXAMPLE
Conversation history:
Person #1: how's it going today?
AI: "It's going great! How about you?"
Person #1: good! busy working on Langchain. lots to do.
AI: "That sounds like a lot of work! What kind of things are you doing to make Langchain better?"
Last line:
Person #1: i'm trying to improve Langchain's interfaces, the UX, its integrations with various products the user might want ... a lot of stuff. I'm working with Person #2.
Output: Langchain, Person #2
END OF EXAMPLE

Conversation history (for reference only):
{history}
Last line of conversation (for extraction):
Human: {input}

Output:`;
const ENTITY_EXTRACTION_PROMPT = /* @__PURE__ */ new PromptTemplate({
	inputVariables: ["history", "input"],
	template: _DEFAULT_ENTITY_EXTRACTION_TEMPLATE
});
const _DEFAULT_ENTITY_SUMMARIZATION_TEMPLATE = `You are an AI assistant helping a human keep track of facts about relevant people, places, and concepts in their life. Update and add to the summary of the provided entity in the "Entity" section based on the last line of your conversation with the human. If you are writing the summary for the first time, return a single sentence.
The update should only include facts that are relayed in the last line of conversation about the provided entity, and should only contain facts about the provided entity.

If there is no new information about the provided entity or the information is not worth noting (not an important or relevant fact to remember long-term), output the exact string "UNCHANGED" below.

Full conversation history (for context):
{history}

Entity to summarize:
{entity}

Existing summary of {entity}:
{summary}

Last line of conversation:
Human: {input}
Updated summary (or the exact string "UNCHANGED" if there is no new information about {entity} above):`;
const ENTITY_SUMMARIZATION_PROMPT = /* @__PURE__ */ new PromptTemplate({
	inputVariables: [
		"entity",
		"summary",
		"history",
		"input"
	],
	template: _DEFAULT_ENTITY_SUMMARIZATION_TEMPLATE
});

//#endregion
export { ENTITY_EXTRACTION_PROMPT, ENTITY_MEMORY_CONVERSATION_TEMPLATE, ENTITY_SUMMARIZATION_PROMPT, SUMMARY_PROMPT };
//# sourceMappingURL=prompt.js.map