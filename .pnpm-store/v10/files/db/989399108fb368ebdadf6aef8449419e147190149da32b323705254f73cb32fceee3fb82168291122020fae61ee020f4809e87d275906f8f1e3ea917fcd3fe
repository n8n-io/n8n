import { JSONObject } from '../../json-value/json-value';

/**
 * Additional provider-specific metadata.
 * Metadata are additional outputs from the provider.
 * They are passed through to the provider from the AI SDK
 * and enable provider-specific functionality
 * that can be fully encapsulated in the provider.
 *
 * This enables us to quickly ship provider-specific functionality
 * without affecting the core AI SDK.
 *
 * The outer record is keyed by the provider name, and the inner
 * record is keyed by the provider-specific metadata key.
 *
 * ```ts
 * {
 *   "anthropic": {
 *     "cacheControl": { "type": "ephemeral" }
 *   }
 * }
 * ```
 */
export type SharedV3ProviderMetadata = Record<string, JSONObject>;
