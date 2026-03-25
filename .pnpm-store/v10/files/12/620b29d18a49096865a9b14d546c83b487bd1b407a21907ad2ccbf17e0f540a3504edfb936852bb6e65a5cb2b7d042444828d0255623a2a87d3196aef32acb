'use strict';
var esprima = require("esprima");
var type_1 = require("../../type");
function resolveJavascriptFunction(data) {
    if (null === data) {
        return false;
    }
    try {
        var source = '(' + data + ')', ast = esprima.parse(source, { range: true }), params = [], body;
        if ('Program' !== ast.type ||
            1 !== ast.body.length ||
            'ExpressionStatement' !== ast.body[0].type ||
            'FunctionExpression' !== ast.body[0]['expression'].type) {
            return false;
        }
        return true;
    }
    catch (err) {
        return false;
    }
}
function constructJavascriptFunction(data) {
    var source = '(' + data + ')', ast = esprima.parse(source, { range: true }), params = [], body;
    if ('Program' !== ast.type ||
        1 !== ast.body.length ||
        'ExpressionStatement' !== ast.body[0].type ||
        'FunctionExpression' !== ast.body[0]['expression'].type) {
        throw new Error('Failed to resolve function');
    }
    ast.body[0]['expression'].params.forEach(function (param) {
        params.push(param.name);
    });
    body = ast.body[0]['expression'].body.range;
    return new Function(params, source.slice(body[0] + 1, body[1] - 1));
}
function representJavascriptFunction(object) {
    return object.toString();
}
function isFunction(object) {
    return '[object Function]' === Object.prototype.toString.call(object);
}
module.exports = new type_1.Type('tag:yaml.org,2002:js/function', {
    kind: 'scalar',
    resolve: resolveJavascriptFunction,
    construct: constructJavascriptFunction,
    predicate: isFunction,
    represent: representJavascriptFunction
});
//# sourceMappingURL=function.js.map