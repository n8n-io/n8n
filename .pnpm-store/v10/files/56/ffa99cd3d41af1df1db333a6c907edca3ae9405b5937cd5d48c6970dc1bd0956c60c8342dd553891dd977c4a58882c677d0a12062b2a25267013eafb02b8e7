import { SharedV3Warning, SharedV3ProviderMetadata } from '@ai-sdk/provider';
import { AnthropicCacheControl } from './anthropic-messages-api';

// Anthropic allows a maximum of 4 cache breakpoints per request
const MAX_CACHE_BREAKPOINTS = 4;

// Helper function to extract cache_control from provider metadata
// Allows both cacheControl and cache_control for flexibility
function getCacheControl(
  providerMetadata: SharedV3ProviderMetadata | undefined,
): AnthropicCacheControl | undefined {
  const anthropic = providerMetadata?.anthropic;

  // allow both cacheControl and cache_control:
  const cacheControlValue = anthropic?.cacheControl ?? anthropic?.cache_control;

  // Pass through value assuming it is of the correct type.
  // The Anthropic API will validate the value.
  return cacheControlValue as AnthropicCacheControl | undefined;
}

export class CacheControlValidator {
  private breakpointCount = 0;
  private warnings: SharedV3Warning[] = [];

  getCacheControl(
    providerMetadata: SharedV3ProviderMetadata | undefined,
    context: { type: string; canCache: boolean },
  ): AnthropicCacheControl | undefined {
    const cacheControlValue = getCacheControl(providerMetadata);

    if (!cacheControlValue) {
      return undefined;
    }

    // Validate that cache_control is allowed in this context
    if (!context.canCache) {
      this.warnings.push({
        type: 'unsupported',
        feature: 'cache_control on non-cacheable context',
        details: `cache_control cannot be set on ${context.type}. It will be ignored.`,
      });
      return undefined;
    }

    // Validate cache breakpoint limit
    this.breakpointCount++;
    if (this.breakpointCount > MAX_CACHE_BREAKPOINTS) {
      this.warnings.push({
        type: 'unsupported',
        feature: 'cacheControl breakpoint limit',
        details: `Maximum ${MAX_CACHE_BREAKPOINTS} cache breakpoints exceeded (found ${this.breakpointCount}). This breakpoint will be ignored.`,
      });
      return undefined;
    }

    return cacheControlValue;
  }

  getWarnings(): SharedV3Warning[] {
    return this.warnings;
  }
}
