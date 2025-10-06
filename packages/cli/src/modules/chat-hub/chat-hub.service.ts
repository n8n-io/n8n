import { Service } from '@n8n/di';
import { type IUser } from 'n8n-workflow';

import { type ChatPayload } from './chat-hub.types';

@Service()
export class ChatHubService {
	constructor() {}

	async getModels() {
		return await Promise.resolve(['gpt-3.5-turbo', 'gpt-4']);
	}

	async *ask(_payload: ChatPayload, _user: IUser, _abortSignal?: AbortSignal) {
		yield* [
			{
				role: 'assistant',
				type: 'message',
				message: 'hello world',
			},
		];
	}
}
