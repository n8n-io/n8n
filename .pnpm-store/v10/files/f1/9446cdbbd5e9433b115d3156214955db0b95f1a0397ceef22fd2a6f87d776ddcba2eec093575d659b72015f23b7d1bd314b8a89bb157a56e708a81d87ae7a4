import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class PropertyCreator extends CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withProperty = (property) => {
            this.property = property;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.validateProperty = () => {
            if (this.property == undefined || this.property == null) {
                this.addError('property must be set - set with .withProperty(property)');
            }
        };
        this.validate = () => {
            this.validateClassName();
            this.validateProperty();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/schema/${this.className}/properties`;
            return this.client.postReturn(path, this.property);
        };
    }
}
