"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemplateChild = generateTemplateChild;
exports.getVForNode = getVForNode;
exports.parseInterpolationNode = parseInterpolationNode;
const CompilerDOM = require("@vue/compiler-dom");
const common_1 = require("../common");
const element_1 = require("./element");
const interpolation_1 = require("./interpolation");
const slotOutlet_1 = require("./slotOutlet");
const vFor_1 = require("./vFor");
const vIf_1 = require("./vIf");
// @ts-ignore
const transformContext = {
    onError: () => { },
    helperString: str => str.toString(),
    replaceNode: () => { },
    cacheHandlers: false,
    prefixIdentifiers: false,
    scopes: {
        vFor: 0,
        vOnce: 0,
        vPre: 0,
        vSlot: 0,
    },
    expressionPlugins: ['typescript'],
};
function* generateTemplateChild(options, ctx, node, currentComponent, prevNode, componentCtxVar, isVForChild = false) {
    if (prevNode?.type === CompilerDOM.NodeTypes.COMMENT) {
        const commentText = prevNode.content.trim().split(' ')[0];
        if (commentText.match(/^@vue-skip\b[\s\S]*/)) {
            yield `// @vue-skip${common_1.newLine}`;
            return;
        }
        else if (commentText.match(/^@vue-ignore\b[\s\S]*/)) {
            yield* ctx.ignoreError();
        }
        else if (commentText.match(/^@vue-expect-error\b[\s\S]*/)) {
            yield* ctx.expectError(prevNode);
        }
    }
    const shouldInheritRootNodeAttrs = options.inheritAttrs;
    const cur = node;
    if (cur.codegenNode?.type === CompilerDOM.NodeTypes.JS_CACHE_EXPRESSION) {
        cur.codegenNode = cur.codegenNode.value;
    }
    if (node.type === CompilerDOM.NodeTypes.ROOT) {
        let prev;
        if (shouldInheritRootNodeAttrs && node.children.length === 1 && node.children[0].type === CompilerDOM.NodeTypes.ELEMENT) {
            ctx.singleRootNode = node.children[0];
        }
        for (const childNode of node.children) {
            yield* generateTemplateChild(options, ctx, childNode, currentComponent, prev, componentCtxVar);
            prev = childNode;
        }
        yield* ctx.resetDirectiveComments('end of root');
    }
    else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
        const vForNode = getVForNode(node);
        const vIfNode = getVIfNode(node);
        if (vForNode) {
            yield* (0, vFor_1.generateVFor)(options, ctx, vForNode, currentComponent, componentCtxVar);
        }
        else if (vIfNode) {
            yield* (0, vIf_1.generateVIf)(options, ctx, vIfNode, currentComponent, componentCtxVar);
        }
        else {
            if (node.tagType === CompilerDOM.ElementTypes.SLOT) {
                yield* (0, slotOutlet_1.generateSlotOutlet)(options, ctx, node, currentComponent, componentCtxVar);
            }
            else if (node.tagType === CompilerDOM.ElementTypes.ELEMENT
                || node.tagType === CompilerDOM.ElementTypes.TEMPLATE) {
                yield* (0, element_1.generateElement)(options, ctx, node, currentComponent, componentCtxVar, isVForChild);
            }
            else {
                yield* (0, element_1.generateComponent)(options, ctx, node, currentComponent);
            }
        }
    }
    else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
        // {{ var }}
        yield* generateTemplateChild(options, ctx, node.content, currentComponent, undefined, componentCtxVar);
    }
    else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
        // {{ ... }} {{ ... }}
        for (const childNode of node.children) {
            if (typeof childNode === 'object') {
                yield* generateTemplateChild(options, ctx, childNode, currentComponent, undefined, componentCtxVar);
            }
        }
    }
    else if (node.type === CompilerDOM.NodeTypes.INTERPOLATION) {
        // {{ ... }}
        const [content, start] = parseInterpolationNode(node, options.template.content);
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, content, node.content.loc, start, ctx.codeFeatures.all, `(`, `)${common_1.endOfLine}`);
        yield* ctx.resetDirectiveComments('end of INTERPOLATION');
    }
    else if (node.type === CompilerDOM.NodeTypes.IF) {
        // v-if / v-else-if / v-else
        yield* (0, vIf_1.generateVIf)(options, ctx, node, currentComponent, componentCtxVar);
    }
    else if (node.type === CompilerDOM.NodeTypes.FOR) {
        // v-for
        yield* (0, vFor_1.generateVFor)(options, ctx, node, currentComponent, componentCtxVar);
    }
    else if (node.type === CompilerDOM.NodeTypes.TEXT) {
        // not needed progress
    }
}
// TODO: track https://github.com/vuejs/vue-next/issues/3498
function getVForNode(node) {
    const forDirective = node.props.find((prop) => prop.type === CompilerDOM.NodeTypes.DIRECTIVE
        && prop.name === 'for');
    if (forDirective) {
        let forNode;
        CompilerDOM.processFor(node, forDirective, transformContext, _forNode => {
            forNode = { ..._forNode };
            return undefined;
        });
        if (forNode) {
            forNode.children = [{
                    ...node,
                    props: node.props.filter(prop => prop !== forDirective),
                }];
            return forNode;
        }
    }
}
function getVIfNode(node) {
    const forDirective = node.props.find((prop) => prop.type === CompilerDOM.NodeTypes.DIRECTIVE
        && prop.name === 'if');
    if (forDirective) {
        let ifNode;
        CompilerDOM.processIf(node, forDirective, transformContext, _ifNode => {
            ifNode = { ..._ifNode };
            return undefined;
        });
        if (ifNode) {
            for (const branch of ifNode.branches) {
                branch.children = [{
                        ...node,
                        props: node.props.filter(prop => prop !== forDirective),
                    }];
            }
            return ifNode;
        }
    }
}
function parseInterpolationNode(node, template) {
    let content = node.content.loc.source;
    let start = node.content.loc.start.offset;
    let leftCharacter;
    let rightCharacter;
    // fix https://github.com/vuejs/language-tools/issues/1787
    while ((leftCharacter = template.substring(start - 1, start)).trim() === '' && leftCharacter.length) {
        start--;
        content = leftCharacter + content;
    }
    while ((rightCharacter = template.substring(start + content.length, start + content.length + 1)).trim() === '' && rightCharacter.length) {
        content = content + rightCharacter;
    }
    return [
        content,
        start,
    ];
}
//# sourceMappingURL=templateChild.js.map