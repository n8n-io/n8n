import { encodePointer } from './pointer.js';
import { Schema } from './types.js';

export const schemaKeyword: Record<string, boolean> = {
  additionalItems: true,
  unevaluatedItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  unevaluatedProperties: true,
  propertyNames: true,
  not: true,
  if: true,
  then: true,
  else: true
};

export const schemaArrayKeyword: Record<string, boolean> = {
  prefixItems: true,
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};

export const schemaMapKeyword: Record<string, boolean> = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependentSchemas: true
};

export const ignoredKeyword: Record<string, boolean> = {
  id: true,
  $id: true,
  $ref: true,
  $schema: true,
  $anchor: true,
  $vocabulary: true,
  $comment: true,
  default: true,
  enum: true,
  const: true,
  required: true,
  type: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};

/**
 * Default base URI for schemas without an $id.
 * https://json-schema.org/draft/2019-09/json-schema-core.html#initial-base
 * https://tools.ietf.org/html/rfc3986#section-5.1
 */
export let initialBaseURI: URL =
  // @ts-ignore
  typeof self !== 'undefined' &&
  self.location &&
  self.location.origin !== 'null'
    ? //@ts-ignore
      new URL(self.location.origin + self.location.pathname + location.search)
    : new URL('https://github.com/cfworker');

export function dereference(
  schema: Schema | boolean,
  lookup: Record<string, Schema | boolean> = Object.create(null),
  baseURI: URL = initialBaseURI,
  basePointer = ''
): Record<string, Schema | boolean> {
  if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
    const id: string = schema.$id || schema.id;
    if (id) {
      const url = new URL(id, baseURI.href);
      if (url.hash.length > 1) {
        lookup[url.href] = schema;
      } else {
        url.hash = ''; // normalize hash https://url.spec.whatwg.org/#dom-url-hash
        if (basePointer === '') {
          baseURI = url;
        } else {
          dereference(schema, lookup, baseURI);
        }
      }
    }
  } else if (schema !== true && schema !== false) {
    return lookup;
  }

  // compute the schema's URI and add it to the mapping.
  const schemaURI = baseURI.href + (basePointer ? '#' + basePointer : '');
  if (lookup[schemaURI] !== undefined) {
    throw new Error(`Duplicate schema URI "${schemaURI}".`);
  }
  lookup[schemaURI] = schema;

  // exit early if this is a boolean schema.
  if (schema === true || schema === false) {
    return lookup;
  }

  // set the schema's absolute URI.
  if (schema.__absolute_uri__ === undefined) {
    Object.defineProperty(schema, '__absolute_uri__', {
      enumerable: false,
      value: schemaURI
    });
  }

  // if a $ref is found, resolve it's absolute URI.
  if (schema.$ref && schema.__absolute_ref__ === undefined) {
    const url = new URL(schema.$ref, baseURI.href);
    url.hash = url.hash; // normalize hash https://url.spec.whatwg.org/#dom-url-hash
    Object.defineProperty(schema, '__absolute_ref__', {
      enumerable: false,
      value: url.href
    });
  }

  // if a $recursiveRef is found, resolve it's absolute URI.
  if (schema.$recursiveRef && schema.__absolute_recursive_ref__ === undefined) {
    const url = new URL(schema.$recursiveRef, baseURI.href);
    url.hash = url.hash; // normalize hash https://url.spec.whatwg.org/#dom-url-hash
    Object.defineProperty(schema, '__absolute_recursive_ref__', {
      enumerable: false,
      value: url.href
    });
  }

  // if an $anchor is found, compute it's URI and add it to the mapping.
  if (schema.$anchor) {
    const url = new URL('#' + schema.$anchor, baseURI.href);
    lookup[url.href] = schema;
  }

  // process subschemas.
  for (let key in schema) {
    if (ignoredKeyword[key]) {
      continue;
    }
    const keyBase = `${basePointer}/${encodePointer(key)}`;
    const subSchema = schema[key];
    if (Array.isArray(subSchema)) {
      if (schemaArrayKeyword[key]) {
        const length = subSchema.length;
        for (let i = 0; i < length; i++) {
          dereference(subSchema[i], lookup, baseURI, `${keyBase}/${i}`);
        }
      }
    } else if (schemaMapKeyword[key]) {
      for (let subKey in subSchema) {
        dereference(
          subSchema[subKey],
          lookup,
          baseURI,
          `${keyBase}/${encodePointer(subKey)}`
        );
      }
    } else {
      dereference(subSchema, lookup, baseURI, keyBase);
    }
  }

  return lookup;
}

// schema identification examples
// https://json-schema.org/draft/2019-09/json-schema-core.html#rfc.appendix.A
// $ref delegation
// https://github.com/json-schema-org/json-schema-spec/issues/514
// output format
// https://json-schema.org/draft/2019-09/json-schema-core.html#output
// JSON pointer
// https://tools.ietf.org/html/rfc6901
// JSON relative pointer
// https://tools.ietf.org/html/draft-handrews-relative-json-pointer-01
