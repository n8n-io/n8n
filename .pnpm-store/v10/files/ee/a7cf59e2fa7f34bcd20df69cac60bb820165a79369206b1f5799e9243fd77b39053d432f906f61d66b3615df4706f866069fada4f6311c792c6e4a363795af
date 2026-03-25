"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVueCompilerOptions = parseVueCompilerOptions;
const syntaxReg = /^\s*@(?<key>.+?)\s+(?<value>.+?)\s*$/m;
function parseVueCompilerOptions(comments) {
    const entries = comments
        .map(text => {
        try {
            const match = text.match(syntaxReg);
            if (match) {
                const { key, value } = match.groups ?? {};
                return [key, JSON.parse(value)];
            }
        }
        catch { }
        ;
    })
        .filter(item => !!item);
    if (entries.length) {
        return Object.fromEntries(entries);
    }
}
//# sourceMappingURL=vueCompilerOptions.js.map