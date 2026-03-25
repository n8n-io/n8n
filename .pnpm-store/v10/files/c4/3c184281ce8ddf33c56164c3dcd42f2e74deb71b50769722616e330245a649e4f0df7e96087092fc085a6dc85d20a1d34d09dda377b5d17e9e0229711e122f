import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const CriteriaUnique: Arazzo1Rule = () => {
  return {
    FailureActionObject: {
      enter(action, { report, location }: UserContext) {
        const criterias = action?.criteria;
        if (!Array.isArray(criterias)) {
          return;
        }
        const seen = new Set<string>();
        for (const criteria of criterias) {
          const key = JSON.stringify(criteria);
          if (seen.has(key)) {
            report({
              message: 'The FailureAction criteria items must be unique.',
              location: location.child(['criteria', criterias.indexOf(criteria)]),
            });
          } else {
            seen.add(key);
          }
        }
      },
    },
    SuccessActionObject: {
      enter(action, { report, location }: UserContext) {
        const criterias = action?.criteria;
        if (!Array.isArray(criterias)) {
          return;
        }
        const seen = new Set<string>();
        for (const criteria of criterias) {
          const key = JSON.stringify(criteria);
          if (seen.has(key)) {
            report({
              message: 'The SuccessAction criteria items must be unique.',
              location: location.child(['criteria', criterias.indexOf(criteria)]),
            });
          } else {
            seen.add(key);
          }
        }
      },
    },
    Step: {
      enter(step, { report, location }: UserContext) {
        const successCriterias = step?.successCriteria;

        if (!Array.isArray(successCriterias)) {
          return;
        }

        const seen = new Set<string>();

        for (const criteria of successCriterias) {
          const key = JSON.stringify(criteria);
          if (seen.has(key)) {
            report({
              message: 'The Step SuccessCriteria items must be unique.',
              location: location.child(['successCriteria', successCriterias.indexOf(criteria)]),
            });
          } else {
            seen.add(key);
          }
        }
      },
    },
  };
};
