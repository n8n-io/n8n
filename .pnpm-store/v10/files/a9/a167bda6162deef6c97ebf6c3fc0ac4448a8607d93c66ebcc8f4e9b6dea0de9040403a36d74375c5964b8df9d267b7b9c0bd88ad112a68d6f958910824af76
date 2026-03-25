"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterIn = void 0;
const filter_helper_1 = require("./filter-helper");
const DEFAULT_STRATEGY = 'any';
const FilterIn = ({ property, value, matchStrategy }) => {
    const strategy = matchStrategy || DEFAULT_STRATEGY;
    const filterInCriteria = (item) => item?.[property] && !(0, filter_helper_1.checkIfMatchByStrategy)(item?.[property], value, strategy);
    return {
        any: {
            enter: (node, ctx) => {
                (0, filter_helper_1.filter)(node, ctx, filterInCriteria);
            },
        },
    };
};
exports.FilterIn = FilterIn;
