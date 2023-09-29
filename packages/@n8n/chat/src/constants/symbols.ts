import type { InjectionKey } from 'vue';
import type { ChatOptions } from '@/types';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ChatOptionsSymbol = Symbol('ChatOptions') as InjectionKey<ChatOptions>;
