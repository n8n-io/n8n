import { ZodObjectDef, ZodTypeAny } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';

export type JsonSchema7ObjectType = {
  type: 'object';
  properties: Record<string, JsonSchema7Type>;
  additionalProperties?: boolean | JsonSchema7Type;
  required?: string[];
};

export function parseObjectDef(def: ZodObjectDef, refs: Refs) {
  const result: JsonSchema7ObjectType = {
    type: 'object',
    properties: {},
  };

  const required: string[] = [];

  const shape = def.shape();

  for (const propName in shape) {
    let propDef = shape[propName];

    if (propDef === undefined || propDef._def === undefined) {
      continue;
    }

    const propOptional = safeIsOptional(propDef);

    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'properties', propName],
      propertyPath: [...refs.currentPath, 'properties', propName],
    });

    if (parsedDef === undefined) {
      continue;
    }

    result.properties[propName] = parsedDef;

    if (!propOptional) {
      required.push(propName);
    }
  }

  if (required.length) {
    result.required = required;
  }

  const additionalProperties = decideAdditionalProperties(def, refs);

  if (additionalProperties !== undefined) {
    result.additionalProperties = additionalProperties;
  }

  return result;
}

function decideAdditionalProperties(def: ZodObjectDef, refs: Refs) {
  if (def.catchall._def.typeName !== 'ZodNever') {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'additionalProperties'],
    });
  }

  switch (def.unknownKeys) {
    case 'passthrough':
      return refs.allowedAdditionalProperties;
    case 'strict':
      return refs.rejectedAdditionalProperties;
    case 'strip':
      return refs.removeAdditionalStrategy === 'strict'
        ? refs.allowedAdditionalProperties
        : refs.rejectedAdditionalProperties;
  }
}

function safeIsOptional(schema: ZodTypeAny): boolean {
  try {
    return schema.isOptional();
  } catch {
    return true;
  }
}
