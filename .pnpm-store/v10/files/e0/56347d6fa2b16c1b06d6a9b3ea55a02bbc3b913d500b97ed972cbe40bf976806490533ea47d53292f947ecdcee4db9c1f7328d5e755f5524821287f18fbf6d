import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { UserContext } from '../../walk';
import type { Oas3Paths } from '../../typings/openapi';
import type { Oas2Paths } from '../../typings/swagger';

export const NoIdenticalPaths: Oas3Rule | Oas2Rule = () => {
  return {
    Paths(pathMap: Oas3Paths | Oas2Paths, { report, location }: UserContext) {
      const Paths = new Map<string, string>();
      for (const pathName of Object.keys(pathMap)) {
        const id = pathName.replace(/{.+?}/g, '{VARIABLE}');
        const existingSamePath = Paths.get(id);
        if (existingSamePath) {
          report({
            message: `The path already exists which differs only by path parameter name(s): \`${existingSamePath}\` and \`${pathName}\`.`,
            location: location.child([pathName]).key(),
          });
        } else {
          Paths.set(id, pathName);
        }
      }
    },
  };
};
