"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
const path_js_1 = require("./path.js");
class ReferencesBatcher extends commandBase_js_1.CommandBase {
    constructor(client, beaconPath) {
        super(client);
        this.withConsistencyLevel = (cl) => {
            this.consistencyLevel = cl;
            return this;
        };
        this.payload = () => this.references;
        this.validateReferenceCount = () => {
            if (this.references.length == 0) {
                this.addError('need at least one reference to send a request, add one with .withReference(obj)');
            }
        };
        this.validate = () => {
            this.validateReferenceCount();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const params = new URLSearchParams();
            if (this.consistencyLevel) {
                params.set('consistency_level', this.consistencyLevel);
            }
            const path = (0, path_js_1.buildRefsPath)(params);
            const payloadPromise = Promise.all(this.references.map((ref) => this.rebuildReferencePromise(ref)));
            return payloadPromise.then((payload) => this.client.postReturn(path, payload));
        };
        this.rebuildReferencePromise = (reference) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.beaconPath.rebuild(reference.to).then((beaconTo) => ({
                from: reference.from,
                to: beaconTo,
                tenant: reference.tenant,
            }));
        };
        this.beaconPath = beaconPath;
        this.references = [];
    }
    /**
     * can be called as:
     *  - withReferences(...[ref1, ref2, ref3])
     *  - withReferences(ref1, ref2, ref3)
     *  - withReferences(ref1)
     * @param  {...BatchReference[]} references
     */
    withReferences(...references) {
        let refs = references;
        if (references.length && Array.isArray(references[0])) {
            refs = references[0];
        }
        this.references = [...this.references, ...refs];
        return this;
    }
    withReference(reference) {
        return this.withReferences(reference);
    }
}
exports.default = ReferencesBatcher;
