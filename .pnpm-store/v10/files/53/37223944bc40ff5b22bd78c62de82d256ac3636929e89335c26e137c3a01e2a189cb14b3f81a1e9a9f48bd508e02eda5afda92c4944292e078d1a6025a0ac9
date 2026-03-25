import { isRef } from '../../ref-utils';

import type { Oas2Rule, Oas3Rule } from '../../visitors';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import type { Oas2Schema } from 'core/src/typings/swagger';
import type { UserContext } from 'core/src/walk';

export const NoRequiredSchemaPropertiesUndefined: Oas3Rule | Oas2Rule = () => {
  return {
    Schema: {
      enter(
        schema: Oas3Schema | Oas3_1Schema | Oas2Schema,
        { location, report, resolve }: UserContext
      ) {
        if (!schema.required) return;
        const visitedSchemas: Set<Oas3Schema | Oas3_1Schema | Oas2Schema> = new Set();

        const elevateProperties = (
          schema: Oas3Schema | Oas3_1Schema | Oas2Schema
        ): Record<string, Oas3Schema | Oas3_1Schema | Oas2Schema> => {
          // Check if the schema has been visited before processing it
          if (visitedSchemas.has(schema)) {
            return {};
          }
          visitedSchemas.add(schema);

          if (isRef(schema)) {
            return elevateProperties(
              resolve(schema).node as Oas3Schema | Oas3_1Schema | Oas2Schema
            );
          }

          return Object.assign(
            {},
            schema.properties,
            ...(schema.allOf?.map(elevateProperties) ?? []),
            ...((schema as Oas3Schema).anyOf?.map(elevateProperties) ?? [])
          );
        };

        const allProperties = elevateProperties(schema);

        for (const [i, requiredProperty] of schema.required.entries()) {
          if (!allProperties || allProperties[requiredProperty] === undefined) {
            report({
              message: `Required property '${requiredProperty}' is undefined.`,
              location: location.child(['required', i]),
            });
          }
        }
      },
    },
  };
};
