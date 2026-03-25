import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { Oas2Parameter } from '../../typings/swagger';
import type { Oas3Parameter } from '../../typings/openapi';
import type { UserContext } from '../../walk';

export const OperationParametersUnique: Oas3Rule | Oas2Rule = () => {
  let seenPathParams: Set<string>;
  let seenOperationParams: Set<string>;

  return {
    PathItem: {
      enter() {
        seenPathParams = new Set();
      },
      Parameter(
        parameter: Oas2Parameter | Oas3Parameter,
        { report, key, parentLocations }: UserContext
      ) {
        const paramId = `${parameter.in}___${parameter.name}`;
        if (seenPathParams.has(paramId)) {
          report({
            message: `Paths must have unique \`name\` + \`in\` parameters.\nRepeats of \`in:${parameter.in}\` + \`name:${parameter.name}\`.`,
            location: parentLocations.PathItem.child(['parameters', key]),
          });
        }
        seenPathParams.add(`${parameter.in}___${parameter.name}`);
      },
      Operation: {
        enter() {
          seenOperationParams = new Set();
        },
        Parameter(
          parameter: Oas2Parameter | Oas3Parameter,
          { report, key, parentLocations }: UserContext
        ) {
          const paramId = `${parameter.in}___${parameter.name}`;
          if (seenOperationParams.has(paramId)) {
            report({
              message: `Operations must have unique \`name\` + \`in\` parameters. Repeats of \`in:${parameter.in}\` + \`name:${parameter.name}\`.`,
              location: parentLocations.Operation.child(['parameters', key]),
            });
          }
          seenOperationParams.add(paramId);
        },
      },
    },
  };
};
