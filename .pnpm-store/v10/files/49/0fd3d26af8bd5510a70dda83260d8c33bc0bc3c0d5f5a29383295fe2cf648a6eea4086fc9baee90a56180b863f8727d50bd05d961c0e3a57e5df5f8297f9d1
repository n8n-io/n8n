import { LanguageModelV3, ProviderV3, EmbeddingModelV3, ImageModelV3, Experimental_VideoModelV3, TypeValidationError } from '@ai-sdk/provider';
import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { FetchFunction, InferSchema } from '@ai-sdk/provider-utils';

type GatewayModelId = 'alibaba/qwen-3-14b' | 'alibaba/qwen-3-235b' | 'alibaba/qwen-3-30b' | 'alibaba/qwen-3-32b' | 'alibaba/qwen3-235b-a22b-thinking' | 'alibaba/qwen3-coder' | 'alibaba/qwen3-coder-30b-a3b' | 'alibaba/qwen3-coder-next' | 'alibaba/qwen3-coder-plus' | 'alibaba/qwen3-max' | 'alibaba/qwen3-max-preview' | 'alibaba/qwen3-max-thinking' | 'alibaba/qwen3-next-80b-a3b-instruct' | 'alibaba/qwen3-next-80b-a3b-thinking' | 'alibaba/qwen3-vl-instruct' | 'alibaba/qwen3-vl-thinking' | 'alibaba/qwen3.5-flash' | 'alibaba/qwen3.5-plus' | 'amazon/nova-2-lite' | 'amazon/nova-lite' | 'amazon/nova-micro' | 'amazon/nova-pro' | 'anthropic/claude-3-haiku' | 'anthropic/claude-3-opus' | 'anthropic/claude-3.5-haiku' | 'anthropic/claude-3.5-sonnet' | 'anthropic/claude-3.5-sonnet-20240620' | 'anthropic/claude-3.7-sonnet' | 'anthropic/claude-haiku-4.5' | 'anthropic/claude-opus-4' | 'anthropic/claude-opus-4.1' | 'anthropic/claude-opus-4.5' | 'anthropic/claude-opus-4.6' | 'anthropic/claude-sonnet-4' | 'anthropic/claude-sonnet-4.5' | 'anthropic/claude-sonnet-4.6' | 'arcee-ai/trinity-large-preview' | 'arcee-ai/trinity-mini' | 'bytedance/seed-1.6' | 'bytedance/seed-1.8' | 'cohere/command-a' | 'deepseek/deepseek-r1' | 'deepseek/deepseek-v3' | 'deepseek/deepseek-v3.1' | 'deepseek/deepseek-v3.1-terminus' | 'deepseek/deepseek-v3.2' | 'deepseek/deepseek-v3.2-thinking' | 'google/gemini-2.0-flash' | 'google/gemini-2.0-flash-lite' | 'google/gemini-2.5-flash' | 'google/gemini-2.5-flash-image' | 'google/gemini-2.5-flash-lite' | 'google/gemini-2.5-pro' | 'google/gemini-3-flash' | 'google/gemini-3-pro-image' | 'google/gemini-3-pro-preview' | 'google/gemini-3.1-flash-image-preview' | 'google/gemini-3.1-flash-lite-preview' | 'google/gemini-3.1-pro-preview' | 'inception/mercury-2' | 'inception/mercury-coder-small' | 'kwaipilot/kat-coder-pro-v1' | 'meituan/longcat-flash-chat' | 'meituan/longcat-flash-thinking' | 'meituan/longcat-flash-thinking-2601' | 'meta/llama-3.1-70b' | 'meta/llama-3.1-8b' | 'meta/llama-3.2-11b' | 'meta/llama-3.2-1b' | 'meta/llama-3.2-3b' | 'meta/llama-3.2-90b' | 'meta/llama-3.3-70b' | 'meta/llama-4-maverick' | 'meta/llama-4-scout' | 'minimax/minimax-m2' | 'minimax/minimax-m2.1' | 'minimax/minimax-m2.1-lightning' | 'minimax/minimax-m2.5' | 'minimax/minimax-m2.5-highspeed' | 'minimax/minimax-m2.7' | 'minimax/minimax-m2.7-highspeed' | 'mistral/codestral' | 'mistral/devstral-2' | 'mistral/devstral-small' | 'mistral/devstral-small-2' | 'mistral/magistral-medium' | 'mistral/magistral-small' | 'mistral/ministral-14b' | 'mistral/ministral-3b' | 'mistral/ministral-8b' | 'mistral/mistral-large-3' | 'mistral/mistral-medium' | 'mistral/mistral-nemo' | 'mistral/mistral-small' | 'mistral/mixtral-8x22b-instruct' | 'mistral/pixtral-12b' | 'mistral/pixtral-large' | 'moonshotai/kimi-k2' | 'moonshotai/kimi-k2-0905' | 'moonshotai/kimi-k2-thinking' | 'moonshotai/kimi-k2-thinking-turbo' | 'moonshotai/kimi-k2-turbo' | 'moonshotai/kimi-k2.5' | 'morph/morph-v3-fast' | 'morph/morph-v3-large' | 'nvidia/nemotron-3-nano-30b-a3b' | 'nvidia/nemotron-nano-12b-v2-vl' | 'nvidia/nemotron-nano-9b-v2' | 'openai/gpt-3.5-turbo' | 'openai/gpt-3.5-turbo-instruct' | 'openai/gpt-4-turbo' | 'openai/gpt-4.1' | 'openai/gpt-4.1-mini' | 'openai/gpt-4.1-nano' | 'openai/gpt-4o' | 'openai/gpt-4o-mini' | 'openai/gpt-4o-mini-search-preview' | 'openai/gpt-5' | 'openai/gpt-5-chat' | 'openai/gpt-5-codex' | 'openai/gpt-5-mini' | 'openai/gpt-5-nano' | 'openai/gpt-5-pro' | 'openai/gpt-5.1-codex' | 'openai/gpt-5.1-codex-max' | 'openai/gpt-5.1-codex-mini' | 'openai/gpt-5.1-instant' | 'openai/gpt-5.1-thinking' | 'openai/gpt-5.2' | 'openai/gpt-5.2-chat' | 'openai/gpt-5.2-codex' | 'openai/gpt-5.2-pro' | 'openai/gpt-5.3-chat' | 'openai/gpt-5.3-codex' | 'openai/gpt-5.4' | 'openai/gpt-5.4-mini' | 'openai/gpt-5.4-nano' | 'openai/gpt-5.4-pro' | 'openai/gpt-oss-120b' | 'openai/gpt-oss-20b' | 'openai/gpt-oss-safeguard-20b' | 'openai/o1' | 'openai/o3' | 'openai/o3-deep-research' | 'openai/o3-mini' | 'openai/o3-pro' | 'openai/o4-mini' | 'perplexity/sonar' | 'perplexity/sonar-pro' | 'perplexity/sonar-reasoning-pro' | 'prime-intellect/intellect-3' | 'xai/grok-2-vision' | 'xai/grok-3' | 'xai/grok-3-fast' | 'xai/grok-3-mini' | 'xai/grok-3-mini-fast' | 'xai/grok-4' | 'xai/grok-4-fast-non-reasoning' | 'xai/grok-4-fast-reasoning' | 'xai/grok-4.1-fast-non-reasoning' | 'xai/grok-4.1-fast-reasoning' | 'xai/grok-4.20-multi-agent' | 'xai/grok-4.20-multi-agent-beta' | 'xai/grok-4.20-non-reasoning' | 'xai/grok-4.20-non-reasoning-beta' | 'xai/grok-4.20-reasoning' | 'xai/grok-4.20-reasoning-beta' | 'xai/grok-code-fast-1' | 'xiaomi/mimo-v2-flash' | 'xiaomi/mimo-v2-pro' | 'zai/glm-4.5' | 'zai/glm-4.5-air' | 'zai/glm-4.5v' | 'zai/glm-4.6' | 'zai/glm-4.6v' | 'zai/glm-4.6v-flash' | 'zai/glm-4.7' | 'zai/glm-4.7-flash' | 'zai/glm-4.7-flashx' | 'zai/glm-5' | 'zai/glm-5-turbo' | (string & {});

