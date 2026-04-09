import { z } from 'zod/v4';
import type { GatewayError } from './gateway-error';
import { GatewayAuthenticationError } from './gateway-authentication-error';
import { GatewayInvalidRequestError } from './gateway-invalid-request-error';
import { GatewayRateLimitError } from './gateway-rate-limit-error';
import {
  GatewayModelNotFoundError,
  modelNotFoundParamSchema,
} from './gateway-model-not-found-error';
import { GatewayInternalServerError } from './gateway-internal-server-error';
import { GatewayResponseError } from './gateway-response-error';
import {
  InferSchema,
  lazySchema,
  safeValidateTypes,
  validateTypes,
  zodSchema,
} from '@ai-sdk/provider-utils';

export async function createGatewayErrorFromResponse({
  response,
  statusCode,
  defaultMessage = 'Gateway request failed',
  cause,
  authMethod,
}: {
  response: unknown;
  statusCode: number;
  defaultMessage?: string;
  cause?: unknown;
  authMethod?: 'api-key' | 'oidc';
}): Promise<GatewayError> {
  const parseResult = await safeValidateTypes({
    value: response,
    schema: gatewayErrorResponseSchema,
  });

  if (!parseResult.success) {
    // Try to extract generationId even if validation failed
    const rawGenerationId =
      typeof response === 'object' &&
      response !== null &&
      'generationId' in response
        ? (response as { generationId?: string }).generationId
        : undefined;

    return new GatewayResponseError({
      message: `Invalid error response format: ${defaultMessage}`,
      statusCode,
      response,
      validationError: parseResult.error,
      cause,
      generationId: rawGenerationId,
    });
  }

  const validatedResponse: GatewayErrorResponse = parseResult.value;
  const errorType = validatedResponse.error.type;
  const message = validatedResponse.error.message;
  const generationId = validatedResponse.generationId ?? undefined;

  switch (errorType) {
    case 'authentication_error':
      return GatewayAuthenticationError.createContextualError({
        apiKeyProvided: authMethod === 'api-key',
        oidcTokenProvided: authMethod === 'oidc',
        statusCode,
        cause,
        generationId,
      });
    case 'invalid_request_error':
      return new GatewayInvalidRequestError({
        message,
        statusCode,
        cause,
        generationId,
      });
    case 'rate_limit_exceeded':
      return new GatewayRateLimitError({
        message,
        statusCode,
        cause,
        generationId,
      });
    case 'model_not_found': {
      const modelResult = await safeValidateTypes({
        value: validatedResponse.error.param,
        schema: modelNotFoundParamSchema,
      });

      return new GatewayModelNotFoundError({
        message,
        statusCode,
        modelId: modelResult.success ? modelResult.value.modelId : undefined,
        cause,
        generationId,
      });
    }
    case 'internal_server_error':
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId,
      });
    default:
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId,
      });
  }
}

const gatewayErrorResponseSchema = lazySchema(() =>
  zodSchema(
    z.object({
      error: z.object({
        message: z.string(),
        type: z.string().nullish(),
        param: z.unknown().nullish(),
        code: z.union([z.string(), z.number()]).nullish(),
      }),
      generationId: z.string().nullish(),
    }),
  ),
);

export type GatewayErrorResponse = InferSchema<
  typeof gatewayErrorResponseSchema
>;
