import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const StepOnFailureUnique: Arazzo1Rule = () => {
  return {
    OnFailureActionList: {
      enter(onFailureActionList, { report, location }: UserContext) {
        if (!onFailureActionList) return;
        const seenFailureActions = new Set();

        for (const onFailureAction of onFailureActionList) {
          if (seenFailureActions.has(onFailureAction?.name)) {
            report({
              message: 'The action `name` must be unique amongst listed `onFailure` actions.',
              location: location.child([onFailureActionList.indexOf(onFailureAction)]),
            });
          }

          if (seenFailureActions.has(onFailureAction?.reference)) {
            report({
              message: 'The action `reference` must be unique amongst listed `onFailure` actions.',
              location: location.child([onFailureActionList.indexOf(onFailureAction)]),
            });
          }

          onFailureAction?.name
            ? seenFailureActions.add(onFailureAction.name)
            : seenFailureActions.add(onFailureAction.reference);
        }
      },
    },
  };
};
