"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageClient = void 0;
const StorageFileApi_1 = __importDefault(require("./packages/StorageFileApi"));
const StorageBucketApi_1 = __importDefault(require("./packages/StorageBucketApi"));
class StorageClient extends StorageBucketApi_1.default {
    constructor(url, headers = {}, fetch) {
        super(url, headers, fetch);
    }
    /**
     * Perform file operation in a bucket.
     *
     * @param id The bucket id to operate on.
     */
    from(id) {
        return new StorageFileApi_1.default(this.url, this.headers, id, this.fetch);
    }
}
exports.StorageClient = StorageClient;
//# sourceMappingURL=StorageClient.js.map