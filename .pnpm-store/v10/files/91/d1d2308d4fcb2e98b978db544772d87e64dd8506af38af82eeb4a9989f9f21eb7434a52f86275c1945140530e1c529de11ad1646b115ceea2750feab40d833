import { getAdditionalPropertiesOption, validateExample } from '../utils';

import type { UserContext } from '../../walk';
import type { Oas3_1Schema, Oas3Schema } from '../../typings/openapi';
import type { Oas2Rule, Oas3Rule } from '../../visitors';

export const NoInvalidSchemaExamples: Oas3Rule | Oas2Rule = (opts: any) => {
  const allowAdditionalProperties = getAdditionalPropertiesOption(opts) ?? false;
  return {
    Schema: {
      leave(schema: Oas3_1Schema | Oas3Schema, ctx: UserContext) {
        const examples = (schema as Oas3_1Schema).examples;
        if (examples) {
          for (const example of examples) {
            validateExample(
              example,
              schema,
              ctx.location.child(['examples', examples.indexOf(example)]),
              ctx,
              allowAdditionalProperties
            );
          }
        }

        if (schema.example !== undefined) {
          // Handle nullable example for OAS3
          if (
            (schema as Oas3Schema).nullable === true &&
            schema.example === null &&
            schema.type !== undefined
          ) {
            return;
          }

          validateExample(schema.example, schema, ctx.location.child('example'), ctx, true);
        }
      },
    },
  };
};
