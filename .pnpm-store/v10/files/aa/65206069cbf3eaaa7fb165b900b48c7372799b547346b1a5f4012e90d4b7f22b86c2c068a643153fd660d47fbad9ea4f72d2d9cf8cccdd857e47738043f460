//#region src/chains/router/multi_prompt_prompt.ts
const STRUCTURED_MULTI_PROMPT_ROUTER_TEMPLATE = (formatting) => `Given a raw text input to a language model, select the model prompt best suited for the input. You will be given the names of the available prompts and a description of what the prompt is best suited for. You may also revise the original input if you think that revising it will ultimately lead to a better response from the language model.

<< FORMATTING >>
${formatting}

REMEMBER: "destination" MUST be one of the candidate prompt names specified below OR it can be "DEFAULT" if the input is not well suited for any of the candidate prompts.
REMEMBER: "next_inputs.input" can just be the original input if you don't think any modifications are needed.

<< CANDIDATE PROMPTS >>
{destinations}

<< INPUT >>
{{input}}

<< OUTPUT >>
`;

//#endregion
export { STRUCTURED_MULTI_PROMPT_ROUTER_TEMPLATE };
//# sourceMappingURL=multi_prompt_prompt.js.map