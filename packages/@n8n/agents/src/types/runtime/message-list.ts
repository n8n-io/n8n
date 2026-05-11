import type { AgentDbMessage } from '../sdk/message';

export interface SerializedMessageList {
	messages: AgentDbMessage[];
	historyIds: string[];
	inputIds: string[];
	responseIds: string[];
	memoryProfile?: {
		agentProfile?: string | null;
		userProfile?: string | null;
	};
}