type GatewayVideoModelId = 'alibaba/wan-v2.5-t2v-preview' | 'alibaba/wan-v2.6-i2v' | 'alibaba/wan-v2.6-i2v-flash' | 'alibaba/wan-v2.6-r2v' | 'alibaba/wan-v2.6-r2v-flash' | 'alibaba/wan-v2.6-t2v' | 'bytedance/seedance-v1.0-lite-i2v' | 'bytedance/seedance-v1.0-lite-t2v' | 'bytedance/seedance-v1.0-pro' | 'bytedance/seedance-v1.0-pro-fast' | 'bytedance/seedance-v1.5-pro' | 'google/veo-3.0-fast-generate-001' | 'google/veo-3.0-generate-001' | 'google/veo-3.1-fast-generate-001' | 'google/veo-3.1-generate-001' | 'klingai/kling-v2.5-turbo-i2v' | 'klingai/kling-v2.5-turbo-t2v' | 'klingai/kling-v2.6-i2v' | 'klingai/kling-v2.6-motion-control' | 'klingai/kling-v2.6-t2v' | 'klingai/kling-v3.0-i2v' | 'klingai/kling-v3.0-t2v' | 'xai/grok-imagine-video' | (string & {});

interface GatewayLanguageModelEntry {
    /**
     * The model id used by the remote provider in model settings and for specifying the
     * intended model for text generation.
     */
    id: string;
    /**
     * The display name of the model for presentation in user-facing contexts.
     */
    name: string;
    /**
     * Optional description of the model.
     */
    description?: string | null;
    /**
     * Optional pricing information for the model.
     */
    pricing?: {
        /**
         * Cost per input token in USD.
         */
        input: string;
        /**
         * Cost per output token in USD.
         */
        output: string;
        /**
         * Cost per cached input token in USD.
         * Only present for providers/models that support prompt caching.
         */
        cachedInputTokens?: string;
        /**
         * Cost per input token to create/write cache entries in USD.
         * Only present for providers/models that support prompt caching.
         */
        cacheCreationInputTokens?: string;
    } | null;
    /**
     * Additional AI SDK language model specifications for the model.
     */
    specification: GatewayLanguageModelSpecification;
    /**
     * Optional field to differentiate between model types.
     */
    modelType?: 'language' | 'embedding' | 'image' | 'video' | null;
}
type GatewayLanguageModelSpecification = Pick<LanguageModelV3, 'specificationVersion' | 'provider' | 'modelId'>;

