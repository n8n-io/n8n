"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementChildren = generateElementChildren;
const templateChild_1 = require("./templateChild");
function* generateElementChildren(options, ctx, node) {
    yield* ctx.resetDirectiveComments('end of element children start');
    let prev;
    for (const childNode of node.children) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, childNode, prev);
        prev = childNode;
    }
    yield* ctx.generateAutoImportCompletion();
}
//# sourceMappingURL=elementChildren.js.map