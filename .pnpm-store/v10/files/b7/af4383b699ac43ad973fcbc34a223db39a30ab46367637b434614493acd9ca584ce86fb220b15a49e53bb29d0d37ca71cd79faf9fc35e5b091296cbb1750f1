import { CommandBase } from '../validation/commandBase.js';
export default class ClassUpdater extends CommandBase {
    constructor(client) {
        super(client);
        this.withClass = (classObj) => {
            this.class = classObj;
            return this;
        };
        this.validateClass = () => {
            if (this.class == undefined || this.class == null) {
                this.addError('class object must be set - set with .withClass(class)');
            }
        };
        this.do = () => {
            this.validateClass();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/schema/${this.class.class}`;
            return this.client.put(path, this.class, false);
        };
    }
    validate() {
        this.validateClass();
    }
}
