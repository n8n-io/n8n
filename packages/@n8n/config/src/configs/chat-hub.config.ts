import { Config, Env } from '../decorators';

@Config
export class ChatHubConfig {
	/**
	 * TTL in seconds for storing execution context in Chat Hub.
	 * This is the max duration for a single non-streaming Workflow Agent execution on Chat hub,
	 * including any waiting time. Once this TTL expires, the responses produced by these
	 * executions won't be captured or sent to the user on frontend.
	 * */
	@Env('N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL')
	executionContextTtl: number = 3600;

	/**
	 * TTL in seconds for stream state in Chat Hub.
	 * Streams that are inactive for longer than this duration will be cleaned up.
	 * */
	@Env('N8N_CHAT_HUB_STREAM_STATE_TTL')
	streamStateTtl: number = 300;

	/** Maximum number of chunks to buffer for reconnection in Chat Hub. */
	@Env('N8N_CHAT_HUB_MAX_BUFFERED_CHUNKS')
	maxBufferedChunks: number = 1000;
}
