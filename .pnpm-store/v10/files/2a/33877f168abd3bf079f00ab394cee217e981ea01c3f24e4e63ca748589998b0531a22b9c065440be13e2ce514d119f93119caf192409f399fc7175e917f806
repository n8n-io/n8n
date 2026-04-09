import { JSONObject } from '@ai-sdk/provider';
import { AnthropicMessageMetadata } from './anthropic-message-metadata';

/**
 * Sets the Anthropic container ID in the provider options based on
 * any previous step's provider metadata.
 *
 * Searches backwards through steps to find the most recent container ID.
 * You can use this function in `prepareStep` to forward the container ID between steps.
 */
export function forwardAnthropicContainerIdFromLastStep({
  steps,
}: {
  steps: Array<{
    providerMetadata?: Record<string, JSONObject>;
  }>;
}): undefined | { providerOptions?: Record<string, JSONObject> } {
  // Search backwards through steps to find the most recent container ID
  for (let i = steps.length - 1; i >= 0; i--) {
    const containerId = (
      steps[i].providerMetadata?.anthropic as
        | AnthropicMessageMetadata
        | undefined
    )?.container?.id;

    if (containerId) {
      return {
        providerOptions: {
          anthropic: {
            container: { id: containerId },
          },
        },
      };
    }
  }

  return undefined;
}
