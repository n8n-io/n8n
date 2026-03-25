"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlotOutlet = generateSlotOutlet;
const CompilerDOM = require("@vue/compiler-dom");
const inlayHints_1 = require("../inlayHints");
const utils_1 = require("../utils");
const elementChildren_1 = require("./elementChildren");
const elementProps_1 = require("./elementProps");
const interpolation_1 = require("./interpolation");
function* generateSlotOutlet(options, ctx, node) {
    const startTagOffset = node.loc.start.offset + options.template.content.slice(node.loc.start.offset).indexOf(node.tag);
    const varSlot = ctx.getInternalVariable();
    const nameProp = node.props.find(prop => {
        if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
            return prop.name === 'name';
        }
        if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'bind'
            && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
            return prop.arg.content === 'name';
        }
    });
    if (options.hasDefineSlots) {
        yield `__VLS_normalizeSlot(`;
        yield* (0, utils_1.wrapWith)(node.loc.start.offset, node.loc.end.offset, ctx.codeFeatures.verification, `${options.slotsAssignName ?? '__VLS_slots'}[`, ...(0, utils_1.wrapWith)(node.loc.start.offset, node.loc.end.offset, ctx.codeFeatures.verification, nameProp?.type === CompilerDOM.NodeTypes.ATTRIBUTE && nameProp.value
            ? `'${nameProp.value.content}'`
            : nameProp?.type === CompilerDOM.NodeTypes.DIRECTIVE && nameProp.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                ? nameProp.exp.content
                : `('default' as const)`), `]`);
        yield `)?.(`;
        yield* (0, utils_1.wrapWith)(startTagOffset, startTagOffset + node.tag.length, ctx.codeFeatures.verification, `{${utils_1.newLine}`, ...(0, elementProps_1.generateElementProps)(options, ctx, node, node.props.filter(prop => prop !== nameProp), true, true), `}`);
        yield `)${utils_1.endOfLine}`;
    }
    else {
        yield `var ${varSlot} = {${utils_1.newLine}`;
        yield* (0, elementProps_1.generateElementProps)(options, ctx, node, node.props.filter(prop => prop !== nameProp), options.vueCompilerOptions.strictTemplates, true);
        yield `}${utils_1.endOfLine}`;
        if (nameProp?.type === CompilerDOM.NodeTypes.ATTRIBUTE
            && nameProp.value) {
            ctx.slots.push({
                name: nameProp.value.content,
                loc: nameProp.loc.start.offset + nameProp.loc.source.indexOf(nameProp.value.content, nameProp.name.length),
                tagRange: [startTagOffset, startTagOffset + node.tag.length],
                varName: varSlot,
                nodeLoc: node.loc,
            });
        }
        else if (nameProp?.type === CompilerDOM.NodeTypes.DIRECTIVE
            && nameProp.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
            const isShortHand = nameProp.arg?.loc.start.offset === nameProp.exp.loc.start.offset;
            if (isShortHand) {
                ctx.inlayHints.push((0, inlayHints_1.createVBindShorthandInlayHintInfo)(nameProp.exp.loc, 'name'));
            }
            const slotExpVar = ctx.getInternalVariable();
            yield `var ${slotExpVar} = `;
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', ctx.codeFeatures.all, nameProp.exp.content, nameProp.exp.loc.start.offset, nameProp.exp, '(', ')');
            yield ` as const${utils_1.endOfLine}`;
            ctx.dynamicSlots.push({
                expVar: slotExpVar,
                varName: varSlot,
            });
        }
        else {
            ctx.slots.push({
                name: 'default',
                tagRange: [startTagOffset, startTagOffset + node.tag.length],
                varName: varSlot,
                nodeLoc: node.loc,
            });
        }
    }
    yield* ctx.generateAutoImportCompletion();
    yield* (0, elementChildren_1.generateElementChildren)(options, ctx, node);
}
//# sourceMappingURL=slotOutlet.js.map