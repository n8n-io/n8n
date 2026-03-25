"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const dereference_js_1 = require("./dereference.js");
const validate_js_1 = require("./validate.js");
class Validator {
    schema;
    draft;
    shortCircuit;
    lookup;
    constructor(schema, draft = '2019-09', shortCircuit = true) {
        this.schema = schema;
        this.draft = draft;
        this.shortCircuit = shortCircuit;
        this.lookup = (0, dereference_js_1.dereference)(schema);
    }
    validate(instance) {
        return (0, validate_js_1.validate)(instance, this.schema, this.draft, this.lookup, this.shortCircuit);
    }
    addSchema(schema, id) {
        if (id) {
            schema = { ...schema, $id: id };
        }
        (0, dereference_js_1.dereference)(schema, this.lookup);
    }
}
exports.Validator = Validator;
