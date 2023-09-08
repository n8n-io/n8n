import type { InjectionKey } from 'vue';
import type { ChatbotOptions } from '@/types';

export const ChatbotOptionsSymbol = Symbol('ChatbotOptions') as InjectionKey<ChatbotOptions>;
