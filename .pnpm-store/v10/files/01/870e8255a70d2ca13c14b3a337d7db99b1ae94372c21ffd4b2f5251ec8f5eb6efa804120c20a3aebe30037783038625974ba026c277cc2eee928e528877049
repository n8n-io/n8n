"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryFactory = void 0;
const utils_js_1 = require("./utils.js");
const hybridVector = {
    nearText: () => { },
    nearVector: () => { },
};
const nearVector = {
    listOfVectors: (...vectors) => {
        return {
            kind: 'listOfVectors',
            dimensionality: utils_js_1.NearVectorInputGuards.is1D(vectors[0]) ? '1D' : '2D',
            vectors,
        };
    },
};
exports.queryFactory = {
    hybridVector,
    nearVector,
};
