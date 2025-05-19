import type { INodeProperties } from 'n8n-workflow';

export const SYSTEM_PROMPT_TEMPLATE = `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
Context: {context}`;

// Due to the refactoring in version 1.5, the variable name {question} needed to be changed to {input} in the prompt template.
export const LEGACY_INPUT_TEMPLATE_KEY = 'question';
export const INPUT_TEMPLATE_KEY = 'input';

export const systemPromptOption: INodeProperties = {
	displayName: 'System Prompt Template',
	name: 'systemPromptTemplate',
	type: 'string',
	default: SYSTEM_PROMPT_TEMPLATE,
	typeOptions: {
		rows: 6,
	},
};
