"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mapping_entry_1 = require("../mapping-entry");
var path_1 = require("path");
describe("mapping-entry", function () {
    it("should change to absolute paths and sort in longest prefix order", function () {
        var result = (0, mapping_entry_1.getAbsoluteMappingEntries)("/absolute/base/url", {
            "*": ["/foo1", "./foo2"],
            "longest/pre/fix/*": ["./foo2/bar"],
            "pre/fix/*": ["/foo3"],
        }, true);
        expect(result).toEqual([
            {
                pattern: "longest/pre/fix/*",
                paths: [(0, path_1.join)("/absolute", "base", "url", "foo2", "bar")],
            },
            {
                pattern: "pre/fix/*",
                paths: [(0, path_1.join)("/foo3")],
            },
            {
                pattern: "*",
                paths: [(0, path_1.join)("/foo1"), (0, path_1.join)("/absolute", "base", "url", "foo2")],
            },
        ]);
    });
    it("should should add a match-all pattern when requested", function () {
        var result = (0, mapping_entry_1.getAbsoluteMappingEntries)("/absolute/base/url", {}, true);
        expect(result).toEqual([
            {
                pattern: "*",
                paths: [(0, path_1.join)("/absolute", "base", "url", "*")],
            },
        ]);
        result = (0, mapping_entry_1.getAbsoluteMappingEntries)("/absolute/base/url", {}, false);
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=mapping-entry.test.js.map