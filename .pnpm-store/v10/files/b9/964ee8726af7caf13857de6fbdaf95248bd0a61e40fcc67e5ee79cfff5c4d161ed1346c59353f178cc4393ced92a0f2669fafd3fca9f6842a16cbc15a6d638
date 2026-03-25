"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computedEmbeddedCodes = computedEmbeddedCodes;
exports.resolveCommonLanguageId = resolveCommonLanguageId;
const alien_signals_1 = require("alien-signals");
const muggle_string_1 = require("muggle-string");
const buildMappings_1 = require("../utils/buildMappings");
const embeddedFile_1 = require("./embeddedFile");
function computedEmbeddedCodes(plugins, fileName, sfc) {
    const getNameToBlockMap = (0, alien_signals_1.computed)(() => {
        const blocks = {};
        if (sfc.template) {
            blocks[sfc.template.name] = sfc.template;
        }
        if (sfc.script) {
            blocks[sfc.script.name] = sfc.script;
        }
        if (sfc.scriptSetup) {
            blocks[sfc.scriptSetup.name] = sfc.scriptSetup;
        }
        for (const block of sfc.styles) {
            blocks[block.name] = block;
        }
        for (const block of sfc.customBlocks) {
            blocks[block.name] = block;
        }
        return blocks;
    });
    const getPluginsResult = plugins.map(plugin => computedPluginEmbeddedCodes(plugins, plugin, fileName, sfc, name => getNameToBlockMap()[name]));
    const getFlatResult = (0, alien_signals_1.computed)(() => getPluginsResult.map(r => r()).flat());
    const getStructuredResult = (0, alien_signals_1.computed)(() => {
        const embeddedCodes = [];
        let remain = [...getFlatResult()];
        while (remain.length) {
            const beforeLength = remain.length;
            consumeRemain();
            if (beforeLength === remain.length) {
                break;
            }
        }
        for (const { code } of remain) {
            console.error('Unable to resolve embedded: ' + code.parentCodeId + ' -> ' + code.id);
        }
        return embeddedCodes;
        function consumeRemain() {
            for (let i = remain.length - 1; i >= 0; i--) {
                const { code, snapshot, mappings } = remain[i];
                if (!code.parentCodeId) {
                    embeddedCodes.push({
                        id: code.id,
                        languageId: resolveCommonLanguageId(code.lang),
                        linkedCodeMappings: code.linkedCodeMappings,
                        snapshot,
                        mappings,
                        embeddedCodes: [],
                    });
                    remain.splice(i, 1);
                }
                else {
                    const parent = findParentStructure(code.parentCodeId, embeddedCodes);
                    if (parent) {
                        parent.embeddedCodes ??= [];
                        parent.embeddedCodes.push({
                            id: code.id,
                            languageId: resolveCommonLanguageId(code.lang),
                            linkedCodeMappings: code.linkedCodeMappings,
                            snapshot,
                            mappings,
                            embeddedCodes: [],
                        });
                        remain.splice(i, 1);
                    }
                }
            }
        }
        function findParentStructure(id, current) {
            for (const child of current) {
                if (child.id === id) {
                    return child;
                }
                let parent = findParentStructure(id, child.embeddedCodes ?? []);
                if (parent) {
                    return parent;
                }
            }
        }
    });
    return getStructuredResult;
}
function computedPluginEmbeddedCodes(plugins, plugin, fileName, sfc, getBlockByName) {
    const computeds = new Map();
    const getComputedKey = (code) => code.id + '__' + code.lang;
    const getCodes = (0, alien_signals_1.computed)(() => {
        try {
            if (!plugin.getEmbeddedCodes) {
                return [...computeds.values()];
            }
            const embeddedCodeInfos = plugin.getEmbeddedCodes(fileName, sfc);
            for (const oldId of computeds.keys()) {
                if (!embeddedCodeInfos.some(code => getComputedKey(code) === oldId)) {
                    computeds.delete(oldId);
                }
            }
            for (const codeInfo of embeddedCodeInfos) {
                if (!computeds.has(getComputedKey(codeInfo))) {
                    computeds.set(getComputedKey(codeInfo), (0, alien_signals_1.computed)(() => {
                        const content = [];
                        const code = new embeddedFile_1.VueEmbeddedCode(codeInfo.id, codeInfo.lang, content);
                        for (const plugin of plugins) {
                            if (!plugin.resolveEmbeddedCode) {
                                continue;
                            }
                            try {
                                plugin.resolveEmbeddedCode(fileName, sfc, code);
                            }
                            catch (e) {
                                console.error(e);
                            }
                        }
                        const newText = (0, muggle_string_1.toString)(code.content);
                        const changeRanges = new Map();
                        const snapshot = {
                            getText: (start, end) => newText.slice(start, end),
                            getLength: () => newText.length,
                            getChangeRange(oldSnapshot) {
                                if (!changeRanges.has(oldSnapshot)) {
                                    changeRanges.set(oldSnapshot, undefined);
                                    const oldText = oldSnapshot.getText(0, oldSnapshot.getLength());
                                    const changeRange = fullDiffTextChangeRange(oldText, newText);
                                    if (changeRange) {
                                        changeRanges.set(oldSnapshot, changeRange);
                                    }
                                }
                                return changeRanges.get(oldSnapshot);
                            },
                        };
                        return {
                            code,
                            snapshot,
                        };
                    }));
                }
            }
        }
        catch (e) {
            console.error(e);
        }
        return [...computeds.values()];
    });
    return (0, alien_signals_1.computed)(() => {
        return getCodes().map(_file => {
            const { code, snapshot } = _file();
            const mappings = (0, buildMappings_1.buildMappings)(code.content.map(segment => {
                if (typeof segment === 'string') {
                    return segment;
                }
                const source = segment[1];
                if (source === undefined) {
                    return segment;
                }
                const block = getBlockByName(source);
                if (!block) {
                    // console.warn('Unable to find block: ' + source);
                    return segment;
                }
                return [
                    segment[0],
                    undefined,
                    segment[2] + block.startTagEnd,
                    segment[3],
                ];
            }));
            const newMappings = [];
            const tokenMappings = new Map();
            for (let i = 0; i < mappings.length; i++) {
                const mapping = mappings[i];
                if (mapping.data.__combineOffset !== undefined) {
                    const offsetMapping = mappings[i - mapping.data.__combineOffset];
                    if (typeof offsetMapping === 'string' || !offsetMapping) {
                        throw new Error('Invalid offset mapping, mappings: ' + mappings.length + ', i: ' + i + ', offset: ' + mapping.data.__combineOffset);
                    }
                    offsetMapping.sourceOffsets.push(...mapping.sourceOffsets);
                    offsetMapping.generatedOffsets.push(...mapping.generatedOffsets);
                    offsetMapping.lengths.push(...mapping.lengths);
                    continue;
                }
                if (mapping.data.__linkedToken !== undefined) {
                    const token = mapping.data.__linkedToken;
                    if (tokenMappings.has(token)) {
                        const prevMapping = tokenMappings.get(token);
                        code.linkedCodeMappings.push({
                            sourceOffsets: [prevMapping.generatedOffsets[0]],
                            generatedOffsets: [mapping.generatedOffsets[0]],
                            lengths: [Number(token.description)],
                            data: undefined,
                        });
                    }
                    else {
                        tokenMappings.set(token, mapping);
                    }
                    continue;
                }
                newMappings.push(mapping);
            }
            return {
                code,
                snapshot,
                mappings: newMappings,
            };
        });
    });
}
function fullDiffTextChangeRange(oldText, newText) {
    for (let start = 0; start < oldText.length && start < newText.length; start++) {
        if (oldText[start] !== newText[start]) {
            let end = oldText.length;
            for (let i = 0; i < oldText.length - start && i < newText.length - start; i++) {
                if (oldText[oldText.length - i - 1] !== newText[newText.length - i - 1]) {
                    break;
                }
                end--;
            }
            let length = end - start;
            let newLength = length + (newText.length - oldText.length);
            if (newLength < 0) {
                length -= newLength;
                newLength = 0;
            }
            return {
                span: { start, length },
                newLength,
            };
        }
    }
}
function resolveCommonLanguageId(lang) {
    switch (lang) {
        case 'js': return 'javascript';
        case 'cjs': return 'javascript';
        case 'mjs': return 'javascript';
        case 'ts': return 'typescript';
        case 'cts': return 'typescript';
        case 'mts': return 'typescript';
        case 'jsx': return 'javascriptreact';
        case 'tsx': return 'typescriptreact';
        case 'pug': return 'jade';
        case 'md': return 'markdown';
    }
    return lang;
}
//# sourceMappingURL=computedEmbeddedCodes.js.map