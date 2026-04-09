import { FlexibleSchema } from '@ai-sdk/provider-utils';
import { InvalidArgumentError } from '../error/invalid-argument-error';

export function validateObjectGenerationInput({
  output,
  schema,
  schemaName,
  schemaDescription,
  enumValues,
}: {
  output?: 'object' | 'array' | 'enum' | 'no-schema';
  schema?: FlexibleSchema<unknown>;
  schemaName?: string;
  schemaDescription?: string;
  enumValues?: Array<unknown>;
}) {
  if (
    output != null &&
    output !== 'object' &&
    output !== 'array' &&
    output !== 'enum' &&
    output !== 'no-schema'
  ) {
    throw new InvalidArgumentError({
      parameter: 'output',
      value: output,
      message: 'Invalid output type.',
    });
  }

  if (output === 'no-schema') {
    if (schema != null) {
      throw new InvalidArgumentError({
        parameter: 'schema',
        value: schema,
        message: 'Schema is not supported for no-schema output.',
      });
    }

    if (schemaDescription != null) {
      throw new InvalidArgumentError({
        parameter: 'schemaDescription',
        value: schemaDescription,
        message: 'Schema description is not supported for no-schema output.',
      });
    }

    if (schemaName != null) {
      throw new InvalidArgumentError({
        parameter: 'schemaName',
        value: schemaName,
        message: 'Schema name is not supported for no-schema output.',
      });
    }

    if (enumValues != null) {
      throw new InvalidArgumentError({
        parameter: 'enumValues',
        value: enumValues,
        message: 'Enum values are not supported for no-schema output.',
      });
    }
  }

  if (output === 'object') {
    if (schema == null) {
      throw new InvalidArgumentError({
        parameter: 'schema',
        value: schema,
        message: 'Schema is required for object output.',
      });
    }

    if (enumValues != null) {
      throw new InvalidArgumentError({
        parameter: 'enumValues',
        value: enumValues,
        message: 'Enum values are not supported for object output.',
      });
    }
  }

  if (output === 'array') {
    if (schema == null) {
      throw new InvalidArgumentError({
        parameter: 'schema',
        value: schema,
        message: 'Element schema is required for array output.',
      });
    }

    if (enumValues != null) {
      throw new InvalidArgumentError({
        parameter: 'enumValues',
        value: enumValues,
        message: 'Enum values are not supported for array output.',
      });
    }
  }

  if (output === 'enum') {
    if (schema != null) {
      throw new InvalidArgumentError({
        parameter: 'schema',
        value: schema,
        message: 'Schema is not supported for enum output.',
      });
    }

    if (schemaDescription != null) {
      throw new InvalidArgumentError({
        parameter: 'schemaDescription',
        value: schemaDescription,
        message: 'Schema description is not supported for enum output.',
      });
    }

    if (schemaName != null) {
      throw new InvalidArgumentError({
        parameter: 'schemaName',
        value: schemaName,
        message: 'Schema name is not supported for enum output.',
      });
    }

    if (enumValues == null) {
      throw new InvalidArgumentError({
        parameter: 'enumValues',
        value: enumValues,
        message: 'Enum values are required for enum output.',
      });
    }

    for (const value of enumValues) {
      if (typeof value !== 'string') {
        throw new InvalidArgumentError({
          parameter: 'enumValues',
          value,
          message: 'Enum values must be strings.',
        });
      }
    }
  }
}
