"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class SchemaGetter extends commandBase_js_1.CommandBase {
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
exports.default = SchemaGetter;
