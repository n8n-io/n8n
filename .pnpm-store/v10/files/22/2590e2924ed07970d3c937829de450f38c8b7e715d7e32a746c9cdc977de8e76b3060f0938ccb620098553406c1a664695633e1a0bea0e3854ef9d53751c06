"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("./shared");
const plugin = () => {
    return {
        version: 2.1,
        getEmbeddedCodes(_fileName, sfc) {
            const result = [];
            for (let i = 0; i < sfc.styles.length; i++) {
                const style = sfc.styles[i];
                if (style) {
                    result.push({
                        id: 'style_' + i,
                        lang: style.lang,
                    });
                    if (style.cssVars.length) {
                        result.push({
                            id: 'style_' + i + '_inline_ts',
                            lang: 'ts',
                        });
                    }
                }
            }
            return result;
        },
        resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
            if (embeddedFile.id.startsWith('style_')) {
                const index = parseInt(embeddedFile.id.split('_')[1]);
                const style = sfc.styles[index];
                if (embeddedFile.id.endsWith('_inline_ts')) {
                    embeddedFile.parentCodeId = 'style_' + index;
                    for (const cssVar of style.cssVars) {
                        embeddedFile.content.push('(', [
                            cssVar.text,
                            style.name,
                            cssVar.offset,
                            shared_1.allCodeFeatures,
                        ], ');\n');
                    }
                }
                else {
                    embeddedFile.content.push([
                        style.content,
                        style.name,
                        0,
                        shared_1.allCodeFeatures,
                    ]);
                }
            }
        },
    };
};
exports.default = plugin;
//# sourceMappingURL=vue-sfc-styles.js.map