'use strict';
var type_1 = require("../../type");
function resolveJavascriptUndefined() {
    return true;
}
function constructJavascriptUndefined() {
    return undefined;
}
function representJavascriptUndefined() {
    return '';
}
function isUndefined(object) {
    return 'undefined' === typeof object;
}
module.exports = new type_1.Type('tag:yaml.org,2002:js/undefined', {
    kind: 'scalar',
    resolve: resolveJavascriptUndefined,
    construct: constructJavascriptUndefined,
    predicate: isUndefined,
    represent: representJavascriptUndefined
});
//# sourceMappingURL=undefined.js.map