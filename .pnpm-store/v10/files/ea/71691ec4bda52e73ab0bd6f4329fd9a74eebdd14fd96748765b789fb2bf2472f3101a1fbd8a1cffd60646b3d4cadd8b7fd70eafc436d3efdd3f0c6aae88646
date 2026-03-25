import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class Validator extends CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withProperties = (properties) => {
            this.properties = properties;
            return this;
        };
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.payload = () => ({
            properties: this.properties,
            class: this.className,
            id: this.id,
        });
        this.validate = () => {
            this.validateClassName();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/objects/validate`;
            return this.client.postEmpty(path, this.payload()).then(() => true);
        };
    }
}
