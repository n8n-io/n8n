"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    return {
        sum: (targetVectors) => {
            return { combination: 'sum', targetVectors };
        },
        average: (targetVectors) => {
            return { combination: 'average', targetVectors };
        },
        minimum: (targetVectors) => {
            return { combination: 'minimum', targetVectors };
        },
        relativeScore: (weights) => {
            return {
                combination: 'relative-score',
                targetVectors: Object.keys(weights),
                weights,
            };
        },
        manualWeights: (weights) => {
            return {
                combination: 'manual-weights',
                targetVectors: Object.keys(weights),
                weights,
            };
        },
    };
};
