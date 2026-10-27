import { declareCapability } from '../declareCapability';
import type { SelfHealingChatHandoff } from '../types/capability';

/** Call during component setup so the shell can capture its router and toast context. */
export const createSelfHealingChatHandoff = declareCapability<() => SelfHealingChatHandoff>(
	'create-self-healing-chat-handoff',
);
