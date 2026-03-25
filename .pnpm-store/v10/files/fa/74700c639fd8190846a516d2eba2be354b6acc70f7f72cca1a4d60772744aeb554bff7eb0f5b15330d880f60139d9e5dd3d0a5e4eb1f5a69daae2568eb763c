import { validateDefinedAndNonEmpty } from '../utils';

import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { UserContext } from '../../walk';
import type { Oas2Operation } from '../../typings/swagger';
import type { Oas3Operation } from '../../typings/openapi';

export const OperationOperationId: Oas3Rule | Oas2Rule = () => {
  return {
    Root: {
      PathItem: {
        Operation(operation: Oas2Operation | Oas3Operation, ctx: UserContext) {
          validateDefinedAndNonEmpty('operationId', operation, ctx);
        },
      },
    },
  };
};
