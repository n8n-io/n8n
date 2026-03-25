"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class MetaGetter extends commandBase_js_1.CommandBase {
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
exports.default = MetaGetter;
