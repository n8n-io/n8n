import type { AgentDbMessage } from '../sdk/message';

export interface SerializedMessageList {
	messages: AgentDbMessage[];
	historyIds: string[];
	inputIds: string[];
	responseIds: string[];
	/** Skills loaded in thread messages that the list does not hold. */
	earlierLoadedSkillIds?: string[];
}
