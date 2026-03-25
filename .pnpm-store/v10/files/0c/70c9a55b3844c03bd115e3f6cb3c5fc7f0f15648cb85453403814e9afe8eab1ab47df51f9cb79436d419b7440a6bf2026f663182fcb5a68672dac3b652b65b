"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStyleModulesType = generateStyleModulesType;
const index_1 = require("./index");
const template_1 = require("./template");
const common_1 = require("../common");
function* generateStyleModulesType(options, ctx) {
    const styles = options.sfc.styles.map((style, i) => [style, i]).filter(([style]) => style.module);
    if (!styles.length && !options.scriptSetupRanges?.cssModules.length) {
        return;
    }
    yield `type __VLS_StyleModules = {${common_1.newLine}`;
    for (const [style, i] of styles) {
        const { name, offset } = style.module;
        if (offset) {
            yield [
                name,
                'main',
                offset + 1,
                index_1.codeFeatures.all
            ];
        }
        else {
            yield name;
        }
        yield `: Record<string, string> & ${ctx.localTypes.PrettifyLocal}<{}`;
        for (const className of style.classNames) {
            yield* (0, template_1.generateCssClassProperty)(i, className.text, className.offset, 'string', false);
        }
        yield `>${common_1.endOfLine}`;
    }
    yield `}${common_1.endOfLine}`;
}
//# sourceMappingURL=styleModulesType.js.map