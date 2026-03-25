import StorageFileApi from './packages/StorageFileApi';
import StorageBucketApi from './packages/StorageBucketApi';
export class StorageClient extends StorageBucketApi {
    constructor(url, headers = {}, fetch) {
        super(url, headers, fetch);
    }
    /**
     * Perform file operation in a bucket.
     *
     * @param id The bucket id to operate on.
     */
    from(id) {
        return new StorageFileApi(this.url, this.headers, id, this.fetch);
    }
}
//# sourceMappingURL=StorageClient.js.map