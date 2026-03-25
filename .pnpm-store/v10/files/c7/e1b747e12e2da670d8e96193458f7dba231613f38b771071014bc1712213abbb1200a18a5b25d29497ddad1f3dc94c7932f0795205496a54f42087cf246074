import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class ClassExists extends CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.validate = () => {
            this.validateClassName();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/schema`;
            return this.client
                .get(path)
                .then((res) => (res.classes ? res.classes.some((c) => c.class === this.className) : false));
        };
    }
}
