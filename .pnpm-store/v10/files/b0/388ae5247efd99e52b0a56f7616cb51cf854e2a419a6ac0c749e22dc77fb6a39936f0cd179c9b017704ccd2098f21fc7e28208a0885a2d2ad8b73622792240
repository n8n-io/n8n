"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var types_1 = tslib_1.__importDefault(require("./types"));
var path_visitor_1 = tslib_1.__importDefault(require("./path-visitor"));
var equiv_1 = tslib_1.__importDefault(require("./equiv"));
var path_1 = tslib_1.__importDefault(require("./path"));
var node_path_1 = tslib_1.__importDefault(require("./node-path"));
var shared_1 = require("./shared");
function default_1(plugins) {
    var fork = createFork();
    var types = fork.use(types_1.default);
    plugins.forEach(fork.use);
    types.finalize();
    var PathVisitor = fork.use(path_visitor_1.default);
    return {
        Type: types.Type,
        builtInTypes: types.builtInTypes,
        namedTypes: types.namedTypes,
        builders: types.builders,
        defineMethod: types.defineMethod,
        getFieldNames: types.getFieldNames,
        getFieldValue: types.getFieldValue,
        eachField: types.eachField,
        someField: types.someField,
        getSupertypeNames: types.getSupertypeNames,
        getBuilderName: types.getBuilderName,
        astNodesAreEquivalent: fork.use(equiv_1.default),
        finalize: types.finalize,
        Path: fork.use(path_1.default),
        NodePath: fork.use(node_path_1.default),
        PathVisitor: PathVisitor,
        use: fork.use,
        visit: PathVisitor.visit,
    };
}
exports.default = default_1;
;
function createFork() {
    var used = [];
    var usedResult = [];
    function use(plugin) {
        var idx = used.indexOf(plugin);
        if (idx === -1) {
            idx = used.length;
            used.push(plugin);
            usedResult[idx] = plugin(fork);
        }
        return usedResult[idx];
    }
    var fork = { use: use };
    return fork;
}
(0, shared_1.maybeSetModuleExports)(function () { return module; });
//# sourceMappingURL=fork.js.map