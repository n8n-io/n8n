import { JSONSchema7, JSONSchema7Definition } from '@ai-sdk/provider';

/**
 * Recursively adds additionalProperties: false to the JSON schema. This is necessary because some providers (e.g. OpenAI) do not support additionalProperties: true.
 */
export function addAdditionalPropertiesToJsonSchema(
  jsonSchema: JSONSchema7,
): JSONSchema7 {
  if (
    jsonSchema.type === 'object' ||
    (Array.isArray(jsonSchema.type) && jsonSchema.type.includes('object'))
  ) {
    jsonSchema.additionalProperties = false;
    const { properties } = jsonSchema;
    if (properties != null) {
      for (const key of Object.keys(properties)) {
        properties[key] = visit(properties[key]);
      }
    }
  }

  if (jsonSchema.items != null) {
    jsonSchema.items = Array.isArray(jsonSchema.items)
      ? jsonSchema.items.map(visit)
      : visit(jsonSchema.items);
  }

  if (jsonSchema.anyOf != null) {
    jsonSchema.anyOf = jsonSchema.anyOf.map(visit);
  }

  if (jsonSchema.allOf != null) {
    jsonSchema.allOf = jsonSchema.allOf.map(visit);
  }

  if (jsonSchema.oneOf != null) {
    jsonSchema.oneOf = jsonSchema.oneOf.map(visit);
  }

  const { definitions } = jsonSchema;
  if (definitions != null) {
    for (const key of Object.keys(definitions)) {
      definitions[key] = visit(definitions[key]);
    }
  }

  return jsonSchema;
}

function visit(def: JSONSchema7Definition): JSONSchema7Definition {
  if (typeof def === 'boolean') return def;
  return addAdditionalPropertiesToJsonSchema(def);
}
