import { ZodIntersectionDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';
import { JsonSchema7StringType } from './string';

export type JsonSchema7AllOfType = {
  allOf: JsonSchema7Type[];
  unevaluatedProperties?: boolean;
};

const isJsonSchema7AllOfType = (
  type: JsonSchema7Type | JsonSchema7StringType,
): type is JsonSchema7AllOfType => {
  if ('type' in type && type.type === 'string') return false;
  return 'allOf' in type;
};

export function parseIntersectionDef(
  def: ZodIntersectionDef,
  refs: Refs,
): JsonSchema7AllOfType | JsonSchema7Type | undefined {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'allOf', '0'],
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'allOf', '1'],
    }),
  ].filter((x): x is JsonSchema7Type => !!x);

  const mergedAllOf: JsonSchema7Type[] = [];
  // If either of the schemas is an allOf, merge them into a single allOf
  allOf.forEach(schema => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
    } else {
      let nestedSchema: JsonSchema7Type = schema;
      if (
        'additionalProperties' in schema &&
        schema.additionalProperties === false
      ) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? { allOf: mergedAllOf } : undefined;
}
