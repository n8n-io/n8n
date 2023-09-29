import type { InjectionKey } from 'vue';
import type { ChatOptions } from '@/types';

export const ChatOptionsSymbol = Symbol('ChatOptions') as InjectionKey<ChatOptions>;
