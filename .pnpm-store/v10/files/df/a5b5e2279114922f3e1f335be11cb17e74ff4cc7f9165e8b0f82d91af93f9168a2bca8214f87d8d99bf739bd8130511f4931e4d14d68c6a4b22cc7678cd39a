import { checkIfMatchByStrategy, filter } from './filter-helper';

import type { Oas2Decorator, Oas3Decorator } from '../../../visitors';

const DEFAULT_STRATEGY = 'any';

export const FilterOut: Oas3Decorator | Oas2Decorator = ({ property, value, matchStrategy }) => {
  const strategy = matchStrategy || DEFAULT_STRATEGY;
  const filterOutCriteria = (item: any) =>
    checkIfMatchByStrategy(item?.[property], value, strategy);

  return {
    any: {
      enter: (node, ctx) => {
        filter(node, ctx, filterOutCriteria);
      },
    },
  };
};