interface GatewayFetchMetadataResponse {
    models: GatewayLanguageModelEntry[];
}
interface GatewayCreditsResponse {
    /** The remaining gateway credit balance available for API usage */
    balance: string;
    /** The total amount of gateway credits that have been consumed */
    totalUsed: string;
}

interface GatewaySpendReportParams {
    /** Start date in YYYY-MM-DD format (inclusive) */
    startDate: string;
    /** End date in YYYY-MM-DD format (inclusive) */
    endDate: string;
    /** Primary aggregation dimension. Defaults to 'day'. */
    groupBy?: 'day' | 'user' | 'model' | 'tag' | 'provider' | 'credential_type';
    /** Time granularity when groupBy is 'day'. */
    datePart?: 'day' | 'hour';
    /** Filter to a specific user's spend. */
    userId?: string;
    /** Filter to a specific model (e.g. 'anthropic/claude-sonnet-4.5'). */
    model?: string;
    /** Filter to a specific provider (e.g. 'anthropic'). */
    provider?: string;
    /** Filter to BYOK or system credentials. */
    credentialType?: 'byok' | 'system';
    /** Filter to requests with these tags. */
    tags?: string[];
}
interface GatewaySpendReportRow {
    /** Date string (present when groupBy is 'day') */
    day?: string;
    /** Hour timestamp (present when groupBy is 'day' and datePart is 'hour') */
    hour?: string;
    /** User identifier (present when groupBy is 'user') */
    user?: string;
    /** Model identifier (present when groupBy is 'model') */
    model?: string;
    /** Tag value (present when groupBy is 'tag') */
    tag?: string;
    /** Provider name (present when groupBy is 'provider') */
    provider?: string;
    /** Credential type (present when groupBy is 'credential_type') */
    credentialType?: 'byok' | 'system';
    /** Total cost in USD */
    totalCost: number;
    /** Market cost in USD */
    marketCost?: number;
    /** Number of input tokens */
    inputTokens?: number;
    /** Number of output tokens */
    outputTokens?: number;
    /** Number of cached input tokens */
    cachedInputTokens?: number;
    /** Number of cache creation input tokens */
    cacheCreationInputTokens?: number;
    /** Number of reasoning tokens */
    reasoningTokens?: number;
    /** Number of requests */
    requestCount?: number;
}
interface GatewaySpendReportResponse {
    results: GatewaySpendReportRow[];
}

