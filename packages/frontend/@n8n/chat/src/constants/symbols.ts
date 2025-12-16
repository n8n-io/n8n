import type { InjectionKey } from 'vue';

import type { Chat, ChatOptions } from '@n8n/chat/types';

export const ChatSymbol = 'Chat' as unknown as InjectionKey<Chat>;

export const ChatOptionsSymbol = 'ChatOptions' as unknown as InjectionKey<ChatOptions>;
