import { Config, Env } from '../decorators';

@Config
export class ChatHubConfig {
	/**
	 * Time to live in seconds for execution context in Chat Hub.
	 * Maximum duration for a single non-streaming Workflow Agent execution, including wait time.
	 * After this TTL, responses from those executions are no longer captured or sent to the client.
	 */
	@Env('N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL')
	executionContextTtl: number = 3600;

	/**
	 * Time to live in seconds for stream state in Chat Hub.
	 * Inactive streams are cleaned up after this duration.
	 */
	@Env('N8N_CHAT_HUB_STREAM_STATE_TTL')
	streamStateTtl: number = 300;

	/** Maximum number of response chunks to buffer per stream for reconnection in Chat Hub. */
	@Env('N8N_CHAT_HUB_MAX_BUFFERED_CHUNKS')
	maxBufferedChunks: number = 1000;

	/**
	 * Maximum size in MB for a single personal agent file upload request.
	 * If any individual file exceeds this limit, the upload is rejected.
	 * Multiple files are automatically chunked into separate requests to stay within this limit.
	 */
	@Env('N8N_CHAT_HUB_AGENT_UPLOAD_MAX_SIZE_MB')
	agentUploadMaxSizeMb: number = 20;
}