interface GatewayGenerationInfoParams {
    /** The generation ID to look up (format: gen_<ulid>) */
    id: string;
}
interface GatewayGenerationInfo {
    /** The generation ID */
    id: string;
    /** Total cost in USD */
    totalCost: number;
    /** Upstream inference cost in USD (BYOK only) */
    upstreamInferenceCost: number;
    /** Usage cost in USD (same as totalCost) */
    usage: number;
    /** ISO 8601 timestamp when the generation was created */
    createdAt: string;
    /** Model identifier */
    model: string;
    /** Whether BYOK credentials were used */
    isByok: boolean;
    /** Provider that served this generation */
    providerName: string;
    /** Whether streaming was used */
    streamed: boolean;
    /** Finish reason (e.g. 'stop') */
    finishReason: string;
    /** Time to first token in milliseconds */
    latency: number;
    /** Total generation time in milliseconds */
    generationTime: number;
    /** Number of prompt tokens */
    promptTokens: number;
    /** Number of completion tokens */
    completionTokens: number;
    /** Reasoning tokens used */
    reasoningTokens: number;
    /** Cached tokens used */
    cachedTokens: number;
    /** Cache creation input tokens */
    cacheCreationTokens: number;
    /** Billable web search calls */
    billableWebSearchCalls: number;
}

type GatewayEmbeddingModelId = 'alibaba/qwen3-embedding-0.6b' | 'alibaba/qwen3-embedding-4b' | 'alibaba/qwen3-embedding-8b' | 'amazon/titan-embed-text-v2' | 'cohere/embed-v4.0' | 'google/gemini-embedding-001' | 'google/gemini-embedding-2' | 'google/text-embedding-005' | 'google/text-multilingual-embedding-002' | 'mistral/codestral-embed' | 'mistral/mistral-embed' | 'openai/text-embedding-3-large' | 'openai/text-embedding-3-small' | 'openai/text-embedding-ada-002' | 'voyage/voyage-3-large' | 'voyage/voyage-3.5' | 'voyage/voyage-3.5-lite' | 'voyage/voyage-4' | 'voyage/voyage-4-large' | 'voyage/voyage-4-lite' | 'voyage/voyage-code-2' | 'voyage/voyage-code-3' | 'voyage/voyage-finance-2' | 'voyage/voyage-law-2' | (string & {});

type GatewayImageModelId = 'bfl/flux-2-flex' | 'bfl/flux-2-klein-4b' | 'bfl/flux-2-klein-9b' | 'bfl/flux-2-max' | 'bfl/flux-2-pro' | 'bfl/flux-kontext-max' | 'bfl/flux-kontext-pro' | 'bfl/flux-pro-1.0-fill' | 'bfl/flux-pro-1.1' | 'bfl/flux-pro-1.1-ultra' | 'google/imagen-4.0-fast-generate-001' | 'google/imagen-4.0-generate-001' | 'google/imagen-4.0-ultra-generate-001' | 'openai/gpt-image-1' | 'openai/gpt-image-1-mini' | 'openai/gpt-image-1.5' | 'prodia/flux-fast-schnell' | 'recraft/recraft-v2' | 'recraft/recraft-v3' | 'recraft/recraft-v4' | 'recraft/recraft-v4-pro' | 'xai/grok-imagine-image' | 'xai/grok-imagine-image-pro' | (string & {});

