"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseSfc_1 = require("../utils/parseSfc");
const plugin = ({ vueCompilerOptions }) => {
    return {
        version: 2.1,
        getLanguageId(fileName) {
            if (vueCompilerOptions.extensions.some(ext => fileName.endsWith(ext))) {
                return 'vue';
            }
        },
        isValidFile(_fileName, languageId) {
            return languageId === 'vue';
        },
        parseSFC2(_fileName, languageId, content) {
            if (languageId !== 'vue') {
                return;
            }
            return (0, parseSfc_1.parse)(content);
        },
        updateSFC(sfc, change) {
            const blocks = [
                sfc.descriptor.template,
                sfc.descriptor.script,
                sfc.descriptor.scriptSetup,
                ...sfc.descriptor.styles,
                ...sfc.descriptor.customBlocks,
            ].filter((block) => !!block);
            const hitBlock = blocks.find(block => change.start >= block.loc.start.offset && change.end <= block.loc.end.offset);
            if (!hitBlock) {
                return;
            }
            const oldContent = hitBlock.content;
            const newContent = hitBlock.content =
                hitBlock.content.substring(0, change.start - hitBlock.loc.start.offset)
                    + change.newText
                    + hitBlock.content.substring(change.end - hitBlock.loc.start.offset);
            // #3449
            const endTagRegex = new RegExp(`</\\s*${hitBlock.type}\\s*>`);
            const insertedEndTag = !!oldContent.match(endTagRegex) !== !!newContent.match(endTagRegex);
            if (insertedEndTag) {
                return;
            }
            const lengthDiff = change.newText.length - (change.end - change.start);
            for (const block of blocks) {
                if (block.loc.start.offset > change.end) {
                    block.loc.start.offset += lengthDiff;
                }
                if (block.loc.end.offset >= change.end) {
                    block.loc.end.offset += lengthDiff;
                }
            }
            return sfc;
        },
    };
};
exports.default = plugin;
//# sourceMappingURL=file-vue.js.map