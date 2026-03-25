"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStyleModules = generateStyleModules;
const codeFeatures_1 = require("../codeFeatures");
const utils_1 = require("../utils");
const classProperty_1 = require("./classProperty");
function* generateStyleModules(options) {
    const styles = options.sfc.styles.map((style, i) => [style, i]).filter(([style]) => style.module);
    if (!styles.length && !options.scriptSetupRanges?.useCssModule.length) {
        return;
    }
    yield `type __VLS_StyleModules = {${utils_1.newLine}`;
    for (const [style, i] of styles) {
        if (style.module === true) {
            yield `$style`;
        }
        else {
            const { text, offset } = style.module;
            yield [
                text,
                'main',
                offset,
                codeFeatures_1.codeFeatures.withoutHighlight
            ];
        }
        yield `: Record<string, string> & __VLS_PrettifyGlobal<{}`;
        for (const className of style.classNames) {
            yield* (0, classProperty_1.generateClassProperty)(i, className.text, className.offset, 'string');
        }
        yield `>${utils_1.endOfLine}`;
    }
    yield `}${utils_1.endOfLine}`;
}
//# sourceMappingURL=modules.js.map