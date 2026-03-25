import { NearVectorInputGuards } from './utils.js';
const hybridVector = {
    nearText: () => { },
    nearVector: () => { },
};
const nearVector = {
    listOfVectors: (...vectors) => {
        return {
            kind: 'listOfVectors',
            dimensionality: NearVectorInputGuards.is1D(vectors[0]) ? '1D' : '2D',
            vectors,
        };
    },
};
export const queryFactory = {
    hybridVector,
    nearVector,
};
