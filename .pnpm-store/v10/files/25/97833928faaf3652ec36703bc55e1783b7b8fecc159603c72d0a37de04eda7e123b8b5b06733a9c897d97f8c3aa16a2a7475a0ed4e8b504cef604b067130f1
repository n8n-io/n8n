import StorageFileApi from './packages/StorageFileApi'
import StorageBucketApi from './packages/StorageBucketApi'
import { Fetch } from './lib/fetch'

export class StorageClient extends StorageBucketApi {
  constructor(url: string, headers: { [key: string]: string } = {}, fetch?: Fetch) {
    super(url, headers, fetch)
  }

  /**
   * Perform file operation in a bucket.
   *
   * @param id The bucket id to operate on.
   */
  from(id: string): StorageFileApi {
    return new StorageFileApi(this.url, this.headers, id, this.fetch)
  }
}
