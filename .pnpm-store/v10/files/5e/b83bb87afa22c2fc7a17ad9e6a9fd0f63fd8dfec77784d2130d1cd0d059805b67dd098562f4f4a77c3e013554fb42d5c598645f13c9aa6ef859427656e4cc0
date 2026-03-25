import Connection from '../connection/index.js';
import { DbVersionSupport } from '../utils/dbVersion.js';
import ObjectsBatchDeleter from './objectsBatchDeleter.js';
import ObjectsBatcher from './objectsBatcher.js';
import ReferencePayloadBuilder from './referencePayloadBuilder.js';
import ReferencesBatcher from './referencesBatcher.js';
export type DeleteOutput = 'verbose' | 'minimal';
export type DeleteResultStatus = 'SUCCESS' | 'FAILED' | 'DRYRUN';
export interface Batch {
    objectsBatcher: () => ObjectsBatcher;
    objectsBatchDeleter: () => ObjectsBatchDeleter;
    referencesBatcher: () => ReferencesBatcher;
    referencePayloadBuilder: () => ReferencePayloadBuilder;
}
declare const batch: (client: Connection, dbVersionSupport: DbVersionSupport) => Batch;
export default batch;
export { default as ObjectsBatchDeleter } from './objectsBatchDeleter.js';
export { default as ObjectsBatcher } from './objectsBatcher.js';
export { default as ReferencesBatcher } from './referencesBatcher.js';
