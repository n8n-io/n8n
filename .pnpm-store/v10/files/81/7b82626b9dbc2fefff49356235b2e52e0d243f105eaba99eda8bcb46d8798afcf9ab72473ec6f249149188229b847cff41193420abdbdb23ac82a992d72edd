import { ZodLiteralDef } from 'zod/v3';

export type JsonSchema7LiteralType =
  | {
      type: 'string' | 'number' | 'integer' | 'boolean';
      const: string | number | boolean;
    }
  | {
      type: 'object' | 'array';
    };

export function parseLiteralDef(def: ZodLiteralDef): JsonSchema7LiteralType {
  const parsedType = typeof def.value;
  if (
    parsedType !== 'bigint' &&
    parsedType !== 'number' &&
    parsedType !== 'boolean' &&
    parsedType !== 'string'
  ) {
    return {
      type: Array.isArray(def.value) ? 'array' : 'object',
    };
  }

  return {
    type: parsedType === 'bigint' ? 'integer' : parsedType,
    const: def.value,
  };
}
