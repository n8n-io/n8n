"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepOnFailureUnique = void 0;
const StepOnFailureUnique = () => {
    return {
        OnFailureActionList: {
            enter(onFailureActionList, { report, location }) {
                if (!onFailureActionList)
                    return;
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
exports.StepOnFailureUnique = StepOnFailureUnique;
