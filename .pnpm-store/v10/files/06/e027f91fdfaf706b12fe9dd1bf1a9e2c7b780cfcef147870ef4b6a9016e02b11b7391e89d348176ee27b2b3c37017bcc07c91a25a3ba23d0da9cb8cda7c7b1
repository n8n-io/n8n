import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class ReferencePayloadBuilder extends CommandBase {
    constructor(client) {
        super(client);
        this.withId = (id) => {
            this.id = id;
            return this;
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            this.validateIsSet(this.id, 'id', '.withId(id)');
        };
        this.payload = () => {
            this.validate();
            if (this.errors.length > 0) {
                throw new Error(this.errors.join(', '));
            }
            let beacon = `weaviate://localhost`;
            if (isValidStringProperty(this.className)) {
                beacon = `${beacon}/${this.className}`;
            }
            return {
                beacon: `${beacon}/${this.id}`,
            };
        };
    }
    withClassName(className) {
        this.className = className;
        return this;
    }
    do() {
        return Promise.reject(new Error('Should never be called'));
    }
}
