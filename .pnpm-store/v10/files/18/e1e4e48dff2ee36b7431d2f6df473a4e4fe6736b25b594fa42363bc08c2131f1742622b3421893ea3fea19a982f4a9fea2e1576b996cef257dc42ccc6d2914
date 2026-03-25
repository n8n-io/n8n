(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.fastUniqueNumbers = {}));
})(this, (function (exports) { 'use strict';

    var createAddUniqueNumber = function createAddUniqueNumber(generateUniqueNumber) {
      return function (set) {
        var number = generateUniqueNumber(set);
        set.add(number);
        return number;
      };
    };

    var createCache = function createCache(lastNumberWeakMap) {
      return function (collection, nextNumber) {
        lastNumberWeakMap.set(collection, nextNumber);
        return nextNumber;
      };
    };

    /*
     * The value of the constant Number.MAX_SAFE_INTEGER equals (2 ** 53 - 1) but it
     * is fairly new.
     */
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER === undefined ? 9007199254740991 : Number.MAX_SAFE_INTEGER;
    var TWO_TO_THE_POWER_OF_TWENTY_NINE = 536870912;
    var TWO_TO_THE_POWER_OF_THIRTY = TWO_TO_THE_POWER_OF_TWENTY_NINE * 2;
    var createGenerateUniqueNumber = function createGenerateUniqueNumber(cache, lastNumberWeakMap) {
      return function (collection) {
        var lastNumber = lastNumberWeakMap.get(collection);
        /*
         * Let's try the cheapest algorithm first. It might fail to produce a new
         * number, but it is so cheap that it is okay to take the risk. Just
         * increase the last number by one or reset it to 0 if we reached the upper
         * bound of SMIs (which stands for small integers). When the last number is
         * unknown it is assumed that the collection contains zero based consecutive
         * numbers.
         */
        var nextNumber = lastNumber === undefined ? collection.size : lastNumber < TWO_TO_THE_POWER_OF_THIRTY ? lastNumber + 1 : 0;
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

    var LAST_NUMBER_WEAK_MAP = new WeakMap();
    var cache = createCache(LAST_NUMBER_WEAK_MAP);
    var generateUniqueNumber = createGenerateUniqueNumber(cache, LAST_NUMBER_WEAK_MAP);
    var addUniqueNumber = createAddUniqueNumber(generateUniqueNumber);

    exports.addUniqueNumber = addUniqueNumber;
    exports.generateUniqueNumber = generateUniqueNumber;

}));
