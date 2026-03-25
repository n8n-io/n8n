"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("./shared");
const plugin = () => {
    return {
        version: 2.1,
        getEmbeddedCodes(_fileName, sfc) {
            return sfc.customBlocks.map((customBlock, i) => ({
                id: 'custom_block_' + i,
                lang: customBlock.lang,
            }));
        },
        resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
            if (embeddedFile.id.startsWith('custom_block_')) {
                const index = parseInt(embeddedFile.id.slice('custom_block_'.length));
                const customBlock = sfc.customBlocks[index];
                embeddedFile.content.push([
                    customBlock.content,
                    customBlock.name,
                    0,
                    shared_1.allCodeFeatures,
                ]);
            }
        },
    };
};
exports.default = plugin;
//# sourceMappingURL=vue-sfc-customblocks.js.map