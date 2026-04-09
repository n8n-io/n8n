import { ProviderMetadata } from '../types/provider-metadata';

/**
 * Reasoning output of a text generation. It contains a reasoning.
 */
export interface ReasoningOutput {
  type: 'reasoning';

  /**
   * The reasoning text.
   */
  text: string;

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerMetadata?: ProviderMetadata;
}
