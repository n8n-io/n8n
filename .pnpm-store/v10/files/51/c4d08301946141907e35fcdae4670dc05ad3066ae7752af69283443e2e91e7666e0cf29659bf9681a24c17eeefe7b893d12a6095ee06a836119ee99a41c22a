
//#region src/chains/router/multi_retrieval_prompt.ts
const STRUCTURED_MULTI_RETRIEVAL_ROUTER_TEMPLATE = (formatting) => `Given a query to a question answering system, select the system best suited for the input. You will be given the names of the available systems and a description of what questions the system is best suited for. You may also revise the original input if you think that revising it will ultimately lead to a better response.

<< FORMATTING >>
${formatting}

REMEMBER: "destination" MUST be one of the candidate prompt names specified below OR it can be "DEFAULT" if the input is not well suited for any of the candidate prompts.
REMEMBER: "next_inputs.query" can just be the original input if you don't think any modifications are needed.

<< CANDIDATE PROMPTS >>
{destinations}

<< INPUT >>
{{input}}

<< OUTPUT >>
`;

//#endregion
exports.STRUCTURED_MULTI_RETRIEVAL_ROUTER_TEMPLATE = STRUCTURED_MULTI_RETRIEVAL_ROUTER_TEMPLATE;
//# sourceMappingURL=multi_retrieval_prompt.cjs.map