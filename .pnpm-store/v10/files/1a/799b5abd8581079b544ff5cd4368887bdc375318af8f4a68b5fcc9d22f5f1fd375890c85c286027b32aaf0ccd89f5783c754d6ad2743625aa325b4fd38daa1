"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoCriteriaXpath = void 0;
const NoCriteriaXpath = () => {
    return {
        CriterionObject: {
            enter(criteria, { report, location }) {
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
exports.NoCriteriaXpath = NoCriteriaXpath;
