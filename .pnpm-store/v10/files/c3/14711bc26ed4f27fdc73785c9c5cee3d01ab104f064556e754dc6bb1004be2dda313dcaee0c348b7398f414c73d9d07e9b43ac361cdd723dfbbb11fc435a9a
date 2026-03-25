import { BeaconPath } from '../utils/beaconPath.js';
import Checker from './checker.js';
import Creator from './creator.js';
import Deleter from './deleter.js';
import Getter from './getter.js';
import GetterById from './getterById.js';
import Merger from './merger.js';
import { ObjectsPath, ReferencesPath } from './path.js';
import ReferenceCreator from './referenceCreator.js';
import ReferenceDeleter from './referenceDeleter.js';
import ReferencePayloadBuilder from './referencePayloadBuilder.js';
import ReferenceReplacer from './referenceReplacer.js';
import Updater from './updater.js';
import Validator from './validator.js';
const data = (client, dbVersionSupport) => {
    const objectsPath = new ObjectsPath(dbVersionSupport);
    const referencesPath = new ReferencesPath(dbVersionSupport);
    const beaconPath = new BeaconPath(dbVersionSupport);
    return {
        creator: () => new Creator(client, objectsPath),
        validator: () => new Validator(client),
        updater: () => new Updater(client, objectsPath),
        merger: () => new Merger(client, objectsPath),
        getter: () => new Getter(client, objectsPath),
        getterById: () => new GetterById(client, objectsPath),
        deleter: () => new Deleter(client, objectsPath),
        checker: () => new Checker(client, objectsPath),
        referenceCreator: () => new ReferenceCreator(client, referencesPath, beaconPath),
        referenceReplacer: () => new ReferenceReplacer(client, referencesPath, beaconPath),
        referenceDeleter: () => new ReferenceDeleter(client, referencesPath, beaconPath),
        referencePayloadBuilder: () => new ReferencePayloadBuilder(client),
    };
};
export default data;
export { default as Checker } from './checker.js';
export { default as Creator } from './creator.js';
export { default as Deleter } from './deleter.js';
export { default as Getter } from './getter.js';
export { default as GetterById } from './getterById.js';
export { default as Merger } from './merger.js';
export { default as ReferenceCreator } from './referenceCreator.js';
export { default as ReferenceDeleter } from './referenceDeleter.js';
export { default as ReferencePayloadBuilder } from './referencePayloadBuilder.js';
export { default as ReferenceReplacer } from './referenceReplacer.js';
export { default as Updater } from './updater.js';
export { default as Validator } from './validator.js';
