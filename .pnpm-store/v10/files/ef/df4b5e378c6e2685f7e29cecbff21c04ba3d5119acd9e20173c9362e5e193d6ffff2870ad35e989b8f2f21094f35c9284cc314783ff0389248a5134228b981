import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class Merger extends CommandBase {
    constructor(client, objectsPath) {
        super(client);
        this.withProperties = (properties) => {
            this.properties = properties;
            return this;
        };
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withId = (id) => {
            this.id = id;
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
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with withClassName(className)');
            }
        };
        this.validateId = () => {
            if (this.id == undefined || this.id == null || this.id.length == 0) {
                this.addError('id must be set - set with withId(id)');
            }
        };
        this.payload = () => ({
            tenant: this.tenant,
            properties: this.properties,
            class: this.className,
            id: this.id,
        });
        this.validate = () => {
            this.validateClassName();
            this.validateId();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            return this.objectsPath
                .buildMerge(this.id, this.className, this.consistencyLevel)
                .then((path) => this.client.patch(path, this.payload()));
        };
        this.objectsPath = objectsPath;
    }
}
