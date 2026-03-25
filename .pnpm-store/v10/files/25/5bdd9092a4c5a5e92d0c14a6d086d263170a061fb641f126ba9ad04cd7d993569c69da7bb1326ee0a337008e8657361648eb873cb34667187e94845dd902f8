import { CommandBase } from '../validation/commandBase.js';
export default class MetaGetter extends CommandBase {
    constructor(client) {
        super(client);
        this.do = () => {
            return this.client.get('/meta', true);
        };
    }
    validate() {
        // nothing to validate
    }
}
