// For internal usage only

import Ajv from '@redocly/ajv/dist/2020';
import { isPlainObject } from '../utils';

import type { JSONSchema } from 'json-schema-to-ts';
import type { NodeType, PropType, ResolveTypeFn } from '.';
import type { Oas3Schema } from '../typings/openapi';

const ajv = new Ajv({
  strictSchema: false,
  allowUnionTypes: true,
  useDefaults: true,
  allErrors: true,
  discriminator: true,
  strictTypes: false,
  verbose: true,
});

function findOneOf(schemaOneOf: JSONSchema[], oneOfs: (PropType | ResolveTypeFn)[]): ResolveTypeFn {
  if (oneOfs.some((option) => typeof option === 'function')) {
    throw new Error('Unexpected oneOf inside oneOf.');
  }

  return (value: unknown) => {
    let index = schemaOneOf.findIndex((option) => ajv.validate(option, value));
    if (index === -1) {
      index = 0;
    }
    return oneOfs[index] as PropType;
  };
}

function transformJSONSchemaToNodeType(
  propertyName: string,
  schema: JSONSchema,
  ctx: Record<string, NodeType>
): PropType | ResolveTypeFn {
  if (!schema || typeof schema === 'boolean') {
    throw new Error(`Unexpected schema in ${propertyName}.`);
  }

  if (schema instanceof Array) {
    throw new Error(`Unexpected array schema in ${propertyName}. Try using oneOf instead.`);
  }

  if (schema.type === 'null') {
    throw new Error(`Unexpected null schema type in ${propertyName} schema.`);
  }

  if (schema.type instanceof Array) {
    throw new Error(
      `Unexpected array schema type in ${propertyName} schema. Try using oneOf instead.`
    );
  }

  if (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean'
  ) {
    const { default: _, format: _format, ...rest } = schema;
    return rest as PropType;
  }

  if (schema.type === 'object' && !schema.properties && !schema.oneOf) {
    if (schema.additionalProperties === undefined || schema.additionalProperties === true) {
      return { type: 'object' };
    } else if (schema.additionalProperties === false) {
      return { type: 'object', properties: {} };
    }
  }

  if (schema.allOf) {
    throw new Error(`Unexpected allOf in ${propertyName}.`);
  }

  if (schema.anyOf) {
    throw new Error(`Unexpected anyOf in ${propertyName}.`);
  }

  if (
    isPlainObject(schema.properties) ||
    isPlainObject(schema.additionalProperties) ||
    (isPlainObject(schema.items) &&
      (isPlainObject(schema.items.properties) ||
        isPlainObject(schema.items.additionalProperties) ||
        schema.items.oneOf)) // exclude scalar array types
  ) {
    return extractNodeToContext(propertyName, schema, ctx);
  }

  if (schema.oneOf) {
    if ((schema as Oas3Schema).discriminator) {
      const discriminatedPropertyName = (schema as Oas3Schema).discriminator?.propertyName;
      if (!discriminatedPropertyName) {
        throw new Error(`Unexpected discriminator without a propertyName in ${propertyName}.`);
      }
      const oneOfs = schema.oneOf.map((option, i) => {
        if (typeof option === 'boolean') {
          throw new Error(
            `Unexpected boolean schema in ${propertyName} at position ${i} in oneOf.`
          );
        }
        const discriminatedProperty = option?.properties?.[discriminatedPropertyName];
        if (!discriminatedProperty || typeof discriminatedProperty === 'boolean') {
          throw new Error(
            `Unexpected property '${discriminatedProperty}' schema in ${propertyName} at position ${i} in oneOf.`
          );
        }
        const name = discriminatedProperty.const as string;
        return transformJSONSchemaToNodeType(name, option, ctx);
      });

      return (value: unknown, key: string) => {
        if (isPlainObject(value)) {
          const discriminatedTypeName = value[discriminatedPropertyName];
          if (typeof discriminatedTypeName === 'string' && ctx[discriminatedTypeName]) {
            return discriminatedTypeName;
          }
        }
        return findOneOf(schema.oneOf as JSONSchema[], oneOfs)(value, key);
      };
    } else {
      const oneOfs = schema.oneOf.map((option, i) =>
        transformJSONSchemaToNodeType(propertyName + '_' + i, option, ctx)
      );
      return findOneOf(schema.oneOf as JSONSchema[], oneOfs);
    }
  }

  return schema as PropType;
}

function extractNodeToContext(
  propertyName: string,
  schema: JSONSchema,
  ctx: Record<string, NodeType>
): string {
  if (!schema || typeof schema === 'boolean') {
    throw new Error(`Unexpected schema in ${propertyName}.`);
  }

  if (schema instanceof Array) {
    throw new Error(`Unexpected array schema in ${propertyName}. Try using oneOf instead.`);
  }

  if (schema.type === 'null') {
    throw new Error(`Unexpected null schema type in ${propertyName} schema.`);
  }

  if (schema.type instanceof Array) {
    throw new Error(
      `Unexpected array schema type in ${propertyName} schema. Try using oneOf instead.`
    );
  }

  const properties: Record<string, PropType | ResolveTypeFn> = {};
  for (const [name, property] of Object.entries(schema.properties || {})) {
    properties[name] = transformJSONSchemaToNodeType(propertyName + '.' + name, property, ctx);
  }

  let additionalProperties;
  if (isPlainObject(schema.additionalProperties)) {
    additionalProperties = transformJSONSchemaToNodeType(
      propertyName + '_additionalProperties',
      schema.additionalProperties,
      ctx
    );
  }
  if (schema.additionalProperties === true) {
    additionalProperties = {};
  }

  let items;
  if (
    isPlainObject(schema.items) &&
    (isPlainObject(schema.items.properties) ||
      isPlainObject(schema.items.additionalProperties) ||
      schema.items.oneOf) // exclude scalar array types
  ) {
    items = transformJSONSchemaToNodeType(propertyName + '_items', schema.items, ctx);
  }

  let required = schema.required as NodeType['required'];
  // Translate required in oneOfs into a ResolveTypeFn.
  if (schema.oneOf && schema.oneOf.every((option) => !!(option as Oas3Schema).required)) {
    required = (value): string[] => {
      const requiredList: string[][] = schema.oneOf!.map((option) => [
        ...(schema.required || []),
        ...(option as Oas3Schema).required!,
      ]);

      let index = requiredList.findIndex((r) =>
        r.every((requiredProp) => value[requiredProp] !== undefined)
      );
      if (index === -1) {
        index = 0;
      }

      return requiredList[index];
    };
  }

  ctx[propertyName] = { properties, additionalProperties, items, required };
  return propertyName;
}

export function getNodeTypesFromJSONSchema(
  schemaName: string,
  entrySchema: JSONSchema
): Record<string, NodeType> {
  const ctx: Record<string, NodeType> = {};
  transformJSONSchemaToNodeType(schemaName, entrySchema, ctx);
  return ctx;
}
