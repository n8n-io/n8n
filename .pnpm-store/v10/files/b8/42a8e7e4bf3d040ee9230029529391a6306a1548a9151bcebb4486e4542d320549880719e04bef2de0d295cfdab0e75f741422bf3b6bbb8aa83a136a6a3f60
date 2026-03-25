"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementChildren = generateElementChildren;
const CompilerDOM = require("@vue/compiler-dom");
const common_1 = require("../common");
const templateChild_1 = require("./templateChild");
function* generateElementChildren(options, ctx, node, currentComponent, componentCtxVar) {
    yield* ctx.resetDirectiveComments('end of element children start');
    let prev;
    for (const childNode of node.children) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, childNode, currentComponent, prev, componentCtxVar);
        prev = childNode;
    }
    yield* ctx.generateAutoImportCompletion();
    // fix https://github.com/vuejs/language-tools/issues/932
    if (componentCtxVar
        && !ctx.hasSlotElements.has(node)
        && node.children.length
        && node.tagType !== CompilerDOM.ElementTypes.ELEMENT
        && node.tagType !== CompilerDOM.ElementTypes.TEMPLATE) {
        ctx.usedComponentCtxVars.add(componentCtxVar);
        yield `__VLS_nonNullable(${componentCtxVar}.slots).`;
        yield* (0, common_1.wrapWith)(node.children[0].loc.start.offset, node.children[node.children.length - 1].loc.end.offset, ctx.codeFeatures.navigation, `default`);
        yield common_1.endOfLine;
    }
}
//# sourceMappingURL=elementChildren.js.map