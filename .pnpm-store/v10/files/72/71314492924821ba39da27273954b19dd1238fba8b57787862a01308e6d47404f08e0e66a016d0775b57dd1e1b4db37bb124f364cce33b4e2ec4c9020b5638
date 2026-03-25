import { CommandBase } from '../validation/commandBase.js';
export default class ReadyChecker extends CommandBase {
    constructor(client, dbVersionProvider) {
        super(client);
        this.do = () => {
            return this.client
                .get('/.well-known/ready', false)
                .then(() => {
                setTimeout(() => this.dbVersionProvider.refresh());
                return Promise.resolve(true);
            })
                .catch(() => Promise.resolve(false));
        };
        this.dbVersionProvider = dbVersionProvider;
    }
    validate() {
        // nothing to validate
    }
}
