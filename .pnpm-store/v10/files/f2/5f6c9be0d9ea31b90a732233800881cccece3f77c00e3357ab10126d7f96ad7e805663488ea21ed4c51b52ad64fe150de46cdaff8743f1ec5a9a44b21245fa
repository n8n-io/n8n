"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referenceToBeacons = exports.referenceFromObjects = exports.uuidToBeacon = void 0;
const classes_js_1 = require("./classes.js");
function uuidToBeacon(uuid, targetCollection) {
    return {
        beacon: `weaviate://localhost/${targetCollection ? `${targetCollection}/` : ''}${uuid}`,
    };
}
exports.uuidToBeacon = uuidToBeacon;
const referenceFromObjects = (objects, targetCollection, uuids) => {
    return new classes_js_1.ReferenceManager(targetCollection, objects, uuids);
};
exports.referenceFromObjects = referenceFromObjects;
const referenceToBeacons = (ref) => {
    if (classes_js_1.ReferenceGuards.isReferenceManager(ref)) {
        return ref.toBeaconObjs();
    }
    else if (classes_js_1.ReferenceGuards.isUuid(ref)) {
        return [uuidToBeacon(ref)];
    }
    else if (classes_js_1.ReferenceGuards.isUuids(ref)) {
        return ref.map((uuid) => uuidToBeacon(uuid));
    }
    else if (classes_js_1.ReferenceGuards.isMultiTarget(ref)) {
        return typeof ref.uuids === 'string'
            ? [uuidToBeacon(ref.uuids, ref.targetCollection)]
            : ref.uuids.map((uuid) => uuidToBeacon(uuid, ref.targetCollection));
    }
    return [];
};
exports.referenceToBeacons = referenceToBeacons;