interface PerplexitySearchConfig {
    /**
     * Default maximum number of search results to return (1-20, default: 10).
     */
    maxResults?: number;
    /**
     * Default maximum tokens to extract per search result page (256-2048, default: 2048).
     */
    maxTokensPerPage?: number;
    /**
     * Default maximum total tokens across all search results (default: 25000, max: 1000000).
     */
    maxTokens?: number;
    /**
     * Default two-letter ISO 3166-1 alpha-2 country code for regional search results.
     * Examples: 'US', 'GB', 'FR'
     */
    country?: string;
    /**
     * Default list of domains to include or exclude from search results (max 20).
     * To include: ['nature.com', 'science.org']
     * To exclude: ['-example.com', '-spam.net']
     */
    searchDomainFilter?: string[];
    /**
     * Default list of ISO 639-1 language codes to filter results (max 10, lowercase).
     * Examples: ['en', 'fr', 'de']
     */
    searchLanguageFilter?: string[];
    /**
     * Default recency filter for results.
     * Cannot be combined with searchAfterDate/searchBeforeDate at runtime.
     */
    searchRecencyFilter?: 'day' | 'week' | 'month' | 'year';
}
interface PerplexitySearchResult {
    /** Title of the search result */
    title: string;
    /** URL of the search result */
    url: string;
    /** Text snippet/preview of the content */
    snippet: string;
    /** Publication date of the content */
    date?: string;
    /** Last updated date of the content */
    lastUpdated?: string;
}
interface PerplexitySearchResponse {
    /** Array of search results */
    results: PerplexitySearchResult[];
    /** Unique identifier for this search request */
    id: string;
}
interface PerplexitySearchError {
    /** Error type */
    error: 'api_error' | 'rate_limit' | 'timeout' | 'invalid_input' | 'unknown';
    /** HTTP status code if applicable */
    statusCode?: number;
    /** Human-readable error message */
    message: string;
}
interface PerplexitySearchInput {
    /**
     * Search query (string) or multiple queries (array of up to 5 strings).
     * Multi-query searches return combined results from all queries.
     */
    query: string | string[];
    /**
     * Maximum number of search results to return (1-20, default: 10).
     */
    max_results?: number;
    /**
     * Maximum number of tokens to extract per search result page (256-2048, default: 2048).
     */
    max_tokens_per_page?: number;
    /**
     * Maximum total tokens across all search results (default: 25000, max: 1000000).
     */
    max_tokens?: number;
    /**
     * Two-letter ISO 3166-1 alpha-2 country code for regional search results.
     * Examples: 'US', 'GB', 'FR'
     */
    country?: string;
    /**
     * List of domains to include or exclude from search results (max 20).
     * To include: ['nature.com', 'science.org']
     * To exclude: ['-example.com', '-spam.net']
     */
    search_domain_filter?: string[];
    /**
     * List of ISO 639-1 language codes to filter results (max 10, lowercase).
     * Examples: ['en', 'fr', 'de']
     */
    search_language_filter?: string[];
    /**
     * Include only results published after this date.
     * Format: 'MM/DD/YYYY' (e.g., '3/1/2025')
     * Cannot be used with search_recency_filter.
     */
    search_after_date?: string;
    /**
     * Include only results published before this date.
     * Format: 'MM/DD/YYYY' (e.g., '3/15/2025')
     * Cannot be used with search_recency_filter.
     */
    search_before_date?: string;
    /**
     * Include only results last updated after this date.
     * Format: 'MM/DD/YYYY' (e.g., '3/1/2025')
     * Cannot be used with search_recency_filter.
     */
    last_updated_after_filter?: string;
    /**
     * Include only results last updated before this date.
     * Format: 'MM/DD/YYYY' (e.g., '3/15/2025')
     * Cannot be used with search_recency_filter.
     */
    last_updated_before_filter?: string;
    /**
     * Filter results by relative time period.
     * Cannot be used with search_after_date or search_before_date.
     */
    search_recency_filter?: 'day' | 'week' | 'month' | 'year';
}
type PerplexitySearchOutput = PerplexitySearchResponse | PerplexitySearchError;
declare const perplexitySearchToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<PerplexitySearchInput, PerplexitySearchOutput, PerplexitySearchConfig>;

