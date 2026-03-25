import { CommandBase } from '../validation/commandBase.js';
export default class SchemaGetter extends CommandBase {
    constructor(client) {
        super(client);
        this.do = () => {
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            const path = `/schema`;
            return this.client.get(path);
        };
    }
    validate() {
        // nothing to validate
    }
}
