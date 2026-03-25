"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class ReadyChecker extends commandBase_js_1.CommandBase {
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
exports.default = ReadyChecker;
