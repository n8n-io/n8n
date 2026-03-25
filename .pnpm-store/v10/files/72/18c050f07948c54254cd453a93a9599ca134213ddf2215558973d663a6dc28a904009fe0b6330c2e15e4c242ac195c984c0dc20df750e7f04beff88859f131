const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/experimental/chains/violation_of_expectations/violation_of_expectations_prompt.ts
const PREDICT_NEXT_USER_MESSAGE_PROMPT = /* @__PURE__ */ __langchain_core_prompts.PromptTemplate.fromTemplate(`
You have been tasked with coming up with insights and data-points based on a chat history between a human and an AI.
Given the user's chat history provide the following:
- Concise reasoning about the users internal mental state.
- Your prediction on how they will respond to the AI's most recent message.
- A concise list of any additional insights that would be useful to improve prediction.
--------
Chat History: {chat_history}`);
const PREDICTION_VIOLATIONS_PROMPT = /* @__PURE__ */ __langchain_core_prompts.PromptTemplate.fromTemplate(`You have been given a prediction and an actual message from a human and AI conversation.
Using the prediction, actual message, and additional user insights, generate the following:
- How exactly was the original prediction violated? Which parts were wrong? State the exact differences.
- If there were errors with the prediction, what were they and why?
--------
Predicted Output: {predicted_output}
--------
Actual Output: {actual_output}
--------
User Insights: {user_insights}
--------
`);
const GENERATE_REVISED_PREDICTION_PROMPT = /* @__PURE__ */ __langchain_core_prompts.PromptTemplate.fromTemplate(`
You have been tasked with revising a prediction on what a user might say in a chat conversation.
--------
Your previous prediction: {prediction}
--------
Ways in which your prediction was off: {explained_prediction_errors}
--------
Key insights to the user: {user_insights}
--------
Given the above, revise your prediction to be more accurate.
Revised Prediction:`);
const GENERATE_FACTS_PROMPT = /* @__PURE__ */ __langchain_core_prompts.PromptTemplate.fromTemplate(`
Given a user message, an LLM generated prediction of what that message might be, and a list of violations which the prediction made compared to the actual message, generate a fact about the user, relevant to the users message.
--------
Prediction violations: {prediction_violations}
--------
Revised prediction: {prediction}
--------
Actual user message: {user_message}
--------
Relevant fact:`);

//#endregion
exports.GENERATE_FACTS_PROMPT = GENERATE_FACTS_PROMPT;
exports.GENERATE_REVISED_PREDICTION_PROMPT = GENERATE_REVISED_PREDICTION_PROMPT;
exports.PREDICTION_VIOLATIONS_PROMPT = PREDICTION_VIOLATIONS_PROMPT;
exports.PREDICT_NEXT_USER_MESSAGE_PROMPT = PREDICT_NEXT_USER_MESSAGE_PROMPT;
//# sourceMappingURL=violation_of_expectations_prompt.cjs.map