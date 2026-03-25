"use strict";
// https://github.com/vuejs/core/blob/main/packages/compiler-sfc/src/cssVars.ts#L47-L61
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentReg = void 0;
exports.parseCssVars = parseCssVars;
exports.fillBlank = fillBlank;
const vBindCssVarReg = /\bv-bind\(\s*(?:'([^']+)'|"([^"]+)"|([a-z_]\w*))\s*\)/gi;
exports.commentReg = /(?<=\/\*)[\s\S]*?(?=\*\/)|(?<=\/\/)[\s\S]*?(?=\n)/g;
function* parseCssVars(css) {
    css = fillBlank(css, exports.commentReg);
    const matchs = css.matchAll(vBindCssVarReg);
    for (const match of matchs) {
        const matchText = match.slice(1).find(t => t);
        if (matchText) {
            const offset = match.index + css.slice(match.index).indexOf(matchText);
            yield { offset, text: matchText };
        }
    }
}
function fillBlank(css, ...regs) {
    for (const reg of regs) {
        css = css.replace(reg, match => ' '.repeat(match.length));
    }
    return css;
}
//# sourceMappingURL=parseCssVars.js.map