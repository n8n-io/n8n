"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCssClassNames = parseCssClassNames;
const parseCssVars_1 = require("./parseCssVars");
const cssClassNameReg = /(?=(\.[a-z_][-\w]*)[\s.,+~>:#)[{])/gi;
const fragmentReg = /(?<={)[^{]*(?=(?<!\\);)/g;
function* parseCssClassNames(css) {
    css = (0, parseCssVars_1.fillBlank)(css, parseCssVars_1.commentReg, fragmentReg);
    const matches = css.matchAll(cssClassNameReg);
    for (const match of matches) {
        const matchText = match[1];
        if (matchText) {
            yield { offset: match.index, text: matchText };
        }
    }
}
//# sourceMappingURL=parseCssClassNames.js.map