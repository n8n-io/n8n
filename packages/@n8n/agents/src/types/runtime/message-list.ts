import type { AgentDbMessage } from '../sdk/message';

export interface SerializedMessageList {
	messages: AgentDbMessage[];
	historyIds: string[];
	inputIds: string[];
	responseIds: string[];
	memoryProfile?: {
		userProfile?: string | null;
	};
	episodicMemory?: {
		section: string;
		entries?: string[];
	};
}
