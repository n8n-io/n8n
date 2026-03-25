import { BaseStore } from "@langchain/core/stores";
import { Serializable } from "@langchain/core/load/serializable";

//#region src/experimental/utils/media_core.d.ts
type MediaBlobData = {
  value: string;
  type: string;
};
interface MediaBlobParameters {
  data?: MediaBlobData;
  metadata?: Record<string, unknown>;
  path?: string;
}
/**
 * Represents a chunk of data that can be identified by the path where the
 * data is (or will be) located, along with optional metadata about the data.
 */
declare class MediaBlob extends Serializable implements MediaBlobParameters {
  lc_serializable: boolean;
  lc_namespace: string[];
  data: MediaBlobData;
  metadata?: Record<string, any>;
  path?: string;
  constructor(params: MediaBlobParameters);
  get size(): number;
  get dataType(): string;
  get encoding(): string;
  get mimetype(): string;
  get asBytes(): Uint8Array;
  asString(): Promise<string>;
  asBase64(): Promise<string>;
  asDataUrl(): Promise<string>;
  asUri(): Promise<string>;
  encode(): Promise<{
    encoded: string;
    encoding: string;
  }>;
  static fromDataUrl(url: string): MediaBlob;
  static fromBlob(blob: Blob, other?: Omit<MediaBlobParameters, "data">): Promise<MediaBlob>;
}
type ActionIfInvalidAction = "ignore" | "prefixPath" | "prefixUuid1" | "prefixUuid4" | "prefixUuid6" | "prefixUuid7" | "removePath";
interface BlobStoreStoreOptions {
  /**
   * If the path is missing or invalid in the blob, how should we create
   * a new path?
   * Subclasses may define their own methods, but the following are supported
   * by default:
   * - Undefined or an emtpy string: Reject the blob
   * - "ignore": Attempt to store it anyway (but this may fail)
   * - "prefixPath": Use the default prefix for the BlobStore and get the
   *   unique portion from the URL. The original path is stored in the metadata
   * - "prefixUuid": Use the default prefix for the BlobStore and get the
   *   unique portion from a generated UUID. The original path is stored
   *   in the metadata
   */
  actionIfInvalid?: ActionIfInvalidAction;
  /**
   * The expected prefix for URIs that are stored.
   * This may be used to test if a MediaBlob is valid and used to create a new
   * path if "prefixPath" or "prefixUuid" is set for actionIfInvalid.
   */
  pathPrefix?: string;
}
type ActionIfBlobMissingAction = "emptyBlob";
interface BlobStoreFetchOptions {
  /**
   * If the blob is not found when fetching, what should we do?
   * Subclasses may define their own methods, but the following are supported
   * by default:
   * - Undefined or an empty string: return undefined
   * - "emptyBlob": return a new MediaBlob that has the path set, but nothing else.
   */
  actionIfBlobMissing?: ActionIfBlobMissingAction;
}
interface BlobStoreOptions {
  defaultStoreOptions?: BlobStoreStoreOptions;
  defaultFetchOptions?: BlobStoreFetchOptions;
}
/**
 * A specialized Store that is designed to handle MediaBlobs and use the
 * key that is included in the blob to determine exactly how it is stored.
 *
 * The full details of a MediaBlob may be changed when it is stored.
 * For example, it may get additional or different Metadata. This should be
 * what is returned when the store() method is called.
 *
 * Although BlobStore extends BaseStore, not all of the methods from
 * BaseStore may be implemented (or even possible). Those that are not
 * implemented should be documented and throw an Error if called.
 */
