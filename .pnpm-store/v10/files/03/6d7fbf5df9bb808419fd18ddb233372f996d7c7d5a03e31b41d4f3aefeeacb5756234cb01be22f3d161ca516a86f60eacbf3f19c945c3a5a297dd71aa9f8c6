import { TCacheFactory } from '../types';

export const createCache: TCacheFactory = (lastNumberWeakMap) => {
    return (collection, nextNumber) => {
        lastNumberWeakMap.set(collection, nextNumber);

        return nextNumber;
    };
};
