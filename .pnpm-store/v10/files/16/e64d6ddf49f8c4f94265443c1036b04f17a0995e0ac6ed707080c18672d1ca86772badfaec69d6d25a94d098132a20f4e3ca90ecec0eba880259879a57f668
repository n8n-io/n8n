import { readFileAsStringSync } from '../../utils';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors';
import type { UserContext } from '../../walk';

export const TagDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ tagNames }) => {
  return {
    Tag: {
      leave(tag, { report }: UserContext) {
        if (!tagNames)
          throw new Error(
            `Parameter "tagNames" is not provided for "tag-description-override" rule`
          );
        if (tagNames[tag.name]) {
          try {
            tag.description = readFileAsStringSync(tagNames[tag.name]);
          } catch (e) {
            report({
              message: `Failed to read markdown override file for tag "${tag.name}".\n${e.message}`,
            });
          }
        }
      },
    },
  };
};
