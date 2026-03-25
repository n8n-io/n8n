var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { WeaviateDeserializationError } from '../../errors.js';
const ITERATOR_CACHE_SIZE = 100;
export class Iterator {
    constructor(query) {
        this.query = query;
        this.cache = [];
        this.last = undefined;
        this.query = query;
    }
    [Symbol.asyncIterator]() {
        return {
            next: () => __awaiter(this, void 0, void 0, function* () {
                const objects = yield this.query(ITERATOR_CACHE_SIZE, this.last);
                this.cache = objects;
                if (this.cache.length == 0) {
                    return {
                        done: true,
                        value: undefined,
                    };
                }
                const obj = this.cache.shift();
                if (obj === undefined) {
                    throw new WeaviateDeserializationError('Object iterator returned an object that is undefined');
                }
                this.last = obj === null || obj === void 0 ? void 0 : obj.uuid;
                if (this.last === undefined) {
                    throw new WeaviateDeserializationError('Object iterator returned an object without a UUID');
                }
                return {
                    done: false,
                    value: obj,
                };
            }),
        };
    }
}
