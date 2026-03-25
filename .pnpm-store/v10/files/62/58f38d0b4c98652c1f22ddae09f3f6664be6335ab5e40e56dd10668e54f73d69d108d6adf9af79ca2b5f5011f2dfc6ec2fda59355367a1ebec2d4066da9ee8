import { validateDefinedAndNonEmpty } from '../utils';

import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { UserContext } from '../../walk';
import type { Oas2Operation } from '../../typings/swagger';
import type { Oas3Operation } from '../../typings/openapi';

export const OperationSummary: Oas3Rule | Oas2Rule = () => {
  return {
    Operation(operation: Oas2Operation | Oas3Operation, ctx: UserContext) {
      validateDefinedAndNonEmpty('summary', operation, ctx);
    },
  };
};
