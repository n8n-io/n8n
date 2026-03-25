import { validateDefinedAndNonEmpty } from '../utils';

import type { Oas3Rule, Oas2Rule } from '../../visitors';

export const TagDescription: Oas3Rule | Oas2Rule = () => {
  return {
    Tag(tag, ctx) {
      validateDefinedAndNonEmpty('description', tag, ctx);
    },
  };
};
