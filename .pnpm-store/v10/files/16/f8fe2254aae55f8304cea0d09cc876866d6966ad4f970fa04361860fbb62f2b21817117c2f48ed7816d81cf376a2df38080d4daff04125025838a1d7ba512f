"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompilerDOM = require("@vue/compiler-dom");
const template_1 = require("../codegen/template");
const shared_1 = require("./shared");
const codeFeatures = {
    ...shared_1.allCodeFeatures,
    format: false,
    structure: false,
};
const plugin = () => {
    return {
        version: 2.1,
        getEmbeddedCodes(_fileName, sfc) {
            if (!sfc.template?.ast) {
                return [];
            }
            return [{ id: 'template_inline_css', lang: 'css' }];
        },
        resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
            if (embeddedFile.id !== 'template_inline_css' || !sfc.template?.ast) {
                return;
            }
            embeddedFile.parentCodeId = 'template';
            embeddedFile.content.push(...generate(sfc.template.ast));
        },
    };
};
exports.default = plugin;
function* generate(templateAst) {
    for (const node of (0, template_1.forEachElementNode)(templateAst)) {
        for (const prop of node.props) {
            if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
                && prop.name === 'bind'
                && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && prop.arg.content === 'style'
                && prop.exp.constType === CompilerDOM.ConstantTypes.CAN_STRINGIFY) {
                const endCrt = prop.arg.loc.source[prop.arg.loc.source.length - 1]; // " | '
                const start = prop.arg.loc.source.indexOf(endCrt) + 1;
                const end = prop.arg.loc.source.lastIndexOf(endCrt);
                const content = prop.arg.loc.source.substring(start, end);
                yield `x { `;
                yield [
                    content,
                    'template',
                    prop.arg.loc.start.offset + start,
                    codeFeatures,
                ];
                yield ` }\n`;
            }
        }
    }
}
//# sourceMappingURL=vue-template-inline-css.js.map