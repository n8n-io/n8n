import { CommandBase } from '../validation/commandBase.js';
export default class RawGraphQL extends CommandBase {
    constructor(client) {
        super(client);
        this.withQuery = (query) => {
            this.query = query;
            return this;
        };
        this.validateIsSet = (prop, name, setter) => {
            if (prop == undefined || prop == null || prop.length == 0) {
                this.addError(`${name} must be set - set with ${setter}`);
            }
        };
        this.validate = () => {
            this.validateIsSet(this.query, 'query', '.raw().withQuery(query)');
        };
        this.do = () => {
            const params = '';
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            if (this.query) {
                return this.client.query(this.query);
            }
            return Promise.resolve(undefined);
        };
    }
}
