import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const NoCriteriaXpath: Arazzo1Rule = () => {
  return {
    CriterionObject: {
      enter(criteria, { report, location }: UserContext) {
        if (!criteria.type) {
          return;
        }
        if (criteria?.type?.type === 'xpath' || criteria?.type === 'xpath') {
          report({
            message: 'The `xpath` type criteria is not supported by Spot.',
            location: location.child(['type']),
          });
        }
      },
    },
  };
};
