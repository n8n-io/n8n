"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("../lib/util");
function getBabelOptions(options) {
    // The goal here is to tolerate as much syntax as possible, since Recast
    // is not in the business of forbidding anything. If you want your
    // parser to be more restrictive for some reason, you can always pass
    // your own parser object to recast.parse.
    return {
        sourceType: (0, util_1.getOption)(options, "sourceType", "module"),
        strictMode: (0, util_1.getOption)(options, "strictMode", false),
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        startLine: 1,
        tokens: true,
        plugins: [
            "asyncGenerators",
            "bigInt",
            "classPrivateMethods",
            "classPrivateProperties",
            "classProperties",
            "classStaticBlock",
            "decimal",
            "decorators-legacy",
            "doExpressions",
            "dynamicImport",
            "exportDefaultFrom",
            "exportExtensions",
            "exportNamespaceFrom",
            "functionBind",
            "functionSent",
            "importAssertions",
            "importMeta",
            "nullishCoalescingOperator",
            "numericSeparator",
            "objectRestSpread",
            "optionalCatchBinding",
            "optionalChaining",
            [
                "pipelineOperator",
                {
                    proposal: "minimal",
                },
            ],
            [
                "recordAndTuple",
                {
                    syntaxType: "hash",
                },
            ],
            "throwExpressions",
            "topLevelAwait",
            "v8intrinsic",
        ],
    };
}
exports.default = getBabelOptions;
