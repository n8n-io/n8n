import { readFileAsStringSync } from '../../utils';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors';
import type { UserContext } from '../../walk';

export const InfoDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ filePath }) => {
  return {
    Info: {
      leave(info, { report, location }: UserContext) {
        if (!filePath)
          throw new Error(
            `Parameter "filePath" is not provided for "info-description-override" rule`
          );
        try {
          info.description = readFileAsStringSync(filePath);
        } catch (e) {
          report({
            message: `Failed to read markdown override file for "info.description".\n${e.message}`,
            location: location.child('description'),
          });
        }
      },
    },
  };
};
