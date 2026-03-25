"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSrc = generateSrc;
const codeFeatures_1 = require("../codeFeatures");
const utils_1 = require("../utils");
function* generateSrc(src) {
    if (src === true) {
        return;
    }
    let { text } = src;
    if (text.endsWith('.d.ts')) {
        text = text.slice(0, -'.d.ts'.length);
    }
    else if (text.endsWith('.ts')) {
        text = text.slice(0, -'.ts'.length);
    }
    else if (text.endsWith('.tsx')) {
        text = text.slice(0, -'.tsx'.length) + '.jsx';
    }
    if (!text.endsWith('.js') && !text.endsWith('.jsx')) {
        text = text + '.js';
    }
    yield `export * from `;
    yield* (0, utils_1.generateSfcBlockAttrValue)(src, text, {
        ...codeFeatures_1.codeFeatures.all,
        navigation: text === src.text
            ? true
            : {
                shouldRename: () => false,
                resolveRenameEditText(newName) {
                    if (newName.endsWith('.jsx') || newName.endsWith('.js')) {
                        newName = newName.split('.').slice(0, -1).join('.');
                    }
                    if (src?.text.endsWith('.d.ts')) {
                        newName = newName + '.d.ts';
                    }
                    else if (src?.text.endsWith('.ts')) {
                        newName = newName + '.ts';
                    }
                    else if (src?.text.endsWith('.tsx')) {
                        newName = newName + '.tsx';
                    }
                    return newName;
                },
            },
    });
    yield utils_1.endOfLine;
    yield `export { default } from '${text}'${utils_1.endOfLine}`;
}
//# sourceMappingURL=src.js.map