interface ParallelSearchSourcePolicy {
    /**
     * List of domains to include in search results.
     * Example: ['wikipedia.org', 'nature.com']
     */
    includeDomains?: string[];
    /**
     * List of domains to exclude from search results.
     * Example: ['reddit.com', 'twitter.com']
     */
    excludeDomains?: string[];
    /**
     * Only include results published after this date (ISO 8601 format).
     * Example: '2024-01-01'
     */
    afterDate?: string;
}
interface ParallelSearchExcerpts {
    /**
     * Maximum characters per result.
     */
    maxCharsPerResult?: number;
    /**
     * Maximum total characters across all results.
     */
    maxCharsTotal?: number;
}
interface ParallelSearchFetchPolicy {
    /**
     * Maximum age in seconds for cached content.
     * Set to 0 to always fetch fresh content.
     */
    maxAgeSeconds?: number;
}
interface ParallelSearchConfig {
    /**
     * Mode preset for different use cases:
     * - "one-shot": Comprehensive results with longer excerpts for single-response answers (default)
     * - "agentic": Concise, token-efficient results for multi-step agentic workflows
     */
    mode?: 'one-shot' | 'agentic';
    /**
     * Default maximum number of results to return (1-20).
     * Defaults to 10 if not specified.
     */
    maxResults?: number;
    /**
     * Default source policy for controlling which domains to include/exclude.
     */
    sourcePolicy?: ParallelSearchSourcePolicy;
    /**
     * Default excerpt configuration for controlling result length.
     */
    excerpts?: ParallelSearchExcerpts;
    /**
     * Default fetch policy for controlling content freshness.
     */
    fetchPolicy?: ParallelSearchFetchPolicy;
}
interface ParallelSearchResult {
    /** URL of the search result */
    url: string;
    /** Title of the search result */
    title: string;
    /** Extracted text excerpt/content from the page */
    excerpt: string;
    /** Publication date of the content (may be null) */
    publishDate?: string | null;
    /** Relevance score for the result */
    relevanceScore?: number;
}
interface ParallelSearchResponse {
    /** Unique identifier for this search request */
    searchId: string;
    /** Array of search results */
    results: ParallelSearchResult[];
}
interface ParallelSearchError {
    /** Error type */
    error: 'api_error' | 'rate_limit' | 'timeout' | 'invalid_input' | 'configuration_error' | 'unknown';
    /** HTTP status code if applicable */
    statusCode?: number;
    /** Human-readable error message */
    message: string;
}
interface ParallelSearchInput {
    /**
     * Natural-language description of the web research goal.
     * Include source or freshness guidance and broader context from the task.
     * Maximum 5000 characters.
     */
    objective: string;
    /**
     * Optional search queries to supplement the objective.
     * Maximum 200 characters per query.
     */
    search_queries?: string[];
    /**
     * Mode preset for different use cases:
     * - "one-shot": Comprehensive results with longer excerpts
     * - "agentic": Concise, token-efficient results for multi-step workflows
     */
    mode?: 'one-shot' | 'agentic';
    /**
     * Maximum number of results to return (1-20).
     * Defaults to 10 if not specified.
     */
    max_results?: number;
    /**
     * Source policy for controlling which domains to include/exclude.
     */
    source_policy?: {
        include_domains?: string[];
        exclude_domains?: string[];
        after_date?: string;
    };
    /**
     * Excerpt configuration for controlling result length.
     */
    excerpts?: {
        max_chars_per_result?: number;
        max_chars_total?: number;
    };
    /**
     * Fetch policy for controlling content freshness.
     */
    fetch_policy?: {
        max_age_seconds?: number;
    };
}
type ParallelSearchOutput = ParallelSearchResponse | ParallelSearchError;
declare const parallelSearchToolFactory: _ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<ParallelSearchInput, ParallelSearchOutput, ParallelSearchConfig>;

/**
 * Gateway-specific provider-defined tools.
 */
declare const gatewayTools: {
    /**
     * Search the web using Parallel AI's Search API for LLM-optimized excerpts.
     *
     * Takes a natural language objective and returns relevant excerpts,
     * replacing multiple keyword searches with a single call for broad
     * or complex queries. Supports different search types for depth vs
     * breadth tradeoffs.
     */
    parallelSearch: (config?: ParallelSearchConfig) => ReturnType<typeof parallelSearchToolFactory>;
    /**
     * Search the web using Perplexity's Search API for real-time information,
     * news, research papers, and articles.
     *
     * Provides ranked search results with advanced filtering options including
     * domain, language, date range, and recency filters.
     */
    perplexitySearch: (config?: PerplexitySearchConfig) => ReturnType<typeof perplexitySearchToolFactory>;
};

