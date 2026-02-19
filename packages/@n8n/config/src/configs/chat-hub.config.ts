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

	/** Maximum allowed size (in bytes) for chat memory storage. Default: 100 MB */
	@Env('N8N_CHAT_MEMORY_MAX_SIZE_BYTES')
	chatMemoryMaxSize: number = 100 * 1024 * 1024;

	/** Warning threshold in bytes. Defaults to 80% of maxSize if not set. */
	@Env('N8N_CHAT_MEMORY_WARNING_THRESHOLD_BYTES')
	chatMemoryWarningThreshold?: number;

	/** Cache duration in ms for chat memory size checks. Default: 5s */
	@Env('N8N_CHAT_MEMORY_SIZE_CHECK_CACHE_DURATION_MS')
	chatMemorySizeCheckCacheDuration: number = 5 * 1000;

	/** Interval in ms for chat memory cleanup (expired entries + orphaned sessions). Default: 15 min */
	@Env('N8N_CHAT_MEMORY_CLEANUP_INTERVAL_MS')
	chatMemoryCleanupIntervalMs: number = 15 * 60 * 1000;
}
