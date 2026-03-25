//#region src/agents/chat/prompt.ts
const PREFIX = `Answer the following questions as best you can. You have access to the following tools:`;
const FORMAT_INSTRUCTIONS = `The way you use the tools is by specifying a json blob, denoted below by $JSON_BLOB
Specifically, this $JSON_BLOB should have a "action" key (with the name of the tool to use) and a "action_input" key (with the input to the tool going here). 
The $JSON_BLOB should only contain a SINGLE action, do NOT return a list of multiple actions. Here is an example of a valid $JSON_BLOB:

\`\`\`
{{
  "action": "calculator",
  "action_input": "1 + 2"
}}
\`\`\`

ALWAYS use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: 
\`\`\`
$JSON_BLOB
\`\`\`
Observation: the result of the action
... (this Thought/Action/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question`;
const SUFFIX = `Begin! Reminder to always use the exact characters \`Final Answer\` when responding.`;

//#endregion
export { FORMAT_INSTRUCTIONS, PREFIX, SUFFIX };
//# sourceMappingURL=prompt.js.map