"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class ReferenceReplacer extends commandBase_js_1.CommandBase {
    constructor(client, referencesPath, beaconPath) {
        super(client);
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.withReferences = (refs) => {
            this.references = refs;
            return this;
        };
        this.withReferenceProperty = (refProp) => {
            this.refProp = refProp;
            return this;
        };
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            this.validateIsSet(this.id, 'id', '.withId(id)');
            this.validateIsSet(this.refProp, 'referenceProperty', '.withReferenceProperty(refProp)');
        };
        this.payload = () => this.references;
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const payloadPromise = Array.isArray(this.references)
                ? Promise.all(this.references.map((ref) => this.rebuildReferencePromise(ref)))
                : Promise.resolve([]);
            return Promise.all([
                this.referencesPath.build(this.id, this.className, this.refProp, this.consistencyLevel, this.tenant),
                payloadPromise,
            ]).then((results) => {
                const path = results[0];
                const payload = results[1];
                return this.client.put(path, payload, false);
            });
        };
        this.beaconPath = beaconPath;
        this.referencesPath = referencesPath;
    }
    withClassName(className) {
        this.className = className;
        return this;
    }
    rebuildReferencePromise(reference) {
        return this.beaconPath.rebuild(reference.beacon).then((beacon) => ({ beacon }));
    }
}
exports.default = ReferenceReplacer;
