"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceGuards = exports.Reference = exports.ReferenceManager = void 0;
const utils_js_1 = require("./utils.js");
class ReferenceManager {
    constructor(targetCollection, objects, uuids) {
        this.objects = objects !== null && objects !== void 0 ? objects : [];
        this.targetCollection = targetCollection;
        this.uuids = uuids;
    }
    toBeaconObjs() {
        return this.uuids ? this.uuids.map((uuid) => (0, utils_js_1.uuidToBeacon)(uuid, this.targetCollection)) : [];
    }
    toBeaconStrings() {
        return this.uuids ? this.uuids.map((uuid) => (0, utils_js_1.uuidToBeacon)(uuid, this.targetCollection).beacon) : [];
    }
    isMultiTarget() {
        return this.targetCollection !== '';
    }
}
exports.ReferenceManager = ReferenceManager;
/**
 * A factory class to create references from objects to other objects.
 */
class Reference {
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
exports.Reference = Reference;
class ReferenceGuards {
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
exports.ReferenceGuards = ReferenceGuards;
