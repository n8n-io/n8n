import { CommandBase } from '../validation/commandBase.js';
export default class ReferenceDeleter extends CommandBase {
    constructor(client, referencesPath, beaconPath) {
        super(client);
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.withReference = (ref) => {
            this.reference = ref;
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
        this.payload = () => this.reference;
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            if (!this.reference.beacon) {
                throw new Error('reference beacon must be set');
            }
            return Promise.all([
                this.referencesPath.build(this.id, this.className, this.refProp, this.consistencyLevel, this.tenant),
                this.beaconPath.rebuild(this.reference.beacon),
            ]).then((results) => {
                const path = results[0];
                const beacon = results[1];
                return this.client.delete(path, { beacon }, false);
            });
        };
        this.referencesPath = referencesPath;
        this.beaconPath = beaconPath;
    }
    withClassName(className) {
        this.className = className;
        return this;
    }
}
