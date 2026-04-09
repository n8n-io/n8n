import { TypeValidationContext, TypeValidationError } from '@ai-sdk/provider';
import { FlexibleSchema, asSchema } from './schema';

/**
 * Validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T - The type of the object to validate.
 * @param {string} options.value - The object to validate.
 * @param {Validator<T>} options.schema - The schema to use for validating the JSON.
 * @param {TypeValidationContext} options.context - Optional context about what is being validated.
 * @returns {Promise<T>} - The typed object.
 */
export async function validateTypes<OBJECT>({
  value,
  schema,
  context,
}: {
  value: unknown;
  schema: FlexibleSchema<OBJECT>;
  context?: TypeValidationContext;
}): Promise<OBJECT> {
  const result = await safeValidateTypes({ value, schema, context });

  if (!result.success) {
    throw TypeValidationError.wrap({ value, cause: result.error, context });
  }

  return result.value;
}

/**
 * Safely validates the types of an unknown object using a schema and
 * return a strongly-typed object.
 *
 * @template T - The type of the object to validate.
 * @param {string} options.value - The JSON object to validate.
 * @param {Validator<T>} options.schema - The schema to use for validating the JSON.
 * @param {TypeValidationContext} options.context - Optional context about what is being validated.
 * @returns An object with either a `success` flag and the parsed and typed data, or a `success` flag and an error object.
 */
export async function safeValidateTypes<OBJECT>({
  value,
  schema,
  context,
}: {
  value: unknown;
  schema: FlexibleSchema<OBJECT>;
  context?: TypeValidationContext;
}): Promise<
  | {
      success: true;
      value: OBJECT;
      rawValue: unknown;
    }
  | {
      success: false;
      error: TypeValidationError;
      rawValue: unknown;
    }
> {
  const actualSchema = asSchema(schema);

  try {
    if (actualSchema.validate == null) {
      return { success: true, value: value as OBJECT, rawValue: value };
    }

    const result = await actualSchema.validate(value);

    if (result.success) {
      return { success: true, value: result.value, rawValue: value };
    }

    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: result.error, context }),
      rawValue: value,
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: error, context }),
      rawValue: value,
    };
  }
}
