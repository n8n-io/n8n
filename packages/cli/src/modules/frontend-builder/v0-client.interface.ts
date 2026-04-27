import type { FrontendBuilderMessage } from '@n8n/api-types';

export type V0ChatResult = {
	chatId: string;
	demoUrl: string | null;
	messages: FrontendBuilderMessage[];
};

export interface IV0Client {
	create(input: { message: string }): Promise<V0ChatResult>;
	sendMessage(input: { chatId: string; message: string }): Promise<V0ChatResult>;
	getChat(chatId: string): Promise<V0ChatResult>;
}