interface GatewayProvider extends ProviderV3 {
    (modelId: GatewayModelId): LanguageModelV3;
    /**
     * Creates a model for text generation.
     */
    chat(modelId: GatewayModelId): LanguageModelV3;
    /**
     * Creates a model for text generation.
     */
    languageModel(modelId: GatewayModelId): LanguageModelV3;
    /**
     * Returns available providers and models for use with the remote provider.
     */
    getAvailableModels(): Promise<GatewayFetchMetadataResponse>;
    /**
     * Returns credit information for the authenticated user.
     */
    getCredits(): Promise<GatewayCreditsResponse>;
    /**
     * Returns a spend report with cost, token, and request count data,
     * aggregated by the specified dimension.
     */
    getSpendReport(params: GatewaySpendReportParams): Promise<GatewaySpendReportResponse>;
    /**
     * Returns detailed information about a specific generation by its ID,
     * including cost, token usage, latency, and provider details.
     */
    getGenerationInfo(params: GatewayGenerationInfoParams): Promise<GatewayGenerationInfo>;
    /**
     * Creates a model for generating text embeddings.
     */
    embedding(modelId: GatewayEmbeddingModelId): EmbeddingModelV3;
    /**
     * Creates a model for generating text embeddings.
     */
    embeddingModel(modelId: GatewayEmbeddingModelId): EmbeddingModelV3;
    /**
     * @deprecated Use `embeddingModel` instead.
     */
    textEmbeddingModel(modelId: GatewayEmbeddingModelId): EmbeddingModelV3;
    /**
     * Creates a model for generating images.
     */
    image(modelId: GatewayImageModelId): ImageModelV3;
    /**
     * Creates a model for generating images.
     */
    imageModel(modelId: GatewayImageModelId): ImageModelV3;
    /**
     * Creates a model for generating videos.
     */
    video(modelId: GatewayVideoModelId): Experimental_VideoModelV3;
    /**
     * Creates a model for generating videos.
     */
    videoModel(modelId: GatewayVideoModelId): Experimental_VideoModelV3;
    /**
     * Gateway-specific tools executed server-side.
     */
    tools: typeof gatewayTools;
}
interface GatewayProviderSettings {
    /**
     * The base URL prefix for API calls. Defaults to `https://ai-gateway.vercel.sh/v1/ai`.
     */
    baseURL?: string;
    /**
     * API key that is being sent using the `Authorization` header.
     */
    apiKey?: string;
    /**
     * Custom headers to include in the requests.
     */
    headers?: Record<string, string>;
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
    /**
     * How frequently to refresh the metadata cache in milliseconds.
     */
    metadataCacheRefreshMillis?: number;
}
/**
 * Create a remote provider instance.
 */
declare function createGatewayProvider(options?: GatewayProviderSettings): GatewayProvider;
declare const gateway: GatewayProvider;

declare const gatewayProviderOptions: _ai_sdk_provider_utils.LazySchema<{
    only?: string[] | undefined;
    order?: string[] | undefined;
    user?: string | undefined;
    tags?: string[] | undefined;
    models?: string[] | undefined;
    byok?: Record<string, Record<string, unknown>[]> | undefined;
    zeroDataRetention?: boolean | undefined;
    providerTimeouts?: {
        byok?: Record<string, number> | undefined;
    } | undefined;
}>;
type GatewayProviderOptions = InferSchema<typeof gatewayProviderOptions>;

declare const symbol$6: unique symbol;
declare abstract class GatewayError extends Error {
    private readonly [symbol$6];
    abstract readonly name: string;
    abstract readonly type: string;
    readonly statusCode: number;
    readonly cause?: unknown;
    readonly generationId?: string;
    constructor({ message, statusCode, cause, generationId, }: {
        message: string;
        statusCode?: number;
        cause?: unknown;
        generationId?: string;
    });
    /**
     * Checks if the given error is a Gateway Error.
     * @param {unknown} error - The error to check.
     * @returns {boolean} True if the error is a Gateway Error, false otherwise.
     */
    static isInstance(error: unknown): error is GatewayError;
    static hasMarker(error: unknown): error is GatewayError;
}

declare const gatewayErrorResponseSchema: _ai_sdk_provider_utils.LazySchema<{
    error: {
        message: string;
        type?: string | null | undefined;
        param?: unknown;
        code?: string | number | null | undefined;
    };
    generationId?: string | null | undefined;
}>;
type GatewayErrorResponse = InferSchema<typeof gatewayErrorResponseSchema>;

declare const symbol$5: unique symbol;
/**
 * Authentication failed - invalid API key or OIDC token
 */
