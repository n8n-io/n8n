"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompilerDOM = require("@vue/compiler-dom");
const elementEvents_1 = require("../codegen/template/elementEvents");
const templateChild_1 = require("../codegen/template/templateChild");
const vFor_1 = require("../codegen/template/vFor");
const utils_1 = require("../codegen/utils");
const codeFeatures = {
    format: true,
};
const formatBrackets = {
    normal: ['`${', '}`;'],
    if: ['if (', ') { }'],
    for: ['for (', ') { }'],
    // fix https://github.com/vuejs/language-tools/issues/3572
    params: ['(', ') => {};'],
    // fix https://github.com/vuejs/language-tools/issues/1210
    // fix https://github.com/vuejs/language-tools/issues/2305
    curly: ['0 +', '+ 0;'],
    event: ['() => ', ';'],
    generic: ['<', '>() => {};'],
};
const plugin = ctx => {
    const parseds = new WeakMap();
    return {
        version: 2.1,
        getEmbeddedCodes(_fileName, sfc) {
            if (!sfc.template?.ast) {
                return [];
            }
            const parsed = parse(sfc);
            parseds.set(sfc, parsed);
            const result = [];
            for (const [id] of parsed) {
                result.push({ id, lang: 'ts' });
            }
            return result;
        },
        resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
            // access template content to watch change
            (() => sfc.template?.content)();
            const parsed = parseds.get(sfc);
            if (parsed) {
                const codes = parsed.get(embeddedFile.id);
                if (codes) {
                    embeddedFile.content.push(...codes);
                    embeddedFile.parentCodeId = 'template';
                }
            }
        },
    };
    function parse(sfc) {
        const data = new Map();
        if (!sfc.template?.ast) {
            return data;
        }
        const templateContent = sfc.template.content;
        let i = 0;
        sfc.template.ast.children.forEach(visit);
        return data;
        function visit(node) {
            if (node.type === CompilerDOM.NodeTypes.COMMENT) {
                const match = node.loc.source.match(/^<!--\s*@vue-generic\s*\{(?<content>[\s\S]*)\}\s*-->$/);
                if (match) {
                    const { content } = match.groups;
                    addFormatCodes(content, node.loc.start.offset + node.loc.source.indexOf('{') + 1, formatBrackets.generic);
                }
            }
            else if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
                for (const prop of node.props) {
                    if (prop.type !== CompilerDOM.NodeTypes.DIRECTIVE) {
                        continue;
                    }
                    const isShorthand = prop.arg?.loc.start.offset === prop.exp?.loc.start.offset; // vue 3.4+
                    if (isShorthand) {
                        continue;
                    }
                    if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION && !prop.arg.isStatic) {
                        addFormatCodes(prop.arg.loc.source, prop.arg.loc.start.offset, formatBrackets.normal);
                    }
                    if (prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                        && prop.exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY // style='z-index: 2' will compile to {'z-index':'2'}
                    ) {
                        if (prop.name === 'on' && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                            const ast = (0, utils_1.createTsAst)(ctx.modules.typescript, prop.exp, prop.exp.content);
                            if ((0, elementEvents_1.isCompoundExpression)(ctx.modules.typescript, ast)) {
                                addFormatCodes(prop.exp.loc.source, prop.exp.loc.start.offset, formatBrackets.event);
                            }
                            else {
                                const lines = prop.exp.content.split('\n');
                                const firstLineEmpty = lines[0].trim() === '';
                                const lastLineEmpty = lines[lines.length - 1].trim() === '';
                                if (lines.length <= 1 || (!firstLineEmpty && !lastLineEmpty)) {
                                    addFormatCodes(prop.exp.loc.source, prop.exp.loc.start.offset, formatBrackets.normal);
                                }
                                else {
                                    addFormatCodes(prop.exp.loc.source, prop.exp.loc.start.offset, ['(', ');']);
                                }
                            }
                        }
                        else if (prop.name === 'slot') {
                            addFormatCodes(prop.exp.loc.source, prop.exp.loc.start.offset, formatBrackets.params);
                        }
                        else if (prop.rawName === 'v-for') {
                            // #2586
                            addFormatCodes(prop.exp.loc.source, prop.exp.loc.start.offset, formatBrackets.for);
                        }
                        else {
                            addFormatCodes(prop.exp.loc.source, prop.exp.loc.start.offset, formatBrackets.normal);
                        }
                    }
                }
                for (const child of node.children) {
                    visit(child);
                }
            }
            else if (node.type === CompilerDOM.NodeTypes.IF) {
                for (let i = 0; i < node.branches.length; i++) {
                    const branch = node.branches[i];
                    if (branch.condition?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                        addFormatCodes(branch.condition.loc.source, branch.condition.loc.start.offset, formatBrackets.if);
                    }
                    for (const childNode of branch.children) {
                        visit(childNode);
                    }
                }
            }
            else if (node.type === CompilerDOM.NodeTypes.FOR) {
                const { leftExpressionRange, leftExpressionText } = (0, vFor_1.parseVForNode)(node);
                const { source } = node.parseResult;
                if (leftExpressionRange && leftExpressionText && source.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                    let start = leftExpressionRange.start;
                    let end = source.loc.start.offset + source.content.length;
                    while (templateContent[start - 1] === ' ' || templateContent[start - 1] === '(') {
                        start--;
                    }
                    while (templateContent[end] === ' ' || templateContent[end] === ')') {
                        end++;
                    }
                    addFormatCodes(templateContent.slice(start, end), start, formatBrackets.for);
                }
                for (const child of node.children) {
                    visit(child);
                }
            }
            else if (node.type === CompilerDOM.NodeTypes.TEXT_CALL) {
                // {{ var }}
                visit(node.content);
            }
            else if (node.type === CompilerDOM.NodeTypes.COMPOUND_EXPRESSION) {
                // {{ ... }} {{ ... }}
                for (const childNode of node.children) {
                    if (typeof childNode === 'object') {
                        visit(childNode);
                    }
                }
            }
            else if (node.type === CompilerDOM.NodeTypes.INTERPOLATION) {
                // {{ ... }}
                const [content, start] = (0, templateChild_1.parseInterpolationNode)(node, templateContent);
                const lines = content.split('\n');
                const firstLineEmpty = lines[0].trim() === '';
                const lastLineEmpty = lines[lines.length - 1].trim() === '';
                if (content.includes('=>')) { // arrow function
                    if (lines.length <= 1 || (!firstLineEmpty && !lastLineEmpty)) {
                        addFormatCodes(content, start, formatBrackets.normal);
                    }
                    else {
                        addFormatCodes(content, start, ['(', ');']);
                    }
                }
                else {
                    if (lines.length <= 1 || (!firstLineEmpty && !lastLineEmpty)) {
                        addFormatCodes(content, start, formatBrackets.curly);
                    }
                    else {
                        addFormatCodes(content, start, [
                            firstLineEmpty ? '(' : '(0 +',
                            lastLineEmpty ? ');' : '+ 0);'
                        ]);
                    }
                }
            }
        }
        function addFormatCodes(code, offset, wrapper) {
            const id = 'template_inline_ts_' + i++;
            data.set(id, [
                wrapper[0],
                [
                    code,
                    'template',
                    offset,
                    codeFeatures,
                ],
                wrapper[1],
            ]);
        }
    }
};
exports.default = plugin;
//# sourceMappingURL=vue-template-inline-ts.js.map