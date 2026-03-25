import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { Oas2Parameter } from '../../typings/swagger';
import type { Oas3Parameter } from '../../typings/openapi';
import type { UserContext } from '../../walk';

export const ParameterDescription: Oas3Rule | Oas2Rule = () => {
  return {
    Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
      if (parameter.description === undefined) {
        report({
          message: 'Parameter object description must be present.',
          location: { reportOnKey: true },
        });
      } else if (!parameter.description) {
        report({
          message: 'Parameter object description must be non-empty string.',
          location: location.child(['description']),
        });
      }
    },
  };
};
