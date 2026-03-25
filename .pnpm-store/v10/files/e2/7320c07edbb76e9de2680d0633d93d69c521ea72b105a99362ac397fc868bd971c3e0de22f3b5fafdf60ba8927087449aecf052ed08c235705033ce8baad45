"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const compiler = require("@vue/compiler-dom");
function parse(source) {
    const errors = [];
    const ast = compiler.parse(source, {
        // there are no components at SFC parsing level
        isNativeTag: () => true,
        // preserve all whitespaces
        isPreTag: () => true,
        parseMode: 'sfc',
        onError: e => {
            errors.push(e);
        },
        comments: true,
    });
    const descriptor = {
        filename: 'anonymous.vue',
        source,
        comments: [],
        template: null,
        script: null,
        scriptSetup: null,
        styles: [],
        customBlocks: [],
        cssVars: [],
        slotted: false,
        shouldForceReload: () => false,
    };
    ast.children.forEach(node => {
        if (node.type === compiler.NodeTypes.COMMENT) {
            descriptor.comments.push(node.content);
            return;
        }
        else if (node.type !== compiler.NodeTypes.ELEMENT) {
            return;
        }
        switch (node.tag) {
            case 'template':
                descriptor.template = createBlock(node, source);
                break;
            case 'script':
                const scriptBlock = createBlock(node, source);
                const isSetup = !!scriptBlock.attrs.setup;
                if (isSetup && !descriptor.scriptSetup) {
                    descriptor.scriptSetup = scriptBlock;
                    break;
                }
                if (!isSetup && !descriptor.script) {
                    descriptor.script = scriptBlock;
                    break;
                }
                break;
            case 'style':
                const styleBlock = createBlock(node, source);
                descriptor.styles.push(styleBlock);
                break;
            default:
                descriptor.customBlocks.push(createBlock(node, source));
                break;
        }
    });
    return {
        descriptor,
        errors,
    };
}
function createBlock(node, source) {
    const type = node.tag;
    let { start, end } = node.loc;
    let content = '';
    if (node.children.length) {
        start = node.children[0].loc.start;
        end = node.children[node.children.length - 1].loc.end;
        content = source.slice(start.offset, end.offset);
    }
    else {
        const offset = node.loc.source.indexOf(`</`);
        if (offset > -1) {
            start = {
                line: start.line,
                column: start.column + offset,
                offset: start.offset + offset
            };
        }
        end = Object.assign({}, start);
    }
    const loc = {
        source: content,
        start,
        end
    };
    const attrs = {};
    const block = {
        type,
        content,
        loc,
        attrs
    };
    node.props.forEach(p => {
        if (p.type === compiler.NodeTypes.ATTRIBUTE) {
            attrs[p.name] = p.value ? p.value.content || true : true;
            if (p.name === 'lang') {
                block.lang = p.value && p.value.content;
            }
            else if (p.name === 'src') {
                block.src = p.value && p.value.content;
            }
            else if (type === 'style') {
                if (p.name === 'scoped') {
                    block.scoped = true;
                }
                else if (p.name === 'module') {
                    block.__module = {
                        name: p.value?.content ?? '$style',
                        offset: p.value?.content ? p.value?.loc.start.offset - node.loc.start.offset : undefined
                    };
                }
            }
            else if (type === 'script' && p.name === 'setup') {
                block.setup = attrs.setup;
            }
        }
    });
    return block;
}
//# sourceMappingURL=parseSfc.js.map