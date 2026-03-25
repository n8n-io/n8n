"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Kind;
(function (Kind) {
    Kind[Kind["SCALAR"] = 0] = "SCALAR";
    Kind[Kind["MAPPING"] = 1] = "MAPPING";
    Kind[Kind["MAP"] = 2] = "MAP";
    Kind[Kind["SEQ"] = 3] = "SEQ";
    Kind[Kind["ANCHOR_REF"] = 4] = "ANCHOR_REF";
    Kind[Kind["INCLUDE_REF"] = 5] = "INCLUDE_REF";
})(Kind = exports.Kind || (exports.Kind = {}));
function newMapping(key, value) {
    var end = (value ? value.endPosition : key.endPosition + 1);
    var node = {
        key: key,
        value: value,
        startPosition: key.startPosition,
        endPosition: end,
        kind: Kind.MAPPING,
        parent: null,
        errors: []
    };
    return node;
}
exports.newMapping = newMapping;
function newAnchorRef(key, start, end, value) {
    return {
        errors: [],
        referencesAnchor: key,
        value: value,
        startPosition: start,
        endPosition: end,
        kind: Kind.ANCHOR_REF,
        parent: null
    };
}
exports.newAnchorRef = newAnchorRef;
function newScalar(v) {
    if (v === void 0) { v = ""; }
    var result = {
        errors: [],
        startPosition: -1,
        endPosition: -1,
        value: "" + v,
        kind: Kind.SCALAR,
        parent: null,
        doubleQuoted: false,
        rawValue: "" + v,
    };
    if (typeof v !== "string") {
        result.valueObject = v;
    }
    return result;
}
exports.newScalar = newScalar;
function newItems() {
    return {
        errors: [],
        startPosition: -1,
        endPosition: -1,
        items: [],
        kind: Kind.SEQ,
        parent: null
    };
}
exports.newItems = newItems;
function newSeq() {
    return newItems();
}
exports.newSeq = newSeq;
function newMap(mappings) {
    return {
        errors: [],
        startPosition: -1,
        endPosition: -1,
        mappings: mappings ? mappings : [],
        kind: Kind.MAP,
        parent: null
    };
}
exports.newMap = newMap;
//# sourceMappingURL=yamlAST.js.map