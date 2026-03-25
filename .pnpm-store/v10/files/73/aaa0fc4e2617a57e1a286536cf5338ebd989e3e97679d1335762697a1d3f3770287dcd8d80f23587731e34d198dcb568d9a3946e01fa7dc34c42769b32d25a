"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarkdownForHtmlNodes = exports.Visitor = void 0;
const nodes_1 = require("./nodes");
const utilities_1 = require("./utilities");
const translator_1 = require("./translator");
const config_1 = require("./config");
// endregion
/* ****************************************************************************************************************** */
// region: Visitor
/* ****************************************************************************************************************** */
/**
 * Properties & methods marked public are designated as such due to the fact that we may add middleware / transformer
 * support in the future
 */
class Visitor {
    constructor(instance, rootNode, fileName) {
        this.instance = instance;
        this.rootNode = rootNode;
        this.fileName = fileName;
        this.nodeMetadata = new Map();
        this.urlDefinitions = [];
        this.result = {
            text: '',
            trailingNewlineStats: {
                whitespace: 0,
                newLines: 0
            }
        };
        this.options = instance.options;
        this.optimizeTree(rootNode);
        this.visitNode(rootNode);
    }
    /* ********************************************************* */
    // region: Methods
    /* ********************************************************* */
    addOrGetUrlDefinition(url) {
        let id = this.urlDefinitions.findIndex(u => u === url);
        if (id < 0)
            id = this.urlDefinitions.push(url) - 1;
        return id + 1;
    }
    appendResult(s, startPos, spaceIfRepeatingChar) {
        if (!s && startPos === undefined)
            return;
        const { result } = this;
        if (startPos !== undefined)
            result.text = result.text.substr(0, startPos);
        result.text += (spaceIfRepeatingChar && result.text.slice(-1) === s[0] ? ' ' : '') + s;
        result.trailingNewlineStats = (0, utilities_1.getTrailingWhitespaceInfo)(result.text);
    }
    appendNewlines(count) {
        const { newLines } = this.result.trailingNewlineStats;
        this.appendResult('\n'.repeat(Math.max(0, (+count - newLines))));
    }
    // endregion
    /* ********************************************************* */
    // region: Internal Methods
    /* ********************************************************* */
    /**
     * Optimize tree, flagging nodes that have usable content
     */
    optimizeTree(node) {
        (0, utilities_1.perfStart)('Optimize tree');
        const { translators } = this.instance;
        (function visit(node) {
            let res = false;
            if ((0, nodes_1.isTextNode)(node) || ((0, nodes_1.isElementNode)(node) && config_1.contentlessElements.includes(node.tagName))) {
                res = true;
            }
            else {
                const childNodes = (0, utilities_1.getChildNodes)(node);
                if (!childNodes.length) {
                    const translator = translators[node.tagName];
                    if ((translator === null || translator === void 0 ? void 0 : translator.preserveIfEmpty) || typeof translator === 'function')
                        res = true;
                }
                else
                    for (const child of childNodes) {
                        if (!res)
                            res = visit(child);
                        else
                            visit(child);
                    }
            }
            return node.preserve = res;
        })(node);
        (0, utilities_1.perfStop)('Optimize tree');
    }
    /**
     * Apply escaping and custom replacement rules
     */
    processText(text, metadata) {
        let res = text;
        if (!(metadata === null || metadata === void 0 ? void 0 : metadata.preserveWhitespace))
            res = res.replace(/\s+/g, ' ');
        if (metadata === null || metadata === void 0 ? void 0 : metadata.noEscape)
            return res;
        const { lineStartEscape, globalEscape, textReplace } = this.options;
        res = res
            .replace(globalEscape[0], globalEscape[1])
            .replace(lineStartEscape[0], lineStartEscape[1]);
        /* If specified, apply custom replacement patterns */
        if (textReplace)
            for (const [pattern, r] of textReplace)
                res = res.replace(pattern, r);
        return res;
    }
    visitNode(node, textOnly, metadata) {
        var _a, _b;
        const { result } = this;
        if (!node.preserve)
            return;
        /* Handle text node */
        if ((0, nodes_1.isTextNode)(node))
            return node.isWhitespace && !(metadata === null || metadata === void 0 ? void 0 : metadata.preserveWhitespace)
                ? (!result.text.length || result.trailingNewlineStats.whitespace > 0) ? void 0 : this.appendResult(' ')
                : this.appendResult(this.processText((metadata === null || metadata === void 0 ? void 0 : metadata.preserveWhitespace) ? node.text : node.trimmedText, metadata));
        if (textOnly || !(0, nodes_1.isElementNode)(node))
            return;
        /* Handle element node */
        const translatorCfgOrFactory = (metadata === null || metadata === void 0 ? void 0 : metadata.translators) ? metadata.translators[node.tagName] : this.instance.translators[node.tagName];
        /* Update metadata with list detail */
        switch (node.tagName) {
            case 'UL':
            case 'OL':
                metadata = Object.assign(Object.assign({}, metadata), { listItemNumber: 0, listKind: node.tagName, indentLevel: ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.indentLevel) !== null && _a !== void 0 ? _a : -1) + 1 });
                break;
            case 'LI':
                if ((metadata === null || metadata === void 0 ? void 0 : metadata.listKind) === 'OL')
                    metadata.listItemNumber = ((_b = metadata.listItemNumber) !== null && _b !== void 0 ? _b : 0) + 1;
                break;
            case 'PRE':
                metadata = Object.assign(Object.assign({}, metadata), { preserveWhitespace: true });
                break;
            case 'TABLE':
                metadata = Object.assign(Object.assign({}, metadata), { tableMeta: {
                        node: node
                    } });
        }
        if (metadata)
            this.nodeMetadata.set(node, metadata);
        // If no translator for element, visit children
        if (!translatorCfgOrFactory) {
            for (const child of (0, utilities_1.getChildNodes)(node))
                this.visitNode(child, textOnly, metadata);
            return;
        }
        /* Get Translator Config */
        let cfg;
        let ctx;
        if (!(0, translator_1.isTranslatorConfig)(translatorCfgOrFactory)) {
            ctx = (0, translator_1.createTranslatorContext)(this, node, metadata, translatorCfgOrFactory.base);
            cfg = Object.assign(Object.assign({}, translatorCfgOrFactory.base), translatorCfgOrFactory(ctx));
        }
        else
            cfg = translatorCfgOrFactory;
        // Skip and don't check children if ignore flag set
        if (cfg.ignore)
            return;
        /* Update metadata if needed */
        if (cfg.noEscape && !(metadata === null || metadata === void 0 ? void 0 : metadata.noEscape)) {
            metadata = Object.assign(Object.assign({}, metadata), { noEscape: cfg.noEscape });
            this.nodeMetadata.set(node, metadata);
        }
        if (cfg.childTranslators && (cfg.childTranslators !== (metadata === null || metadata === void 0 ? void 0 : metadata.translators))) {
            metadata = Object.assign(Object.assign({}, metadata), { translators: cfg.childTranslators });
            this.nodeMetadata.set(node, metadata);
        }
        const startPosOuter = result.text.length;
        /* Write opening */
        if (cfg.surroundingNewlines)
            this.appendNewlines(+cfg.surroundingNewlines);
        if (cfg.prefix)
            this.appendResult(cfg.prefix);
        /* Write inner content */
        if (typeof cfg.content === 'string')
            this.appendResult(cfg.content, void 0, cfg.spaceIfRepeatingChar);
        else {
            const startPos = result.text.length;
            // Process child nodes
            for (const child of (0, utilities_1.getChildNodes)(node))
                this.visitNode(child, (cfg.recurse === false), metadata);
            /* Apply translator post-processing */
            if (cfg.postprocess) {
                const postRes = cfg.postprocess(Object.assign(Object.assign({}, (ctx || (0, translator_1.createTranslatorContext)(this, node, metadata))), { content: result.text.substr(startPos) }));
                // If remove flag sent, remove / omit everything for this node (prefix, newlines, content, postfix)
                if (postRes === translator_1.PostProcessResult.RemoveNode) {
                    if (node.tagName === 'LI' && (metadata === null || metadata === void 0 ? void 0 : metadata.listItemNumber))
                        --metadata.listItemNumber;
                    return this.appendResult('', startPosOuter);
                }
                if (typeof postRes === 'string')
                    this.appendResult(postRes, startPos, cfg.spaceIfRepeatingChar);
            }
        }
        /* Write closing */
        if (cfg.postfix)
            this.appendResult(cfg.postfix);
        if (cfg.surroundingNewlines)
            this.appendNewlines(+cfg.surroundingNewlines);
    }
}
exports.Visitor = Visitor;
// endregion
/* ****************************************************************************************************************** */
// region: Utilities
/* ****************************************************************************************************************** */
function getMarkdownForHtmlNodes(instance, rootNode, fileName) {
    (0, utilities_1.perfStart)('walk');
    const visitor = new Visitor(instance, rootNode, fileName);
    let result = visitor.result.text;
    (0, utilities_1.perfStop)('walk');
    /* Post-processing */
    // Add link references, if set
    if (instance.options.useLinkReferenceDefinitions) {
        if (/[^\r\n]/.test(result.slice(-1)))
            result += '\n';
        visitor.urlDefinitions.forEach((url, idx) => {
            result += `\n[${idx + 1}]: ${url}`;
        });
    }
    // Fixup repeating newlines
    const { maxConsecutiveNewlines } = instance.options;
    if (maxConsecutiveNewlines)
        result = result.replace(new RegExp(String.raw `(?:\r?\n\s*)+((?:\r?\n\s*){${maxConsecutiveNewlines}})`, 'g'), '$1');
    return (0, utilities_1.trimNewLines)(result);
}
exports.getMarkdownForHtmlNodes = getMarkdownForHtmlNodes;
// endregion
//# sourceMappingURL=visitor.js.map