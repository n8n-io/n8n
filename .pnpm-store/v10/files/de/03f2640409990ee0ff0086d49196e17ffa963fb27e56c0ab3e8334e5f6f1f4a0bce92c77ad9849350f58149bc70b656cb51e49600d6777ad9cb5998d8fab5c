import { uuidToBeacon } from './utils.js';
export class ReferenceManager {
    constructor(targetCollection, objects, uuids) {
        this.objects = objects !== null && objects !== void 0 ? objects : [];
        this.targetCollection = targetCollection;
        this.uuids = uuids;
    }
    toBeaconObjs() {
        return this.uuids ? this.uuids.map((uuid) => uuidToBeacon(uuid, this.targetCollection)) : [];
    }
    toBeaconStrings() {
        return this.uuids ? this.uuids.map((uuid) => uuidToBeacon(uuid, this.targetCollection).beacon) : [];
    }
    isMultiTarget() {
        return this.targetCollection !== '';
    }
}
/**
 * A factory class to create references from objects to other objects.
 */
export class Reference {
    /**
     * Create a single-target reference with given UUID(s).
     *
     * @param {string | string[]} uuids The UUID(s) of the target object(s).
     * @returns {ReferenceManager} The reference manager object.
     */
    static to(uuids) {
        return new ReferenceManager('', undefined, Array.isArray(uuids) ? uuids : [uuids]);
    }
    /**
     * Create a multi-target reference with given UUID(s) pointing to a specific target collection.
     *
     * @param {string | string[]} uuids The UUID(s) of the target object(s).
     * @param {string} targetCollection The target collection name.
     * @returns {ReferenceManager} The reference manager object.
     */
    static toMultiTarget(uuids, targetCollection) {
        return new ReferenceManager(targetCollection, undefined, Array.isArray(uuids) ? uuids : [uuids]);
    }
}
export class ReferenceGuards {
    static isReferenceManager(arg) {
        return arg instanceof ReferenceManager;
    }
    static isUuid(arg) {
        return typeof arg === 'string';
    }
    static isUuids(arg) {
        return Array.isArray(arg);
    }
    static isMultiTarget(arg) {
        return arg.targetCollection !== undefined;
    }
}
