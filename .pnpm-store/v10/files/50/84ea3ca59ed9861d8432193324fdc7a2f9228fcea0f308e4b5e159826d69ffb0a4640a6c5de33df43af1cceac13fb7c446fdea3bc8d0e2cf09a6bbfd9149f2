"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementChildren = generateElementChildren;
const CompilerDOM = require("@vue/compiler-dom");
const utils_1 = require("../utils");
const templateChild_1 = require("./templateChild");
function* generateElementChildren(options, ctx, node) {
    yield* ctx.resetDirectiveComments('end of element children start');
    let prev;
    for (const childNode of node.children) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, childNode, prev);
        prev = childNode;
    }
    yield* ctx.generateAutoImportCompletion();
    // fix https://github.com/vuejs/language-tools/issues/932
    if (ctx.currentComponent
        && !ctx.hasSlotElements.has(node)
        && node.children.length
        && node.tagType !== CompilerDOM.ElementTypes.ELEMENT
        && node.tagType !== CompilerDOM.ElementTypes.TEMPLATE) {
        ctx.currentComponent.used = true;
        yield `${ctx.currentComponent.ctxVar}.slots!.`;
        yield* (0, utils_1.wrapWith)(node.children[0].loc.start.offset, node.children[node.children.length - 1].loc.end.offset, ctx.codeFeatures.navigation, `default`);
        yield utils_1.endOfLine;
    }
}
//# sourceMappingURL=elementChildren.js.map