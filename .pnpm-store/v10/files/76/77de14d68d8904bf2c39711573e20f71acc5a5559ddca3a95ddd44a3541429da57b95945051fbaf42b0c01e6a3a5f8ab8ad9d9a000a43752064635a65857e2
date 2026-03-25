import { TGenerateUniqueNumberFactory } from '../types';

/*
 * The value of the constant Number.MAX_SAFE_INTEGER equals (2 ** 53 - 1) but it
 * is fairly new.
 */
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER === undefined ? 9007199254740991 : Number.MAX_SAFE_INTEGER;
const TWO_TO_THE_POWER_OF_TWENTY_NINE = 536870912;
const TWO_TO_THE_POWER_OF_THIRTY = TWO_TO_THE_POWER_OF_TWENTY_NINE * 2;

export const createGenerateUniqueNumber: TGenerateUniqueNumberFactory = (cache, lastNumberWeakMap) => {
    return (collection) => {
        const lastNumber = lastNumberWeakMap.get(collection);

        /*
         * Let's try the cheapest algorithm first. It might fail to produce a new
         * number, but it is so cheap that it is okay to take the risk. Just
         * increase the last number by one or reset it to 0 if we reached the upper
         * bound of SMIs (which stands for small integers). When the last number is
         * unknown it is assumed that the collection contains zero based consecutive
         * numbers.
         */
        let nextNumber = lastNumber === undefined ? collection.size : lastNumber < TWO_TO_THE_POWER_OF_THIRTY ? lastNumber + 1 : 0;

        if (!collection.has(nextNumber)) {
            return cache(collection, nextNumber);
        }

        /*
         * If there are less than half of 2 ** 30 numbers stored in the collection,
         * the chance to generate a new random number in the range from 0 to 2 ** 30
         * is at least 50%. It's benifitial to use only SMIs because they perform
         * much better in any environment based on V8.
         */
        if (collection.size < TWO_TO_THE_POWER_OF_TWENTY_NINE) {
            while (collection.has(nextNumber)) {
                nextNumber = Math.floor(Math.random() * TWO_TO_THE_POWER_OF_THIRTY);
            }

            return cache(collection, nextNumber);
        }

        // Quickly check if there is a theoretical chance to generate a new number.
        if (collection.size > MAX_SAFE_INTEGER) {
            throw new Error('Congratulations, you created a collection of unique numbers which uses all available integers!');
        }

        // Otherwise use the full scale of safely usable integers.
        while (collection.has(nextNumber)) {
            nextNumber = Math.floor(Math.random() * MAX_SAFE_INTEGER);
        }

        return cache(collection, nextNumber);
    };
};
