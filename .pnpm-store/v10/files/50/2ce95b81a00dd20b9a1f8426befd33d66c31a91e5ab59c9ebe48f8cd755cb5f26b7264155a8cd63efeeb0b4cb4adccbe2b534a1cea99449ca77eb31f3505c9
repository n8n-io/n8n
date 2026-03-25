import { getAdditionalPropertiesOption, validateExample } from '../utils';

import type { UserContext } from '../../walk';
import type { Oas3Parameter } from '../../typings/openapi';

export const NoInvalidParameterExamples: any = (opts: any) => {
  const allowAdditionalProperties = getAdditionalPropertiesOption(opts) ?? false;
  return {
    Parameter: {
      leave(parameter: Oas3Parameter, ctx: UserContext) {
        if (parameter.example !== undefined) {
          validateExample(
            parameter.example,
            parameter.schema!,
            ctx.location.child('example'),
            ctx,
            allowAdditionalProperties
          );
        }

        if (parameter.examples) {
          for (const [key, example] of Object.entries(parameter.examples)) {
            if ('value' in example) {
              validateExample(
                example.value,
                parameter.schema!,
                ctx.location.child(['examples', key]),
                ctx,
                true
              );
            }
          }
        }
      },
    },
  };
};
