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
exports.Partition = void 0;
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listPartitions - Lists all partitions in a collection.
 * @method createPartition - Creates a new partition in a collection.
 * @method dropPartition - Deletes a partition from a collection.
 * @method loadPartitions - Loads partitions into memory.
 * @method releasePartitions - Releases partitions from memory.
 * @method hasPartition - Checks if a partition exists in a collection.
 * @method getPartitionStatistics - Retrieves statistics about a partition.
 */
function Partition(Base) {
    return class extends Base {
        get partitionPrefix() {
            return '/vectordb/partitions';
        }
        listPartitions(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/list`;
                return yield this.POST(url, params, options);
            });
        }
        createPartition(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/create`;
                return yield this.POST(url, params, options);
            });
        }
        dropPartition(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/drop`;
                return yield this.POST(url, params, options);
            });
        }
        loadPartitions(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/load`;
                return yield this.POST(url, params, options);
            });
        }
        releasePartitions(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/release`;
                return yield this.POST(url, params, options);
            });
        }
        hasPartition(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/has`;
                return yield this.POST(url, params, options);
            });
        }
        getPartitionStatistics(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.partitionPrefix}/get_stats`;
                return yield this.POST(url, params, options);
            });
        }
    };
}
exports.Partition = Partition;
//# sourceMappingURL=Partition.js.map