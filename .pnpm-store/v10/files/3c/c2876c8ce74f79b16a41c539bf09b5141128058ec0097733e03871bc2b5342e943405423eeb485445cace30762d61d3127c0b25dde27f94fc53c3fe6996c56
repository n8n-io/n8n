"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSrc = generateSrc;
const common_1 = require("../common");
const index_1 = require("./index");
function* generateSrc(script, src) {
    if (src.endsWith('.d.ts')) {
        src = src.substring(0, src.length - '.d.ts'.length);
    }
    else if (src.endsWith('.ts')) {
        src = src.substring(0, src.length - '.ts'.length);
    }
    else if (src.endsWith('.tsx')) {
        src = src.substring(0, src.length - '.tsx'.length) + '.jsx';
    }
    if (!src.endsWith('.js') && !src.endsWith('.jsx')) {
        src = src + '.js';
    }
    yield `export * from `;
    yield [
        `'${src}'`,
        'script',
        script.srcOffset - 1,
        {
            ...index_1.codeFeatures.all,
            navigation: src === script.src
                ? true
                : {
                    shouldRename: () => false,
                    resolveRenameEditText(newName) {
                        if (newName.endsWith('.jsx') || newName.endsWith('.js')) {
                            newName = newName.split('.').slice(0, -1).join('.');
                        }
                        if (script?.src?.endsWith('.d.ts')) {
                            newName = newName + '.d.ts';
                        }
                        else if (script?.src?.endsWith('.ts')) {
                            newName = newName + '.ts';
                        }
                        else if (script?.src?.endsWith('.tsx')) {
                            newName = newName + '.tsx';
                        }
                        return newName;
                    },
                },
        },
    ];
    yield common_1.endOfLine;
    yield `export { default } from '${src}'${common_1.endOfLine}`;
}
//# sourceMappingURL=src.js.map