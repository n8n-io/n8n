"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("./shared");
const plugin = () => {
    return {
        version: 2.1,
        getEmbeddedCodes(_fileName, sfc) {
            if (sfc.template?.lang === 'html') {
                return [{
                        id: 'template',
                        lang: sfc.template.lang,
                    }];
            }
            return [];
        },
        resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
            if (embeddedFile.id === 'template' && sfc.template?.lang === 'html') {
                embeddedFile.content.push([
                    sfc.template.content,
                    sfc.template.name,
                    0,
                    shared_1.allCodeFeatures,
                ]);
            }
        },
    };
};
exports.default = plugin;
//# sourceMappingURL=vue-sfc-template.js.map