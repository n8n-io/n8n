/**
 * How a chat runs. It is chosen when the chat starts and fixed after the first message.
 * - `test`: reads use the real apps. Anything the agent would send or change stays in the chat.
 * - `live`: the published agent runs, and anything it sends is real.
 */
export type AgentChatMode = 'test' | 'live';

/**
 * Whether Live can use the current draft.
 * - `unpublished`: the agent has no published version, so Live needs a publish.
 * - `changed`: the draft differs from the published version, so Live needs a republish
 *   to use the changes.
 * - `published`: the published version matches the draft.
 */
export type AgentLiveAvailability = 'unpublished' | 'changed' | 'published';

/** How the user goes live: run the first message of this chat again, or start an empty chat. */
export type AgentGoLiveAction = 'run-this-chat' | 'new-chat';

/** Something the agent might really send when it runs live, such as a message or an email. */
export interface AgentLiveSendTarget {
	id: string;
	/** What might be sent, for example `Slack message in #support`. */
	label: string;
	/** Optional detail, for example the recipient or a short preview. */
	detail?: string;
}
