"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class NodesStatusGetter extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withOutput = (output) => {
            this.output = output;
            return this;
        };
        this.do = () => {
            let path = '/nodes';
            if (this.className) {
                path = `${path}/${this.className}`;
            }
            if (this.output) {
                path = `${path}?output=${this.output}`;
            }
            else {
                path = `${path}?output=verbose`;
            }
            return this.client.get(path);
        };
    }
    validate() {
        // nothing to validate
    }
}
exports.default = NodesStatusGetter;
