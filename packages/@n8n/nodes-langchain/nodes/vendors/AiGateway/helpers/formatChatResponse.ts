import type { IDataObject } from 'n8n-workflow';

type ChatCompletionResponse = {
	choices?: Array<{ message?: { content?: string | null } }>;
	usage?: IDataObject;
	id?: string;
	model?: string;
};

export function getMessageContent(response: unknown): string {
	const r = response as ChatCompletionResponse;
	const content = r.choices?.[0]?.message?.content;
	if (typeof content === 'string') return content;
	if (content === null || content === undefined) return '';
	return String(content);
}

export function toSimplifiedOutput(response: unknown): IDataObject {
	const r = response as ChatCompletionResponse;
	return {
		output: getMessageContent(response),
		usage: r.usage,
		id: r.id,
		model: r.model,
	};
}

export function toFullOutput(response: unknown): IDataObject {
	return { response: response as IDataObject };
}
