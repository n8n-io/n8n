"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterOut = void 0;
const filter_helper_1 = require("./filter-helper");
const DEFAULT_STRATEGY = 'any';
const FilterOut = ({ property, value, matchStrategy }) => {
    const strategy = matchStrategy || DEFAULT_STRATEGY;
    const filterOutCriteria = (item) => (0, filter_helper_1.checkIfMatchByStrategy)(item?.[property], value, strategy);
    return {
        any: {
            enter: (node, ctx) => {
                (0, filter_helper_1.filter)(node, ctx, filterOutCriteria);
            },
        },
    };
};
exports.FilterOut = FilterOut;
