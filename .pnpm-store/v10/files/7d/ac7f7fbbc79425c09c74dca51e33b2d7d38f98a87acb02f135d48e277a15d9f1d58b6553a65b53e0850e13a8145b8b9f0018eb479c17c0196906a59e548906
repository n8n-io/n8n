"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeHtmlMarkdown = void 0;
const translator_1 = require("./translator");
const config_1 = require("./config");
const utilities_1 = require("./utilities");
const visitor_1 = require("./visitor");
// endregion
/* ****************************************************************************************************************** */
// region: NodeHtmlMarkdown (class)
/* ****************************************************************************************************************** */
class NodeHtmlMarkdown {
    constructor(options, customTranslators, customCodeBlockTranslators) {
        var _a, _b, _c, _d;
        this.translators = new translator_1.TranslatorCollection();
        this.aTagTranslators = new translator_1.TranslatorCollection();
        this.codeBlockTranslators = new translator_1.TranslatorCollection();
        this.tableTranslators = new translator_1.TranslatorCollection();
        this.tableRowTranslators = new translator_1.TranslatorCollection();
        this.tableCellTranslators = new translator_1.TranslatorCollection();
        /* Setup Options */
        this.options = Object.assign(Object.assign({}, config_1.defaultOptions), options);
        const ignoredElements = (_b = (_a = this.options.ignore) === null || _a === void 0 ? void 0 : _a.concat(config_1.defaultIgnoreElements)) !== null && _b !== void 0 ? _b : config_1.defaultIgnoreElements;
        const blockElements = (_d = (_c = this.options.blockElements) === null || _c === void 0 ? void 0 : _c.concat(config_1.defaultBlockElements)) !== null && _d !== void 0 ? _d : config_1.defaultBlockElements;
        /* Setup Translator Bases */
        ignoredElements === null || ignoredElements === void 0 ? void 0 : ignoredElements.forEach(el => {
            this.translators.set(el, { ignore: true, recurse: false });
            this.codeBlockTranslators.set(el, { ignore: true, recurse: false });
        });
        blockElements === null || blockElements === void 0 ? void 0 : blockElements.forEach(el => {
            this.translators.set(el, { surroundingNewlines: 2 });
            this.codeBlockTranslators.set(el, { surroundingNewlines: 2 });
        });
        /* Add and merge bases with default and custom translator configs */
        for (const [elems, cfg] of Object.entries(Object.assign(Object.assign({}, config_1.defaultTranslators), customTranslators)))
            this.translators.set(elems, cfg, true);
        for (const [elems, cfg] of Object.entries(Object.assign(Object.assign({}, config_1.defaultCodeBlockTranslators), customCodeBlockTranslators)))
            this.codeBlockTranslators.set(elems, cfg, true);
        for (const [elems, cfg] of Object.entries(config_1.aTagTranslatorConfig))
            this.aTagTranslators.set(elems, cfg, true);
        for (const [elems, cfg] of Object.entries(config_1.tableTranslatorConfig))
            this.tableTranslators.set(elems, cfg, true);
        for (const [elems, cfg] of Object.entries(config_1.tableRowTranslatorConfig))
            this.tableRowTranslators.set(elems, cfg, true);
        for (const [elems, cfg] of Object.entries(config_1.tableCellTranslatorConfig))
            this.tableCellTranslators.set(elems, cfg, true);
        // TODO - Workaround for upstream issue (may not be fixed) - https://github.com/taoqf/node-html-parser/issues/78
        if (!this.options.textReplace)
            this.options.textReplace = [];
        this.options.textReplace.push([/^<!DOCTYPE.*>/gmi, '']);
    }
    static translate(htmlOrFiles, opt, customTranslators, customCodeBlockTranslators) {
        return NodeHtmlMarkdown.prototype.translateWorker.call(new NodeHtmlMarkdown(opt, customTranslators, customCodeBlockTranslators), htmlOrFiles);
    }
    translate(htmlOrFiles) {
        return this.translateWorker(htmlOrFiles);
    }
    // endregion
    /* ********************************************************* */
    // region: Internal Methods
    /* ********************************************************* */
    translateWorker(htmlOrFiles) {
        const inputIsCollection = typeof htmlOrFiles !== 'string';
        const inputFiles = !inputIsCollection ? { 'default': htmlOrFiles } : htmlOrFiles;
        const outputFiles = {};
        for (const [fileName, html] of Object.entries(inputFiles)) {
            const parsedHtml = (0, utilities_1.parseHTML)(html, this.options);
            outputFiles[fileName] = (0, visitor_1.getMarkdownForHtmlNodes)(this, parsedHtml, fileName !== 'default' ? fileName : void 0);
        }
        return inputIsCollection ? outputFiles : outputFiles['default'];
    }
}
exports.NodeHtmlMarkdown = NodeHtmlMarkdown;
// endregion
//# sourceMappingURL=main.js.map