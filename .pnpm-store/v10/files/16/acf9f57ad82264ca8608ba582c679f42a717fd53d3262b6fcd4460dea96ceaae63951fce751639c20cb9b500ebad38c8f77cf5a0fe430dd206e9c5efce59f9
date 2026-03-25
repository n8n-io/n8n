import { TAddUniqueNumberFactory } from '../types';

export const createAddUniqueNumber: TAddUniqueNumberFactory = (generateUniqueNumber) => {
    return (set) => {
        const number = generateUniqueNumber(set);

        set.add(number);

        return number;
    };
};
