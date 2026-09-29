import type { AgentDbMessage } from '../sdk/message';

export interface SerializedMessageList {
	messages: AgentDbMessage[];
	historyIds: string[];
	inputIds: string[];
	responseIds: string[];
	/** IDs only. Resumed runs load their content from the current skill catalog. */
	activeSkillIds?: string[];
}
