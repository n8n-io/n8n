import type { AgentDbMessage } from '../sdk/message';

export interface SerializedMessageList {
	messages: AgentDbMessage[];
	historyIds: string[];
	inputIds: string[];
	responseIds: string[];
	/** IDs only. Resumed runs load their content from the current skill catalog. */
	activeSkillIds?: string[];
	/** Messages that stay visible after a tool-mode switch compacts the window. */
	modeSwitchPin?: ModeSwitchPin;
}

export interface ModeSwitchPin {
	/** The input messages of the turn. */
	inputIds: string[];
	/** The assistant message that holds the `switch_mode` call and its result. */
	switchMessageId: string;
}
