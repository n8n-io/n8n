import { GatewayAuthenticationError } from '@ai-sdk/gateway';
import { AISDKError } from '@ai-sdk/provider';

export function wrapGatewayError(error: unknown): unknown {
  if (!GatewayAuthenticationError.isInstance(error)) return error;

  const isProductionEnv = process?.env.NODE_ENV === 'production';
  const moreInfoURL = 'https://ai-sdk.dev/unauthenticated-ai-gateway';

  if (isProductionEnv) {
    return new AISDKError({
      name: 'GatewayError',
      message: `Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module. Learn more: ${moreInfoURL}`,
    });
  }

  return Object.assign(
    new Error(`\u001b[1m\u001b[31mUnauthenticated request to AI Gateway.\u001b[0m

To authenticate, set the \u001b[33mAI_GATEWAY_API_KEY\u001b[0m environment variable with your API key.

Alternatively, you can use a provider module instead of the AI Gateway.

Learn more: \u001b[34m${moreInfoURL}\u001b[0m

`),
    { name: 'GatewayAuthenticationError' },
  );
}