declare abstract class BlobStore extends BaseStore<string, MediaBlob> {
  lc_namespace: string[];
  defaultStoreOptions: BlobStoreStoreOptions;
  defaultFetchOptions: BlobStoreFetchOptions;
  constructor(opts?: BlobStoreOptions);
  protected _realKey(key: string | MediaBlob): Promise<string>;
  /**
   * Is the path supported by this BlobStore?
   *
   * Although this is async, this is expected to be a relatively fast operation
   * (ie - you shouldn't make network calls).
   *
   * @param path The path to check
   * @param opts Any options (if needed) that may be used to determine if it is valid
   * @return If the path is supported
   */
  hasValidPath(path: string | undefined, opts?: BlobStoreStoreOptions): Promise<boolean>;
  protected _blobPathSuffix(blob: MediaBlob): string;
  protected _newBlob(oldBlob: MediaBlob, newPath?: string): Promise<MediaBlob>;
  protected _validBlobPrefixPath(blob: MediaBlob, opts?: BlobStoreStoreOptions): Promise<MediaBlob>;
  protected _validBlobPrefixUuidFunction(name: ActionIfInvalidAction | string): string;
  protected _validBlobPrefixUuid(blob: MediaBlob, opts?: BlobStoreStoreOptions): Promise<MediaBlob>;
  protected _validBlobRemovePath(blob: MediaBlob, _opts?: BlobStoreStoreOptions): Promise<MediaBlob>;
  /**
   * Based on the blob and options, return a blob that has a valid path
   * that can be saved.
   * @param blob
   * @param opts
   */
  protected _validStoreBlob(blob: MediaBlob, opts?: BlobStoreStoreOptions): Promise<MediaBlob | undefined>;
  store(blob: MediaBlob, opts?: BlobStoreStoreOptions): Promise<MediaBlob | undefined>;
  protected _missingFetchBlobEmpty(path: string, _opts?: BlobStoreFetchOptions): Promise<MediaBlob>;
  protected _missingFetchBlob(path: string, opts?: BlobStoreFetchOptions): Promise<MediaBlob | undefined>;
  fetch(key: string | MediaBlob, opts?: BlobStoreFetchOptions): Promise<MediaBlob | undefined>;
}
interface BackedBlobStoreOptions extends BlobStoreOptions {
  backingStore: BaseStore<string, MediaBlob>;
}
declare class BackedBlobStore extends BlobStore {
  backingStore: BaseStore<string, MediaBlob>;
  constructor(opts: BackedBlobStoreOptions);
  mdelete(keys: string[]): Promise<void>;
  mget(keys: string[]): Promise<(MediaBlob | undefined)[]>;
  mset(keyValuePairs: [string, MediaBlob][]): Promise<void>;
  yieldKeys(prefix: string | undefined): AsyncGenerator<string>;
}
interface ReadThroughBlobStoreOptions extends BlobStoreOptions {
  baseStore: BlobStore;
  backingStore: BlobStore;
}
declare class ReadThroughBlobStore extends BlobStore {
  baseStore: BlobStore;
  backingStore: BlobStore;
  constructor(opts: ReadThroughBlobStoreOptions);
  store(blob: MediaBlob, opts?: BlobStoreStoreOptions): Promise<MediaBlob | undefined>;
  mdelete(keys: string[]): Promise<void>;
  mget(keys: string[]): Promise<(MediaBlob | undefined)[]>;
  mset(_keyValuePairs: [string, MediaBlob][]): Promise<void>;
  yieldKeys(prefix: string | undefined): AsyncGenerator<string>;
}
declare class SimpleWebBlobStore extends BlobStore {
  _notImplementedException(): void;
  hasValidPath(path: string | undefined, _opts?: BlobStoreStoreOptions): Promise<boolean>;
  _fetch(url: string): Promise<MediaBlob | undefined>;
  mget(keys: string[]): Promise<(MediaBlob | undefined)[]>;
  mdelete(_keys: string[]): Promise<void>;
  mset(_keyValuePairs: [string, MediaBlob][]): Promise<void>;
  yieldKeys(_prefix: string | undefined): AsyncGenerator<string>;
}
/**
 * A blob "store" that works with data: URLs that will turn the URL into
 * a blob.
 */
declare class DataBlobStore extends BlobStore {
  _notImplementedException(): void;
  hasValidPath(path: string, _opts?: BlobStoreStoreOptions): Promise<boolean>;
  _fetch(url: string): MediaBlob;
  mget(keys: string[]): Promise<(MediaBlob | undefined)[]>;
  mdelete(_keys: string[]): Promise<void>;
  mset(_keyValuePairs: [string, MediaBlob][]): Promise<void>;
  yieldKeys(_prefix: string | undefined): AsyncGenerator<string>;
}
interface MediaManagerConfiguration {
  /**
   * A store that, given a common URI, returns the corresponding MediaBlob.
   * The returned MediaBlob may have a different URI.
   * In many cases, this will be a ReadThroughStore or something similar
   * that has a cached version of the MediaBlob, but also a way to get
   * a new (or refreshed) version.
   */
  store: BlobStore;
  /**
   * BlobStores that can resolve a URL into the MediaBlob to save
   * in the canonical store. This list is evaluated in order.
   * If not provided, a default list (which involves a DataBlobStore
   * and a SimpleWebBlobStore) will be used.
   */
  resolvers?: BlobStore[];
}
/**
 * Responsible for converting a URI (typically a web URL) into a MediaBlob.
 * Allows for aliasing / caching of the requested URI and what it resolves to.
 * This MediaBlob is expected to be usable to provide to an LLM, either
 * through the Base64 of the media or through a canonical URI that the LLM
 * supports.
 */
declare class MediaManager {
  store: BlobStore;
  resolvers: BlobStore[] | undefined;
  constructor(config: MediaManagerConfiguration);
  defaultResolvers(): BlobStore[];
  _isInvalid(blob: MediaBlob | undefined): Promise<boolean>;
  /**
   * Given the public URI, load what is at this URI and save it
   * in the store.
   * @param uri The URI to resolve using the resolver
   * @return A canonical MediaBlob for this URI
   */
  _resolveAndSave(uri: string): Promise<MediaBlob | undefined>;
  getMediaBlob(uri: string): Promise<MediaBlob | undefined>;
}
//#endregion
export { ActionIfBlobMissingAction, ActionIfInvalidAction, BackedBlobStore, BackedBlobStoreOptions, BlobStore, BlobStoreFetchOptions, BlobStoreOptions, BlobStoreStoreOptions, DataBlobStore, MediaBlob, MediaBlobData, MediaBlobParameters, MediaManager, MediaManagerConfiguration, ReadThroughBlobStore, ReadThroughBlobStoreOptions, SimpleWebBlobStore };
//# sourceMappingURL=media_core.d.cts.map