"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vector = void 0;
/**
 * Vector is a mixin function that extends the functionality of a base class.
 * It provides methods to interact with vectors in a Milvus cluster.
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for vector management.
 *
 * @method get - Retrieves a specific vector from Milvus.
 * @method insert - Inserts a new vector into Milvus.
 * @method upsert - Inserts a new vector into Milvus, or updates it if it already exists.
 * @method query - Queries for vectors in Milvus.
 * @method search - Searches for vectors in Milvus.
 * @method delete - Deletes a specific vector from Milvus.
 */
function Vector(Base) {
    return class extends Base {
        get vectorPrefix() {
            return '/vectordb/entities';
        }
        // GET get data
        get(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/get`;
                return yield this.POST(url, params, options);
            });
        }
        // POST insert data
        insert(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/insert`;
                return yield this.POST(url, data, options);
            });
        }
        // POST insert data
        upsert(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/upsert`;
                return yield this.POST(url, data, options);
            });
        }
        // POST query data
        query(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/query`;
                return yield this.POST(url, data, options);
            });
        }
        // POST search data
        search(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/search`;
                return yield this.POST(url, data, options);
            });
        }
        hybridSearch(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/hybrid_search`;
                return yield this.POST(url, data, options);
            });
        }
        // POST delete collection
        delete(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.vectorPrefix}/delete`;
                return yield this.POST(url, data, options);
            });
        }
    };
}
exports.Vector = Vector;
//# sourceMappingURL=Vector.js.map