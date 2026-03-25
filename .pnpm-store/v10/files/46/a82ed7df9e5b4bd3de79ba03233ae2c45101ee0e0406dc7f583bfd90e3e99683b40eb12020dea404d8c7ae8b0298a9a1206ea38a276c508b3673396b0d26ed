'use strict';
var type_1 = require("../type");
var ast = require("../yamlAST");
var _hasOwnProperty = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
    if (null === data) {
        return true;
    }
    if (data.kind != ast.Kind.MAP) {
        return false;
    }
    return true;
}
function constructYamlSet(data) {
    return null !== data ? data : {};
}
module.exports = new type_1.Type('tag:yaml.org,2002:set', {
    kind: 'mapping',
    resolve: resolveYamlSet,
    construct: constructYamlSet
});
//# sourceMappingURL=set.js.map