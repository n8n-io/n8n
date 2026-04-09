import { z } from 'zod/v4';
import { GatewayError } from './gateway-error';
import { lazySchema, zodSchema } from '@ai-sdk/provider-utils';

const name = 'GatewayModelNotFoundError';
const marker = `vercel.ai.gateway.error.${name}`;
const symbol = Symbol.for(marker);

export const modelNotFoundParamSchema = lazySchema(() =>
  zodSchema(
    z.object({
      modelId: z.string(),
    }),
  ),
);

/**
 * Model not found or not available
 */
export class GatewayModelNotFoundError extends GatewayError {
  private readonly [symbol] = true; // used in isInstance

  readonly name = name;
  readonly type = 'model_not_found';
  readonly modelId?: string;

  constructor({
    message = 'Model not found',
    statusCode = 404,
    modelId,
    cause,
    generationId,
  }: {
    message?: string;
    statusCode?: number;
    modelId?: string;
    cause?: unknown;
    generationId?: string;
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this.modelId = modelId;
  }

  static isInstance(error: unknown): error is GatewayModelNotFoundError {
    return GatewayError.hasMarker(error) && symbol in error;
  }
}
