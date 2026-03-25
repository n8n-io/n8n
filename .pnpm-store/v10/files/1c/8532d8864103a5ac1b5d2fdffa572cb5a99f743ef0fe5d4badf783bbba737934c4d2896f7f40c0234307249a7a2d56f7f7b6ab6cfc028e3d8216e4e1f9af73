import { ReferenceGuards, ReferenceManager } from './classes.js';
export function uuidToBeacon(uuid, targetCollection) {
    return {
        beacon: `weaviate://localhost/${targetCollection ? `${targetCollection}/` : ''}${uuid}`,
    };
}
export const referenceFromObjects = (objects, targetCollection, uuids) => {
    return new ReferenceManager(targetCollection, objects, uuids);
};
export const referenceToBeacons = (ref) => {
    if (ReferenceGuards.isReferenceManager(ref)) {
        return ref.toBeaconObjs();
    }
    else if (ReferenceGuards.isUuid(ref)) {
        return [uuidToBeacon(ref)];
    }
    else if (ReferenceGuards.isUuids(ref)) {
        return ref.map((uuid) => uuidToBeacon(uuid));
    }
    else if (ReferenceGuards.isMultiTarget(ref)) {
        return typeof ref.uuids === 'string'
            ? [uuidToBeacon(ref.uuids, ref.targetCollection)]
            : ref.uuids.map((uuid) => uuidToBeacon(uuid, ref.targetCollection));
    }
    return [];
};
