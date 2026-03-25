import { CommandBase } from '../validation/commandBase.js';
export default class Checker extends CommandBase {
    constructor(client, objectsPath) {
        super(client);
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.withConsistencyLevel = (consistencyLevel) => {
            this.consistencyLevel = consistencyLevel;
            return this;
        };
        this.buildPath = () => {
            return this.objectsPath.buildCheck(this.id, this.className, this.consistencyLevel, this.tenant);
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validateId = () => {
            this.validateIsSet(this.id, 'id', '.withId(id)');
        };
        this.validate = () => {
            this.validateId();
        };
        this.do = () => {
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            this.validate();
            return this.buildPath().then((path) => this.client.head(path, undefined));
        };
        this.objectsPath = objectsPath;
    }
}
