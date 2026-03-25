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
exports.MilvusIndex = void 0;
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 *@method createIndex - Creates an index.
 *@method dropIndex - Deletes an index.
 *@method describeIndex - Describes an index.
 *@method listIndexes - Lists all indexes.
 */
function MilvusIndex(Base) {
    return class extends Base {
        get indexPrefix() {
            return '/vectordb/indexes';
        }
        createIndex(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.indexPrefix}/create`;
                return this.POST(url, params, options);
            });
        }
        dropIndex(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.indexPrefix}/drop`;
                return this.POST(url, params, options);
            });
        }
        describeIndex(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.indexPrefix}/describe`;
                return this.POST(url, params, options);
            });
        }
        listIndexes(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.indexPrefix}/list`;
                return this.POST(url, params, options);
            });
        }
    };
}
exports.MilvusIndex = MilvusIndex;
//# sourceMappingURL=MilvusIndex.js.map