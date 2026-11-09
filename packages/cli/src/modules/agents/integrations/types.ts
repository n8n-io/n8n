/** Callback that pushes a text fragment into the streaming iterable. */
export type TextYieldFn = (text: string) => void;
/** Callback that signals the end of the streaming iterable. */
export type TextEndFn = () => void;

/**
 * Width of every column that stores an agent thread id. A chat thread id is
 * `<agentId>:<platform thread id>`, and a Teams DM id alone is about 300 characters.
 */
export const AGENT_THREAD_ID_MAX_LENGTH = 1024;

export const INTERNAL_THREAD_ID_SYMBOL = Symbol('internal-thread-id');

/**
 * The symbol is required to prevent accidental mixing of internal and chat SDK thread IDs as they may be different
 */
export interface InternalThread {
	[INTERNAL_THREAD_ID_SYMBOL]: boolean;
	id: string;
}

export const toInternalThreadId = (id: string): InternalThread => {
	return {
		[INTERNAL_THREAD_ID_SYMBOL]: true,
		id,
	};
};
