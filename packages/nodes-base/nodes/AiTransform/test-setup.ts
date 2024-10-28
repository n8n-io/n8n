import axios from 'axios';
import { type IDataObject, type ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

interface ChatResponse {
	choices: Array<{ message: Message }>;
}

export interface RequestPayload {
	question: string;
	context: {
		schema: NodeExecutionSchema[];
		inputSchema: NodeExecutionSchema;
		pushRef: string;
		ndvPushRef: string;
	};
	forNode: 'code' | 'transform';
}

export interface NodeExecutionSchema {
	nodeName: string;
	schema: IDataObject;
}

export async function generateMessage(
	this: ILoadOptionsFunctions,
	messages: Message[],
	API_KEY: string,
): Promise<string | null> {
	try {
		const response = await axios.post<ChatResponse>(
			'https://api.openai.com/v1/chat/completions',
			{
				model: 'gpt-4o',
				messages,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${API_KEY}`,
				},
			},
		);

		const message = response.data.choices[0]?.message.content;
		return message || null;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
