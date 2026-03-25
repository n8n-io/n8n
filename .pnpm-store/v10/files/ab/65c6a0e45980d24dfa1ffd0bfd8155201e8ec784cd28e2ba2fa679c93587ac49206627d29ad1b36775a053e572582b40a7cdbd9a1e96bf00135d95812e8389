import { matchesJsonSchemaType, oasTypeOf } from '../utils';

import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { Oas2Schema } from '../../typings/swagger';
import type { Oas3Schema } from '../../typings/openapi';
import type { UserContext } from '../../walk';

export const NoEnumTypeMismatch: Oas3Rule | Oas2Rule = () => {
  return {
    Schema(schema: Oas2Schema | Oas3Schema, { report, location }: UserContext) {
      if (schema.enum && !Array.isArray(schema.enum)) return;
      if (schema.enum && schema.type && !Array.isArray(schema.type)) {
        const typeMismatchedValues = schema.enum.filter(
          (item) => !matchesJsonSchemaType(item, schema.type as string, schema.nullable as boolean)
        );
        for (const mismatchedValue of typeMismatchedValues) {
          report({
            message: `All values of \`enum\` field must be of the same type as the \`type\` field: expected "${
              schema.type
            }" but received "${oasTypeOf(mismatchedValue)}".`,
            location: location.child(['enum', schema.enum.indexOf(mismatchedValue)]),
          });
        }
      }

      if (schema.enum && schema.type && Array.isArray(schema.type)) {
        const mismatchedResults: { [key: string]: string[] } = {};
        for (const enumValue of schema.enum) {
          mismatchedResults[enumValue] = [];

          for (const type of schema.type) {
            const valid = matchesJsonSchemaType(
              enumValue,
              type as string,
              schema.nullable as boolean
            );
            if (!valid) mismatchedResults[enumValue].push(type);
          }

          if (mismatchedResults[enumValue].length !== schema.type.length)
            delete mismatchedResults[enumValue];
        }

        for (const mismatchedKey of Object.keys(mismatchedResults)) {
          report({
            message: `Enum value \`${mismatchedKey}\` must be of allowed types: \`${schema.type}\`.`,
            location: location.child(['enum', schema.enum.indexOf(mismatchedKey)]),
          });
        }
      }
    },
  };
};
