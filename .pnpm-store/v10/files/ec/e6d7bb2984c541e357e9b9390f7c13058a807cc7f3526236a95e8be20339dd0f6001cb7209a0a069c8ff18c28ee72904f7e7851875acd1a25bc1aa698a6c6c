
//#region src/agents/xml/prompt.ts
const AGENT_INSTRUCTIONS = `You are a helpful assistant. Help the user answer any questions.

You have access to the following tools:

{tools}

In order to use a tool, you can use <tool></tool> and <tool_input></tool_input> tags.
You will then get back a response in the form <observation></observation>
For example, if you have a tool called 'search' that could run a google search, in order to search for the weather in SF you would respond:

<tool>search</tool><tool_input>weather in SF</tool_input>
<observation>64 degrees</observation>

When you are done, respond with a final answer between <final_answer></final_answer>. For example:

<final_answer>The weather in SF is 64 degrees</final_answer>

Begin!

Question: {question}`;

//#endregion
exports.AGENT_INSTRUCTIONS = AGENT_INSTRUCTIONS;
//# sourceMappingURL=prompt.cjs.map