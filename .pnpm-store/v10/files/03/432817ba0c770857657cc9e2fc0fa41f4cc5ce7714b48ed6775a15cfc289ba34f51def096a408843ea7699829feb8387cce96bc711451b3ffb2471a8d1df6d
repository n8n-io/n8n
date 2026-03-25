import { BeaconPath } from '../utils/beaconPath.js';
import ObjectsBatchDeleter from './objectsBatchDeleter.js';
import ObjectsBatcher from './objectsBatcher.js';
import ReferencePayloadBuilder from './referencePayloadBuilder.js';
import ReferencesBatcher from './referencesBatcher.js';
const batch = (client, dbVersionSupport) => {
    const beaconPath = new BeaconPath(dbVersionSupport);
    return {
        objectsBatcher: () => new ObjectsBatcher(client),
        objectsBatchDeleter: () => new ObjectsBatchDeleter(client),
        referencesBatcher: () => new ReferencesBatcher(client, beaconPath),
        referencePayloadBuilder: () => new ReferencePayloadBuilder(client),
    };
};
export default batch;
export { default as ObjectsBatchDeleter } from './objectsBatchDeleter.js';
export { default as ObjectsBatcher } from './objectsBatcher.js';
export { default as ReferencesBatcher } from './referencesBatcher.js';
