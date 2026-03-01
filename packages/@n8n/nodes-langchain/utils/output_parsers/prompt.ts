import { PromptTemplate } from '@langchain/core/prompts';

export const NAIVE_FIX_TEMPLATE = `Instructions:
--------------
{instructions}
--------------
Completion:
--------------
{completion}
--------------

Above, the Completion did not satisfy the constraints given in the Instructions.
Error:
--------------
{error}
--------------

Please try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:`;

export const NAIVE_FIX_PROMPT = PromptTemplate.fromTemplate(NAIVE_FIX_TEMPLATE);
