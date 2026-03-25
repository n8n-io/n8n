import { validateMimeType } from '../../utils';

import type { Oas2Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ResponseMimeType: Oas2Rule = ({ allowedValues }) => {
  return {
    Root(root, ctx: UserContext) {
      validateMimeType({ type: 'produces', value: root }, ctx, allowedValues);
    },
    Operation: {
      leave(operation, ctx: UserContext) {
        validateMimeType({ type: 'produces', value: operation }, ctx, allowedValues);
      },
    },
  };
};
