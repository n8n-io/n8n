import { Service } from '@n8n/di';
import { type IUser } from 'n8n-workflow';

import { type ChatPayload } from './chat.types';

@Service()
export class ChatService {
	constructor() {}

	async getModels() {
		return await Promise.resolve(['gpt-3.5-turbo', 'gpt-4']);
	}

	async *ask(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		yield* [
			{
				role: 'assistant',
				type: 'message',
				message: 'hello world',
			},
		];
	}
}
