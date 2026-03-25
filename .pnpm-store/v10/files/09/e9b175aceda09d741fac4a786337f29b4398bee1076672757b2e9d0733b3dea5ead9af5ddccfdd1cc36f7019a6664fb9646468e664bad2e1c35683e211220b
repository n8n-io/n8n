"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMap = exports.clone = void 0;
const sourcemap_codec_1 = require("@jridgewell/sourcemap-codec");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const base_1 = require("./base");
function clone(segments) {
    const cloned = [];
    for (const s of segments) {
        if (typeof s === 'string') {
            cloned.push(s);
        }
        else {
            cloned.push([...s]);
        }
    }
    return cloned;
}
exports.clone = clone;
function generateMap(segments, readSource) {
    const cloned = clone(segments);
    const mappings = [];
    const sourceCode = new Map();
    let newLineIndex = (0, base_1.toString)(cloned).indexOf('\n');
    while (newLineIndex >= 0) {
        onLine((0, base_1.overwrite)(cloned, [0, newLineIndex + 1]));
        newLineIndex = (0, base_1.toString)(cloned).indexOf('\n');
    }
    onLine((0, base_1.overwrite)(cloned, [0, (0, base_1.getLength)(cloned)]));
    return (0, sourcemap_codec_1.encode)(mappings);
    function onLine(lineSegments) {
        const lineMapping = [];
        let currentColumn = 0;
        let hasCodeMapping = false;
        for (const s of lineSegments) {
            if (typeof s === 'string') {
                if (hasCodeMapping) {
                    hasCodeMapping = false;
                    // we don't break off last mapping for now
                }
                currentColumn += s.length;
            }
            else {
                hasCodeMapping = true;
                const source = s[1];
                const sourceOffset = s[2][0];
                if (!sourceCode.has(source)) {
                    const readed = readSource(source);
                    sourceCode.set(source, [readed[0], vscode_languageserver_textdocument_1.TextDocument.create('', '', 0, readed[1])]);
                }
                const [sourceIndex, document] = sourceCode.get(source);
                const position = document.positionAt(sourceOffset);
                lineMapping.push([
                    currentColumn,
                    sourceIndex,
                    position.line,
                    position.character,
                ]);
                currentColumn += s[0].length;
            }
        }
        mappings.push(lineMapping);
    }
}
exports.generateMap = generateMap;
//# sourceMappingURL=map.js.map