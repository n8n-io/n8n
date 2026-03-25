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
exports.Collection = void 0;
const const_1 = require("../const");
/**
 * Collection is a mixin function that extends the functionality of a base class.
 * It provides methods to interact with collections in a Milvus cluster.
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method createCollection - Creates a new collection in Milvus.
 * @method describeCollection - Retrieves the description of a specific collection.
 * @method dropCollection - Deletes a specific collection from Milvus.
 * @method listCollections - Lists all collections in the Milvus cluster.
 * @method hasCollection - Checks if a collection exists in the Milvus cluster.
 * @method renameCollection - Renames a collection in the Milvus cluster.
 * @method getCollectionStatistics - Retrieves statistics about a collection.
 * @method loadCollection - Loads a collection into memory.
 * @method releaseCollection - Releases a collection from memory.
 * @method getCollectionLoadState - Retrieves the load state of a collection.
 */
function Collection(Base) {
    return class extends Base {
        get collectionPrefix() {
            return '/vectordb/collections';
        }
        // POST create collection
        createCollection(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/create`;
                // if some keys not provided, using default value
                data.metricType = data.metricType || const_1.DEFAULT_METRIC_TYPE;
                data.primaryFieldName =
                    data.primaryFieldName || const_1.DEFAULT_PRIMARY_KEY_FIELD;
                data.vectorFieldName = data.vectorFieldName || const_1.DEFAULT_VECTOR_FIELD;
                return yield this.POST(url, data, options);
            });
        }
        // GET describe collection
        describeCollection(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/describe`;
                return yield this.POST(url, params, options);
            });
        }
        // POST drop collection
        dropCollection(data, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/drop`;
                return yield this.POST(url, data, options);
            });
        }
        // GET list collections
        listCollections(params = { dbName: const_1.DEFAULT_DB }, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/list`;
                return yield this.POST(url, params, options);
            });
        }
        hasCollection(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/has`;
                return yield this.POST(url, params, options);
            });
        }
        renameCollection(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/rename`;
                return yield this.POST(url, params, options);
            });
        }
        getCollectionStatistics(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/get_stats`;
                return yield this.POST(url, params, options);
            });
        }
        loadCollection(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/load`;
                return yield this.POST(url, params, options);
            });
        }
        releaseCollection(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/release`;
                return yield this.POST(url, params, options);
            });
        }
        getCollectionLoadState(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.collectionPrefix}/get_load_state`;
                return yield this.POST(url, params, options);
            });
        }
    };
}
exports.Collection = Collection;
//# sourceMappingURL=Collection.js.map