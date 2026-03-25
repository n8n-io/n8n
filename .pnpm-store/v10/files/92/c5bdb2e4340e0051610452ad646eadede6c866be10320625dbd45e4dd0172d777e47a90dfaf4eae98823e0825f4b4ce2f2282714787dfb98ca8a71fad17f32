import { isRef } from '../../ref-utils';

import type { Oas3Rule, Oas3Visitor } from '../../visitors';
import type { Oas3_1Schema, Oas3Parameter } from '../../typings/openapi';

export type ArrayParameterSerializationOptions = {
  in?: string[];
};

export const ArrayParameterSerialization: Oas3Rule = (
  options: ArrayParameterSerializationOptions
): Oas3Visitor => {
  return {
    Parameter: {
      leave(node, ctx) {
        if (!node.schema) {
          return;
        }
        const schema = (
          isRef(node.schema) ? ctx.resolve(node.schema).node : node.schema
        ) as Oas3_1Schema;

        if (
          schema &&
          shouldReportMissingStyleAndExplode(node as Oas3Parameter<Oas3_1Schema>, schema, options)
        ) {
          ctx.report({
            message: `Parameter \`${node.name}\` should have \`style\` and \`explode \` fields`,
            location: ctx.location,
          });
        }
      },
    },
  };
};

function shouldReportMissingStyleAndExplode(
  node: Oas3Parameter<Oas3_1Schema>,
  schema: Oas3_1Schema,
  options: ArrayParameterSerializationOptions
) {
  return (
    (schema.type === 'array' || schema.items || schema.prefixItems) &&
    (node.style === undefined || node.explode === undefined) &&
    (!options.in || (node.in && options.in?.includes(node.in)))
  );
}
