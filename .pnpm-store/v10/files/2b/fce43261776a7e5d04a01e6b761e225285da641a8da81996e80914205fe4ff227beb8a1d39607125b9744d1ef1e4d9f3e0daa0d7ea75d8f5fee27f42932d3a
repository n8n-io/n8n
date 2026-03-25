"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var YAML = require("../src/");
var visitor_1 = require("./visitor");
var chai = require("chai");
var assert = chai.assert;
function structure(node) {
    return new DuplicateStructureBuilder().accept(node);
}
suite('Loading a single document', function () {
    test('should work with document-end delimiters', function () {
        var input = "---\nwhatever: true\n...";
        var doc = YAML.safeLoad(input);
        var expected_structure = YAML.newMap([YAML.newMapping(YAML.newScalar('whatever'), YAML.newScalar('true'))]);
        assert.deepEqual(structure(doc), expected_structure);
        assert.lengthOf(doc.errors, 0, "Found error(s): " + doc.errors.toString() + " when expecting none.");
    });
    test('Document end position should be equal to input length', function () {
        var input = "\nouter:\ninner:\n    ";
        var doc1 = YAML.load(input);
        assert.deepEqual(doc1.endPosition, input.length);
    });
});
suite('Loading multiple documents', function () {
    test('should work with document-end delimiters', function () {
        var docs = [];
        YAML.loadAll("---\nwhatever: true\n...\n---\nwhatever: false\n...", function (d) { return docs.push(d); });
        var expected_structure = [
            YAML.newMap([YAML.newMapping(YAML.newScalar('whatever'), YAML.newScalar('true'))]),
            YAML.newMap([YAML.newMapping(YAML.newScalar('whatever'), YAML.newScalar('false'))])
        ];
        assert.deepEqual(docs.map(function (d) { return structure(d); }), expected_structure);
        docs.forEach(function (doc) {
            return assert.lengthOf(doc.errors, 0, "Found error(s): " + doc.errors.toString() + " when expecting none.");
        });
    });
    test('Last document end position should be equal to input length', function () {
        var input = "\nouter1:\ninner1:\n...\n---\nouter2:\ninner2:\n    ";
        var documents = [];
        YAML.loadAll(input, function (x) { return documents.push(x); });
        var doc2 = documents[1];
        assert.deepEqual(doc2.endPosition, input.length);
    });
});
var DuplicateStructureBuilder = (function (_super) {
    __extends(DuplicateStructureBuilder, _super);
    function DuplicateStructureBuilder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DuplicateStructureBuilder.prototype.visitScalar = function (node) {
        return YAML.newScalar(node.value);
    };
    DuplicateStructureBuilder.prototype.visitMapping = function (node) {
        return YAML.newMapping(this.visitScalar(node.key), this.accept(node.value));
    };
    DuplicateStructureBuilder.prototype.visitSequence = function (node) {
        var _this = this;
        var seq = YAML.newSeq();
        seq.items = node.items.map(function (n) { return _this.accept(n); });
        return seq;
    };
    DuplicateStructureBuilder.prototype.visitMap = function (node) {
        var _this = this;
        return YAML.newMap(node.mappings.map(function (n) { return _this.accept(n); }));
    };
    DuplicateStructureBuilder.prototype.visitAnchorRef = function (node) {
        throw new Error("Method not implemented.");
    };
    DuplicateStructureBuilder.prototype.visitIncludeRef = function (node) {
        throw new Error("Method not implemented.");
    };
    return DuplicateStructureBuilder;
}(visitor_1.AbstractVisitor));
//# sourceMappingURL=loader.test.js.map