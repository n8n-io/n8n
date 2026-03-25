import { createAddUniqueNumber } from './factories/add-unique-number';
import { createCache } from './factories/cache';
import { createGenerateUniqueNumber } from './factories/generate-unique-number';
/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './types/index';
const LAST_NUMBER_WEAK_MAP = new WeakMap();
const cache = createCache(LAST_NUMBER_WEAK_MAP);
const generateUniqueNumber = createGenerateUniqueNumber(cache, LAST_NUMBER_WEAK_MAP);
const addUniqueNumber = createAddUniqueNumber(generateUniqueNumber);
export { addUniqueNumber, generateUniqueNumber };
//# sourceMappingURL=module.js.map