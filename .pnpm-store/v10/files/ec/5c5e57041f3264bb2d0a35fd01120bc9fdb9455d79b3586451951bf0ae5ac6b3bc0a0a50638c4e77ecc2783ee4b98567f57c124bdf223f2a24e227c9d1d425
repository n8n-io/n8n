import { GatewayError } from './gateway-error';

const name = 'GatewayAuthenticationError';
const marker = `vercel.ai.gateway.error.${name}`;
const symbol = Symbol.for(marker);

/**
 * Authentication failed - invalid API key or OIDC token
 */
export class GatewayAuthenticationError extends GatewayError {
  private readonly [symbol] = true; // used in isInstance

  readonly name = name;
  readonly type = 'authentication_error';

  constructor({
    message = 'Authentication failed',
    statusCode = 401,
    cause,
    generationId,
  }: {
    message?: string;
    statusCode?: number;
    cause?: unknown;
    generationId?: string;
  } = {}) {
    super({ message, statusCode, cause, generationId });
  }

  static isInstance(error: unknown): error is GatewayAuthenticationError {
    return GatewayError.hasMarker(error) && symbol in error;
  }

  /**
   * Creates a contextual error message when authentication fails
   */
  static createContextualError({
    apiKeyProvided,
    oidcTokenProvided,
    message = 'Authentication failed',
    statusCode = 401,
    cause,
    generationId,
  }: {
    apiKeyProvided: boolean;
    oidcTokenProvided: boolean;
    message?: string;
    statusCode?: number;
    cause?: unknown;
    generationId?: string;
  }): GatewayAuthenticationError {
    let contextualMessage: string;

    if (apiKeyProvided) {
      contextualMessage = `AI Gateway authentication failed: Invalid API key.

Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys

Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.`;
    } else if (oidcTokenProvided) {
      contextualMessage = `AI Gateway authentication failed: Invalid OIDC token.

Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.

Alternatively, use an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys`;
    } else {
      contextualMessage = `AI Gateway authentication failed: No authentication provided.

Option 1 - API key:
Create an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.

Option 2 - OIDC token:
Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.`;
    }

    return new GatewayAuthenticationError({
      message: contextualMessage,
      statusCode,
      cause,
      generationId,
    });
  }
}
