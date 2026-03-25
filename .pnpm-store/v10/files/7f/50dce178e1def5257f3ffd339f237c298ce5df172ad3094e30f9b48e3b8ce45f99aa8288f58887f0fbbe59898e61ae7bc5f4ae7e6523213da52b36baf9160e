import { CommandBase } from '../validation/commandBase.js';
export default class ClassificationsGetter extends CommandBase {
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
        this.validateId = () => {
            this.validateIsSet(this.id, 'id', '.withId(id)');
        };
        this.validate = () => {
            this.validateId();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/classifications/${this.id}`;
            return this.client.get(path);
        };
    }
}
