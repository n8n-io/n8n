"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = getContext;
exports.setSchemaValidator = setSchemaValidator;
exports.setDOMParserOptions = setDOMParserOptions;
var xmldom_1 = require("@xmldom/xmldom");
var context = {
    validate: undefined,
    dom: new xmldom_1.DOMParser()
};
function getContext() {
    return context;
}
function setSchemaValidator(params) {
    if (typeof params.validate !== 'function') {
        throw new Error('validate must be a callback function having one argument as xml input');
    }
    // assign the validate function to the context
    context.validate = params.validate;
}
function setDOMParserOptions(options) {
    if (options === void 0) { options = {}; }
    context.dom = new xmldom_1.DOMParser(options);
}
//# sourceMappingURL=api.js.map