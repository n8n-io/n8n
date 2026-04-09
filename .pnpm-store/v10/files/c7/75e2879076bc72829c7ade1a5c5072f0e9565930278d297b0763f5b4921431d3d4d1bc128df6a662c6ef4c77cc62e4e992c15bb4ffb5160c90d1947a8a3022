import { ZodSetDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';

export type JsonSchema7SetType = {
  type: 'array';
  uniqueItems: true;
  items?: JsonSchema7Type;
  minItems?: number;
  maxItems?: number;
};

export function parseSetDef(def: ZodSetDef, refs: Refs): JsonSchema7SetType {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, 'items'],
  });

  const schema: JsonSchema7SetType = {
    type: 'array',
    uniqueItems: true,
    items,
  };

  if (def.minSize) {
    schema.minItems = def.minSize.value;
  }

  if (def.maxSize) {
    schema.maxItems = def.maxSize.value;
  }

  return schema;
}
