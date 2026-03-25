"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class RawGraphQL extends commandBase_js_1.CommandBase {
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
exports.default = RawGraphQL;
