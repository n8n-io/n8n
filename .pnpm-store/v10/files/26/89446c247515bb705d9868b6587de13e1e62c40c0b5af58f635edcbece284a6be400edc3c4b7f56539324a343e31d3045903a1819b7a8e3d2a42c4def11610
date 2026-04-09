import { AISDKError } from './ai-sdk-error';
import { getErrorMessage } from './get-error-message';

const name = 'AI_TypeValidationError';
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);

export interface TypeValidationContext {
  /**
   * Field path in dot notation (e.g., "message.metadata", "message.parts[3].data")
   */
  field?: string;

  /**
   * Entity name (e.g., tool name, data type name)
   */
  entityName?: string;

  /**
   * Entity identifier (e.g., message ID, tool call ID)
   */
  entityId?: string;
}

export class TypeValidationError extends AISDKError {
  private readonly [symbol] = true; // used in isInstance

  readonly value: unknown;
  readonly context?: TypeValidationContext;

  constructor({
    value,
    cause,
    context,
  }: {
    value: unknown;
    cause: unknown;
    context?: TypeValidationContext;
  }) {
    let contextPrefix = 'Type validation failed';

    if (context?.field) {
      contextPrefix += ` for ${context.field}`;
    }

    if (context?.entityName || context?.entityId) {
      contextPrefix += ' (';
      const parts: string[] = [];
      if (context.entityName) {
        parts.push(context.entityName);
      }
      if (context.entityId) {
        parts.push(`id: "${context.entityId}"`);
      }
      contextPrefix += parts.join(', ');
      contextPrefix += ')';
    }

    super({
      name,
      message:
        `${contextPrefix}: ` +
        `Value: ${JSON.stringify(value)}.\n` +
        `Error message: ${getErrorMessage(cause)}`,
      cause,
    });

    this.value = value;
    this.context = context;
  }

  static isInstance(error: unknown): error is TypeValidationError {
    return AISDKError.hasMarker(error, marker);
  }

  /**
   * Wraps an error into a TypeValidationError.
   * If the cause is already a TypeValidationError with the same value and context, it returns the cause.
   * Otherwise, it creates a new TypeValidationError.
   *
   * @param {Object} params - The parameters for wrapping the error.
   * @param {unknown} params.value - The value that failed validation.
   * @param {unknown} params.cause - The original error or cause of the validation failure.
   * @param {TypeValidationContext} params.context - Optional context about what is being validated.
   * @returns {TypeValidationError} A TypeValidationError instance.
   */
  static wrap({
    value,
    cause,
    context,
  }: {
    value: unknown;
    cause: unknown;
    context?: TypeValidationContext;
  }): TypeValidationError {
    if (
      TypeValidationError.isInstance(cause) &&
      cause.value === value &&
      cause.context?.field === context?.field &&
      cause.context?.entityName === context?.entityName &&
      cause.context?.entityId === context?.entityId
    ) {
      return cause;
    }

    return new TypeValidationError({ value, cause, context });
  }
}
