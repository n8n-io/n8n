import { ProviderOptions } from './provider-options';

/**
 * A system message. It can contain system information.
 *
 * Note: using the "system" part of the prompt is strongly preferred
 * to increase the resilience against prompt injection attacks,
 * and because not all providers support several system messages.
 */
export type SystemModelMessage = {
  role: 'system';
  content: string;

  /**
   * Additional provider-specific metadata. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: ProviderOptions;
};
