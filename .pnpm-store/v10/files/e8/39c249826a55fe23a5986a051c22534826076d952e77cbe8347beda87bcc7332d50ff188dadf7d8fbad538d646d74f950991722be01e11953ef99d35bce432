"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const language_core_1 = require("@volar/language-core");
const muggle_string_1 = require("muggle-string");
const buildMappings_1 = require("../utils/buildMappings");
const parseSfc_1 = require("../utils/parseSfc");
const codeblockReg = /(`{3,})[\s\S]+?\1/g;
const inlineCodeblockReg = /`[^\n`]+?`/g;
const scriptSetupReg = /\\\<[\s\S]+?\>\n?/g;
const sfcBlockReg = /\<(script|style)\b[\s\S]*?\>([\s\S]*?)\<\/\1\>/g;
const angleBracketReg = /\<\S*\:\S*\>/g;
const linkReg = /\[[\s\S]*?\]\([\s\S]*?\)/g;
const codeSnippetImportReg = /^\s*<<<\s*.+/gm;
const plugin = ({ vueCompilerOptions }) => {
    return {
        version: 2.1,
        getLanguageId(fileName) {
            if (vueCompilerOptions.vitePressExtensions.some(ext => fileName.endsWith(ext))) {
                return 'markdown';
            }
        },
        isValidFile(_fileName, languageId) {
            return languageId === 'markdown';
        },
        parseSFC2(_fileName, languageId, content) {
            if (languageId !== 'markdown') {
                return;
            }
            content = content
                // code block
                .replace(codeblockReg, (match, quotes) => quotes + ' '.repeat(match.length - quotes.length * 2) + quotes)
                // inline code block
                .replace(inlineCodeblockReg, match => `\`${' '.repeat(match.length - 2)}\``)
                // # \<script setup>
                .replace(scriptSetupReg, match => ' '.repeat(match.length))
                // <<< https://vitepress.dev/guide/markdown#import-code-snippets
                .replace(codeSnippetImportReg, match => ' '.repeat(match.length));
            const codes = [];
            for (const match of content.matchAll(sfcBlockReg)) {
                if (match.index !== undefined) {
                    const matchText = match[0];
                    codes.push([matchText, undefined, match.index]);
                    codes.push('\n\n');
                    content = content.slice(0, match.index) + ' '.repeat(matchText.length) + content.slice(match.index + matchText.length);
                }
            }
            content = content
                // angle bracket: <http://foo.com>
                .replace(angleBracketReg, match => ' '.repeat(match.length))
                // [foo](http://foo.com)
                .replace(linkReg, match => ' '.repeat(match.length));
            codes.push('<template>\n');
            codes.push([content, undefined, 0]);
            codes.push('\n</template>');
            const file2VueSourceMap = (0, language_core_1.defaultMapperFactory)((0, buildMappings_1.buildMappings)(codes));
            const sfc = (0, parseSfc_1.parse)((0, muggle_string_1.toString)(codes));
            if (sfc.descriptor.template) {
                sfc.descriptor.template.lang = 'md';
                transformRange(sfc.descriptor.template);
            }
            if (sfc.descriptor.script) {
                transformRange(sfc.descriptor.script);
            }
            if (sfc.descriptor.scriptSetup) {
                transformRange(sfc.descriptor.scriptSetup);
            }
            for (const style of sfc.descriptor.styles) {
                transformRange(style);
            }
            for (const customBlock of sfc.descriptor.customBlocks) {
                transformRange(customBlock);
            }
            return sfc;
            function transformRange(block) {
                const { start, end } = block.loc;
                const startOffset = start.offset;
                const endOffset = end.offset;
                start.offset = -1;
                end.offset = -1;
                for (const [offset] of file2VueSourceMap.toSourceLocation(startOffset)) {
                    start.offset = offset;
                    break;
                }
                for (const [offset] of file2VueSourceMap.toSourceLocation(endOffset)) {
                    end.offset = offset;
                    break;
                }
            }
        }
    };
};
exports.default = plugin;
//# sourceMappingURL=file-md.js.map