declare class GatewayAuthenticationError extends GatewayError {
    private readonly [symbol$5];
    readonly name = "GatewayAuthenticationError";
    readonly type = "authentication_error";
    constructor({ message, statusCode, cause, generationId, }?: {
        message?: string;
        statusCode?: number;
        cause?: unknown;
        generationId?: string;
    });
    static isInstance(error: unknown): error is GatewayAuthenticationError;
    /**
     * Creates a contextual error message when authentication fails
     */
    static createContextualError({ apiKeyProvided, oidcTokenProvided, message, statusCode, cause, generationId, }: {
        apiKeyProvided: boolean;
        oidcTokenProvided: boolean;
        message?: string;
        statusCode?: number;
        cause?: unknown;
        generationId?: string;
    }): GatewayAuthenticationError;
}

declare const symbol$4: unique symbol;
/**
 * Internal server error from the Gateway
 */
declare class GatewayInternalServerError extends GatewayError {
    private readonly [symbol$4];
    readonly name = "GatewayInternalServerError";
    readonly type = "internal_server_error";
    constructor({ message, statusCode, cause, generationId, }?: {
        message?: string;
        statusCode?: number;
        cause?: unknown;
        generationId?: string;
    });
    static isInstance(error: unknown): error is GatewayInternalServerError;
}

declare const symbol$3: unique symbol;
/**
 * Invalid request - missing headers, malformed data, etc.
 */
declare class GatewayInvalidRequestError extends GatewayError {
    private readonly [symbol$3];
    readonly name = "GatewayInvalidRequestError";
    readonly type = "invalid_request_error";
    constructor({ message, statusCode, cause, generationId, }?: {
        message?: string;
        statusCode?: number;
        cause?: unknown;
        generationId?: string;
    });
    static isInstance(error: unknown): error is GatewayInvalidRequestError;
}

declare const symbol$2: unique symbol;
/**
 * Model not found or not available
 */
declare class GatewayModelNotFoundError extends GatewayError {
    private readonly [symbol$2];
    readonly name = "GatewayModelNotFoundError";
    readonly type = "model_not_found";
    readonly modelId?: string;
    constructor({ message, statusCode, modelId, cause, generationId, }?: {
        message?: string;
        statusCode?: number;
        modelId?: string;
        cause?: unknown;
        generationId?: string;
    });
    static isInstance(error: unknown): error is GatewayModelNotFoundError;
}

declare const symbol$1: unique symbol;
/**
 * Rate limit exceeded.
 */
declare class GatewayRateLimitError extends GatewayError {
    private readonly [symbol$1];
    readonly name = "GatewayRateLimitError";
    readonly type = "rate_limit_exceeded";
    constructor({ message, statusCode, cause, generationId, }?: {
        message?: string;
        statusCode?: number;
        cause?: unknown;
        generationId?: string;
    });
    static isInstance(error: unknown): error is GatewayRateLimitError;
}

declare const symbol: unique symbol;
/**
 * Gateway response parsing error
 */
declare class GatewayResponseError extends GatewayError {
    private readonly [symbol];
    readonly name = "GatewayResponseError";
    readonly type = "response_error";
    readonly response?: unknown;
    readonly validationError?: TypeValidationError;
    constructor({ message, statusCode, response, validationError, cause, generationId, }?: {
        message?: string;
        statusCode?: number;
        response?: unknown;
        validationError?: TypeValidationError;
        cause?: unknown;
        generationId?: string;
    });
    static isInstance(error: unknown): error is GatewayResponseError;
}

export { GatewayAuthenticationError, type GatewayCreditsResponse, GatewayError, type GatewayErrorResponse, type GatewayGenerationInfo, type GatewayGenerationInfoParams, GatewayInternalServerError, GatewayInvalidRequestError, type GatewayLanguageModelEntry, type GatewayProviderOptions as GatewayLanguageModelOptions, type GatewayLanguageModelSpecification, type GatewayLanguageModelEntry as GatewayModelEntry, type GatewayModelId, GatewayModelNotFoundError, type GatewayProvider, type GatewayProviderOptions, type GatewayProviderSettings, GatewayRateLimitError, GatewayResponseError, type GatewaySpendReportParams, type GatewaySpendReportResponse, type GatewaySpendReportRow, type GatewayVideoModelId, createGatewayProvider as createGateway, createGatewayProvider, gateway };
