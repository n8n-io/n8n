import levenshtein = require('js-levenshtein');
import { Location } from '../ref-utils';
import { validateJsonSchema } from './ajv';
import {
  isPlainObject,
  showErrorForDeprecatedField,
  showWarningForDeprecatedField,
} from '../utils';

import type { Oas3Schema, Oas3_1Schema, Referenced } from '../typings/openapi';
import type { UserContext } from '../walk';

export function oasTypeOf(value: unknown) {
  if (Array.isArray(value)) {
    return 'array';
  } else if (value === null) {
    return 'null';
  } else if (Number.isInteger(value)) {
    return 'integer';
  } else {
    return typeof value;
  }
}

/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns boolean
 */
export function matchesJsonSchemaType(value: unknown, type: string, nullable: boolean): boolean {
  if (nullable && value === null) {
    return true;
  }

  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    case 'integer':
      return Number.isInteger(value);
    default:
      return typeof value === type;
  }
}

export function missingRequiredField(type: string, field: string): string {
  return `${type} object should contain \`${field}\` field.`;
}

export function missingRequiredOneOfFields(type: string, fields: string[]): string {
  return `${type} object should contain one of the fields: ${fields
    .map((field) => `\`${field}\``)
    .join(', ')}.`;
}

export function fieldNonEmpty(type: string, field: string): string {
  return `${type} object \`${field}\` must be non-empty string.`;
}

export function validateDefinedAndNonEmpty(fieldName: string, value: any, ctx: UserContext) {
  if (!isPlainObject(value)) {
    return;
  }

  if (value[fieldName] === undefined) {
    ctx.report({
      message: missingRequiredField(ctx.type.name, fieldName),
      location: ctx.location.child([fieldName]).key(),
    });
  } else if (!value[fieldName]) {
    ctx.report({
      message: fieldNonEmpty(ctx.type.name, fieldName),
      location: ctx.location.child([fieldName]).key(),
    });
  }
}

export function validateOneOfDefinedAndNonEmpty(
  fieldNames: string[],
  value: any,
  ctx: UserContext
) {
  if (!isPlainObject(value)) {
    return;
  }

  if (!fieldNames.some((fieldName) => value.hasOwnProperty(fieldName))) {
    ctx.report({
      message: missingRequiredOneOfFields(ctx.type.name, fieldNames),
      location: ctx.location.key(),
    });
  }

  for (const fieldName of fieldNames) {
    if (value.hasOwnProperty(fieldName) && !value[fieldName]) {
      ctx.report({
        message: fieldNonEmpty(ctx.type.name, fieldName),
        location: ctx.location.child([fieldName]).key(),
      });
    }
  }
}

export function getSuggest(given: string, variants: string[]): string[] {
  if (given === null) return variants;

  if (typeof given !== 'string' || !variants.length) return [];

  const distances: Array<{ variant: string; distance: number }> = [];

  for (let i = 0; i < variants.length; i++) {
    const distance = levenshtein(given, variants[i]);
    if (distance < 4) {
      distances.push({ distance, variant: variants[i] });
    }
  }

  distances.sort((a, b) => a.distance - b.distance);

  // if (bestMatch.distance <= 4) return bestMatch.string;
  return distances.map((d) => d.variant);
}

export function validateExample(
  example: any,
  schema: Referenced<Oas3Schema | Oas3_1Schema>,
  dataLoc: Location,
  { resolve, location, report }: UserContext,
  allowAdditionalProperties: boolean
) {
  try {
    const { valid, errors } = validateJsonSchema(
      example,
      schema,
      location.child('schema'),
      dataLoc.pointer,
      resolve,
      allowAdditionalProperties
    );
    if (!valid) {
      for (const error of errors) {
        report({
          message: `Example value must conform to the schema: ${error.message}.`,
          location: {
            ...new Location(dataLoc.source, error.instancePath),
            reportOnKey:
              error.keyword === 'unevaluatedProperties' || error.keyword === 'additionalProperties',
          },
          from: location,
          suggest: error.suggest,
        });
      }
    }
  } catch (e) {
    if (e.message === 'discriminator: requires oneOf or anyOf composite keyword') {
      return;
    }

    report({
      message: `Example validation errored: ${e.message}.`,
      location: location.child('schema'),
      from: location,
    });
  }
}

export function getAdditionalPropertiesOption(opts: Record<string, any>): boolean {
  if (opts.disallowAdditionalProperties === undefined) {
    return opts.allowAdditionalProperties;
  }

  if (opts.allowAdditionalProperties !== undefined) {
    showErrorForDeprecatedField(
      'disallowAdditionalProperties',
      'allowAdditionalProperties',
      undefined
    );
  }

  showWarningForDeprecatedField('disallowAdditionalProperties', 'allowAdditionalProperties');
  return !opts.disallowAdditionalProperties;
}

export function validateSchemaEnumType(
  schemaEnum: string[],
  propertyValue: string,
  propName: string,
  refLocation: Location | undefined,
  { report, location }: UserContext
) {
  if (!schemaEnum) {
    return;
  }
  if (!schemaEnum.includes(propertyValue)) {
    report({
      location,
      message: `\`${propName}\` can be one of the following only: ${schemaEnum
        .map((type) => `"${type}"`)
        .join(', ')}.`,
      from: refLocation,
      suggest: getSuggest(propertyValue, schemaEnum),
    });
  }
}

export function validateResponseCodes(
  responseCodes: string[],
  codeRange: string,
  { report }: UserContext
) {
  const responseCodeRegexp = new RegExp(`^${codeRange[0]}[0-9Xx]{2}$`);

  const containsNeededCode = responseCodes.some(
    (code) =>
      (codeRange === '2XX' && code === 'default') || // It's OK to replace 2xx codes with the default
      responseCodeRegexp.test(code)
  );

  if (!containsNeededCode) {
    report({
      message: `Operation must have at least one \`${codeRange}\` response.`,
      location: { reportOnKey: true },
    });
  }
}
