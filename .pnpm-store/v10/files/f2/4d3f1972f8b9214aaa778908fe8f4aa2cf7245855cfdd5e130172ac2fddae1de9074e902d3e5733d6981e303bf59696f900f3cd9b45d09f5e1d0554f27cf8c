"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sfcBlockReg = /\<(script|style)\b([\s\S]*?)\>([\s\S]*?)\<\/\1\>/g;
const langReg = /\blang\s*=\s*(['\"]?)(\S*)\b\1/;
const plugin = ({ vueCompilerOptions }) => {
    return {
        version: 2.1,
        getLanguageId(fileName) {
            if (vueCompilerOptions.petiteVueExtensions.some(ext => fileName.endsWith(ext))) {
                return 'html';
            }
        },
        isValidFile(_fileName, languageId) {
            return languageId === 'html';
        },
        parseSFC2(fileName, languageId, content) {
            if (languageId !== 'html') {
                return;
            }
            let sfc = {
                descriptor: {
                    filename: fileName,
                    source: content,
                    comments: [],
                    template: null,
                    script: null,
                    scriptSetup: null,
                    styles: [],
                    customBlocks: [],
                    cssVars: [],
                    shouldForceReload: () => false,
                    slotted: false,
                },
                errors: [],
            };
            let templateContent = content;
            for (const match of content.matchAll(sfcBlockReg)) {
                const matchText = match[0];
                const tag = match[1];
                const attrs = match[2];
                const lang = attrs.match(langReg)?.[2];
                const content = match[3];
                const contentStart = match.index + matchText.indexOf(content);
                if (tag === 'style') {
                    sfc.descriptor.styles.push({
                        attrs: {},
                        content,
                        loc: {
                            start: { column: -1, line: -1, offset: contentStart },
                            end: { column: -1, line: -1, offset: contentStart + content.length },
                            source: content,
                        },
                        type: 'style',
                        lang,
                    });
                }
                // ignore `<script src="...">`
                else if (tag === 'script' && !attrs.includes('src=')) {
                    let type = attrs.includes('type=') ? 'scriptSetup' : 'script';
                    sfc.descriptor[type] = {
                        attrs: {},
                        content,
                        loc: {
                            start: { column: -1, line: -1, offset: contentStart },
                            end: { column: -1, line: -1, offset: contentStart + content.length },
                            source: content,
                        },
                        type: 'script',
                        lang,
                    };
                }
                templateContent = templateContent.slice(0, match.index) + ' '.repeat(matchText.length) + templateContent.slice(match.index + matchText.length);
            }
            sfc.descriptor.template = {
                attrs: {},
                content: templateContent,
                loc: {
                    start: { column: -1, line: -1, offset: 0 },
                    end: { column: -1, line: -1, offset: templateContent.length },
                    source: templateContent,
                },
                type: 'template',
                ast: {},
            };
            return sfc;
        }
    };
};
exports.default = plugin;
//# sourceMappingURL=file-html.js.map