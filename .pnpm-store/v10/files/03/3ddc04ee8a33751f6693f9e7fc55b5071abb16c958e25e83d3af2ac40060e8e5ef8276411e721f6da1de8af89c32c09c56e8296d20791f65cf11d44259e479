'use strict';
var type_1 = require("../../type");
function resolveJavascriptRegExp(data) {
    if (null === data) {
        return false;
    }
    if (0 === data.length) {
        return false;
    }
    var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = '';
    if ('/' === regexp[0]) {
        if (tail) {
            modifiers = tail[1];
        }
        if (modifiers.length > 3) {
            return false;
        }
        if (regexp[regexp.length - modifiers.length - 1] !== '/') {
            return false;
        }
        regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
    }
    try {
        var dummy = new RegExp(regexp, modifiers);
        return true;
    }
    catch (error) {
        return false;
    }
}
function constructJavascriptRegExp(data) {
    var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = '';
    if ('/' === regexp[0]) {
        if (tail) {
            modifiers = tail[1];
        }
        regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
    }
    return new RegExp(regexp, modifiers);
}
function representJavascriptRegExp(object) {
    var result = '/' + object.source + '/';
    if (object.global) {
        result += 'g';
    }
    if (object.multiline) {
        result += 'm';
    }
    if (object.ignoreCase) {
        result += 'i';
    }
    return result;
}
function isRegExp(object) {
    return '[object RegExp]' === Object.prototype.toString.call(object);
}
module.exports = new type_1.Type('tag:yaml.org,2002:js/regexp', {
    kind: 'scalar',
    resolve: resolveJavascriptRegExp,
    construct: constructJavascriptRegExp,
    predicate: isRegExp,
    represent: representJavascriptRegExp
});
//# sourceMappingURL=regexp.js.map