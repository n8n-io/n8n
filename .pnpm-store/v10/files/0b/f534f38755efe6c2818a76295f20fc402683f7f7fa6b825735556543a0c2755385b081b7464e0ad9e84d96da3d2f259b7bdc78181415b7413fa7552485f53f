import { PromptTemplate } from "@langchain/core/prompts";

//#region src/chains/api/prompts.ts
const API_URL_RAW_PROMPT_TEMPLATE = `You are given the below API Documentation:
{api_docs}
Using this documentation, generate the full API url to call for answering the user question.
You should build the API url in order to get a response that is as short as possible, while still getting the necessary information to answer the question. Pay attention to deliberately exclude any unnecessary pieces of data in the API call.

Question:{question}
API url:`;
const API_URL_PROMPT_TEMPLATE = /* @__PURE__ */ new PromptTemplate({
	inputVariables: ["api_docs", "question"],
	template: API_URL_RAW_PROMPT_TEMPLATE
});
const API_RESPONSE_RAW_PROMPT_TEMPLATE = `${API_URL_RAW_PROMPT_TEMPLATE} {api_url}

Here is the response from the API:

{api_response}

Summarize this response to answer the original question.

Summary:`;
const API_RESPONSE_PROMPT_TEMPLATE = /* @__PURE__ */ new PromptTemplate({
	inputVariables: [
		"api_docs",
		"question",
		"api_url",
		"api_response"
	],
	template: API_RESPONSE_RAW_PROMPT_TEMPLATE
});

//#endregion
export { API_RESPONSE_PROMPT_TEMPLATE, API_URL_PROMPT_TEMPLATE };
//# sourceMappingURL=prompts.js.map