import type { Oas3Schema } from '../../typings/openapi';
import type { Oas2Schema } from '../../typings/swagger';
import type { Oas2Rule, Oas3Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const NoSchemaTypeMismatch: Oas3Rule | Oas2Rule = () => {
  return {
    Schema(schema: Oas2Schema | Oas3Schema, { report, location }: UserContext) {
      if (schema.type === 'object' && schema.items) {
        report({
          message: "Schema type mismatch: 'object' type should not contain 'items' field.",
          location: location.child('items'),
        });
      }

      if (schema.type === 'array' && schema.properties) {
        report({
          message: "Schema type mismatch: 'array' type should not contain 'properties' field.",
          location: location.child('properties'),
        });
      }
    },
  };
};
