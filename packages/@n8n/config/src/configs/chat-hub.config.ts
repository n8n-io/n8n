import { Time } from '@n8n/constants';
import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

@Config
export class ChatHubResultCardsConfig {
	/** Render result cards (email / rows / message / metric…) in workflow-agent replies. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_ENABLED')
	enabled: boolean = true;

	/** API key for Jev (TypeSafe AI). Empty = deterministic cards only, no network calls. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_JEV_API_KEY')
	jevApiKey: string = '';

	/** Where to reach Jev: `typesafe` (direct), `vercel` (AI Gateway) or `openrouter`. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_JEV_PROVIDER', z.enum(['typesafe', 'vercel', 'openrouter']))
	jevProvider: 'typesafe' | 'vercel' | 'openrouter' = 'typesafe';

	/** Override the provider's endpoint URL. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_JEV_BASE_URL')
	jevBaseUrl: string = '';

	/** Override the provider's pinned model id. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_JEV_MODEL')
	jevModel: string = '';

	/** Send 40-char sample values with field names. `false` sends paths and types only. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_JEV_SEND_SAMPLES')
	jevSendSamples: boolean = true;

	/** Directory of recorded Jev answers keyed by schema hash; read before calling Jev, written after. */
	@Env('N8N_CHAT_HUB_RESULT_CARDS_JEV_FIXTURES')
	jevFixtures: string = '';
}

@Config
export class ChatHubConfig {
	/**
	 * Time to live in seconds for execution context in Chat Hub.
	 * Maximum duration for a single non-streaming Workflow Agent execution, including wait time.
	 * After this TTL, responses from those executions are no longer captured or sent to the client.
	 */
	@Env('N8N_CHAT_HUB_EXECUTION_CONTEXT_TTL')
	executionContextTtl: number = 1 * Time.hours.toSeconds;

	/**
	 * Time to live in seconds for stream state in Chat Hub.
	 * Inactive streams are cleaned up after this duration.
	 */
	@Env('N8N_CHAT_HUB_STREAM_STATE_TTL')
	streamStateTtl: number = 5 * Time.minutes.toSeconds;

	/** Maximum number of response chunks to buffer per stream for reconnection in Chat Hub. */
	@Env('N8N_CHAT_HUB_MAX_BUFFERED_CHUNKS')
	maxBufferedChunks: number = 1000;

	@Nested
	resultCards: ChatHubResultCardsConfig;
}
