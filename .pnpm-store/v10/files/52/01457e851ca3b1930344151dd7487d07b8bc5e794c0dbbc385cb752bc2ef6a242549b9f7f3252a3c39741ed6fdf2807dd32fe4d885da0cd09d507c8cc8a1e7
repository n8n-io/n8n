"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlotOutlet = generateSlotOutlet;
const CompilerDOM = require("@vue/compiler-dom");
const inlayHints_1 = require("../inlayHints");
const utils_1 = require("../utils");
const wrapWith_1 = require("../utils/wrapWith");
const elementChildren_1 = require("./elementChildren");
const elementProps_1 = require("./elementProps");
const interpolation_1 = require("./interpolation");
const propertyAccess_1 = require("./propertyAccess");
function* generateSlotOutlet(options, ctx, node) {
    const startTagOffset = node.loc.start.offset + options.template.content.slice(node.loc.start.offset).indexOf(node.tag);
    const startTagEndOffset = startTagOffset + node.tag.length;
    const propsVar = ctx.getInternalVariable();
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
        yield `__VLS_asFunctionalSlot(`;
        if (nameProp) {
            let codes;
            if (nameProp.type === CompilerDOM.NodeTypes.ATTRIBUTE && nameProp.value) {
                let { source, start: { offset } } = nameProp.value.loc;
                if (source.startsWith('"') || source.startsWith("'")) {
                    source = source.slice(1, -1);
                    offset++;
                }
                codes = (0, propertyAccess_1.generatePropertyAccess)(options, ctx, source, offset, ctx.codeFeatures.navigationAndVerification);
            }
            else if (nameProp.type === CompilerDOM.NodeTypes.DIRECTIVE
                && nameProp.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                codes = [
                    `[`,
                    ...(0, elementProps_1.generatePropExp)(options, ctx, nameProp, nameProp.exp, ctx.codeFeatures.all),
                    `]`
                ];
            }
            else {
                codes = [`['default']`];
            }
            yield* (0, wrapWith_1.wrapWith)(nameProp.loc.start.offset, nameProp.loc.end.offset, ctx.codeFeatures.verification, `${options.slotsAssignName ?? '__VLS_slots'}`, ...codes);
        }
        else {
            yield* (0, wrapWith_1.wrapWith)(startTagOffset, startTagEndOffset, ctx.codeFeatures.verification, `${options.slotsAssignName ?? '__VLS_slots'}[`, ...(0, wrapWith_1.wrapWith)(startTagOffset, startTagEndOffset, ctx.codeFeatures.verification, `'default'`), `]`);
        }
        yield `)(`;
        yield* (0, wrapWith_1.wrapWith)(startTagOffset, startTagEndOffset, ctx.codeFeatures.verification, `{${utils_1.newLine}`, ...(0, elementProps_1.generateElementProps)(options, ctx, node, node.props.filter(prop => prop !== nameProp), true, true), `}`);
        yield `)${utils_1.endOfLine}`;
    }
    else {
        yield `var ${propsVar} = {${utils_1.newLine}`;
        yield* (0, elementProps_1.generateElementProps)(options, ctx, node, node.props.filter(prop => prop !== nameProp), options.vueCompilerOptions.checkUnknownProps, true);
        yield `}${utils_1.endOfLine}`;
        if (nameProp?.type === CompilerDOM.NodeTypes.ATTRIBUTE
            && nameProp.value) {
            ctx.slots.push({
                name: nameProp.value.content,
                offset: nameProp.loc.start.offset + nameProp.loc.source.indexOf(nameProp.value.content, nameProp.name.length),
                tagRange: [startTagOffset, startTagOffset + node.tag.length],
                nodeLoc: node.loc,
                propsVar: ctx.getHoistVariable(propsVar),
            });
        }
        else if (nameProp?.type === CompilerDOM.NodeTypes.DIRECTIVE
            && nameProp.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
            const isShortHand = nameProp.arg?.loc.start.offset === nameProp.exp.loc.start.offset;
            if (isShortHand) {
                ctx.inlayHints.push((0, inlayHints_1.createVBindShorthandInlayHintInfo)(nameProp.exp.loc, 'name'));
            }
            const expVar = ctx.getInternalVariable();
            yield `var ${expVar} = __VLS_tryAsConstant(`;
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', ctx.codeFeatures.all, nameProp.exp.content, nameProp.exp.loc.start.offset, nameProp.exp);
            yield `)${utils_1.endOfLine}`;
            ctx.dynamicSlots.push({
                expVar: ctx.getHoistVariable(expVar),
                propsVar: ctx.getHoistVariable(propsVar),
            });
        }
        else {
            ctx.slots.push({
                name: 'default',
                tagRange: [startTagOffset, startTagEndOffset],
                nodeLoc: node.loc,
                propsVar: ctx.getHoistVariable(propsVar),
            });
        }
    }
    yield* ctx.generateAutoImportCompletion();
    yield* (0, elementChildren_1.generateElementChildren)(options, ctx, node);
}
//# sourceMappingURL=slotOutlet.js.map