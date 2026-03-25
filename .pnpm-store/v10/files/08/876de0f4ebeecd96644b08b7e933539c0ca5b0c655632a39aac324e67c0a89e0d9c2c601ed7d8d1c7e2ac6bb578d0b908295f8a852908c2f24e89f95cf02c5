"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlotOutlet = generateSlotOutlet;
const CompilerDOM = require("@vue/compiler-dom");
const common_1 = require("../common");
const elementChildren_1 = require("./elementChildren");
const elementProps_1 = require("./elementProps");
const interpolation_1 = require("./interpolation");
const inlayHints_1 = require("../inlayHints");
function* generateSlotOutlet(options, ctx, node, currentComponent, componentCtxVar) {
    const startTagOffset = node.loc.start.offset + options.template.content.substring(node.loc.start.offset).indexOf(node.tag);
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
        yield* (0, common_1.wrapWith)(node.loc.start.offset, node.loc.end.offset, ctx.codeFeatures.verification, `${options.slotsAssignName ?? '__VLS_slots'}[`, ...(0, common_1.wrapWith)(node.loc.start.offset, node.loc.end.offset, ctx.codeFeatures.verification, nameProp?.type === CompilerDOM.NodeTypes.ATTRIBUTE && nameProp.value
            ? `'${nameProp.value.content}'`
            : nameProp?.type === CompilerDOM.NodeTypes.DIRECTIVE && nameProp.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                ? nameProp.exp.content
                : `('default' as const)`), `]`);
        yield `)?.(`;
        yield* (0, common_1.wrapWith)(startTagOffset, startTagOffset + node.tag.length, ctx.codeFeatures.verification, `{${common_1.newLine}`, ...(0, elementProps_1.generateElementProps)(options, ctx, node, node.props.filter(prop => prop !== nameProp), true), `}`);
        yield `)${common_1.endOfLine}`;
    }
    else {
        yield `var ${varSlot} = {${common_1.newLine}`;
        yield* (0, elementProps_1.generateElementProps)(options, ctx, node, node.props.filter(prop => prop !== nameProp), true);
        yield `}${common_1.endOfLine}`;
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
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, nameProp.exp.content, nameProp.exp, nameProp.exp.loc.start.offset, ctx.codeFeatures.all, '(', ')');
            yield ` as const${common_1.endOfLine}`;
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
    yield* (0, elementChildren_1.generateElementChildren)(options, ctx, node, currentComponent, componentCtxVar);
}
//# sourceMappingURL=slotOutlet.js.map