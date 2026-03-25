"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeHtmlParserConfig = exports.aTagTranslatorConfig = exports.defaultCodeBlockTranslators = exports.tableCellTranslatorConfig = exports.tableRowTranslatorConfig = exports.tableTranslatorConfig = exports.defaultTranslators = exports.defaultOptions = exports.contentlessElements = exports.defaultIgnoreElements = exports.defaultBlockElements = void 0;
const utilities_1 = require("./utilities");
const translator_1 = require("./translator");
/* ****************************************************************************************************************** */
// region: Elements
/* ****************************************************************************************************************** */
exports.defaultBlockElements = [
    'ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS', 'CENTER', 'DD', 'DIR', 'DIV', 'DL',
    'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES', 'NOSCRIPT', 'OL',
    'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
];
exports.defaultIgnoreElements = [
    'AREA', 'BASE', 'COL', 'COMMAND', 'EMBED', 'HEAD', 'INPUT', 'KEYGEN', 'LINK', 'META', 'PARAM', 'SCRIPT',
    'SOURCE', 'STYLE', 'TRACK', 'WBR'
];
exports.contentlessElements = ['BR', 'HR', 'IMG'];
// endregion
/* ****************************************************************************************************************** */
// region: Options
/* ****************************************************************************************************************** */
// noinspection RegExpUnnecessaryNonCapturingGroup
exports.defaultOptions = Object.freeze({
    preferNativeParser: false,
    codeFence: '```',
    bulletMarker: '*',
    indent: '  ',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    strongDelimiter: '**',
    maxConsecutiveNewlines: 3,
    /**
     * Character:               Affects:                       Example:
     *
     *     \                      Escaping                        \-
     *     `                      Code                            `` code ``,  ```lang\n code block \n```
     *     *                      Bullet & Separators             * item,  ***
     *     _                      Bold, Italics, Separator        _italic_,  __bold__,  ^___
     *     ~                      Strikethrough, Code             ~~strike~~,  ~~~lang\n code block \n~~~
     *     [                      Url                             [caption](url)
     *     ]                      Url                             [caption](url)
     */
    globalEscape: [/[\\`*_~\[\]]/gm, '\\$&'],
    /**
     * Note:  The following compiled pattern was selected after perf testing various alternatives.
     *        Please be mindful of performance if updating/changing it.
     *
     * Sequence:                Affects:                        Example:
     *
     *    +(space)                Bullets                         + item
     *    =                       Heading                         heading\n====
     *    #{1,6}(space)           Heading                         ## Heading
     *    >                       Blockquote                      > quote
     *    -                       Bullet, Header, Separator       - item, heading\n---, ---
     *    \d+\.(space)            Numbered list item              1. Item
     */
    lineStartEscape: [
        /^(\s*?)((?:\+\s)|(?:[=>-])|(?:#{1,6}\s))|(?:(\d+)(\.\s))/gm,
        '$1$3\\$2$4'
    ]
});
// endregion
/* ****************************************************************************************************************** */
// region: Translators
/* ****************************************************************************************************************** */
exports.defaultTranslators = {
    /* Pre-formatted text */
    'pre': { noEscape: true, preserveWhitespace: true },
    /* Line break */
    'br': { content: `  \n`, recurse: false },
    /* Horizontal Rule*/
    'hr': { content: '---', recurse: false },
    /* Headings */
    'h1,h2,h3,h4,h5,h6': ({ node }) => ({
        prefix: '#'.repeat(+node.tagName.charAt(1)) + ' '
    }),
    /* Bold / Strong */
    'strong,b': {
        spaceIfRepeatingChar: true,
        postprocess: ({ content, options: { strongDelimiter } }) => (0, utilities_1.isWhiteSpaceOnly)(content)
            ? translator_1.PostProcessResult.RemoveNode
            : (0, utilities_1.tagSurround)(content, strongDelimiter)
    },
    /* Strikethrough */
    'del,s,strike': {
        spaceIfRepeatingChar: true,
        postprocess: ({ content }) => (0, utilities_1.isWhiteSpaceOnly)(content)
            ? translator_1.PostProcessResult.RemoveNode
            : (0, utilities_1.tagSurround)(content, '~~')
    },
    /* Italic / Emphasis */
    'em,i': {
        spaceIfRepeatingChar: true,
        postprocess: ({ content, options: { emDelimiter } }) => (0, utilities_1.isWhiteSpaceOnly)(content)
            ? translator_1.PostProcessResult.RemoveNode
            : (0, utilities_1.tagSurround)(content, emDelimiter)
    },
    /* Lists (ordered & unordered) */
    'ol,ul': ({ listKind }) => ({
        surroundingNewlines: listKind ? 1 : 2,
    }),
    /* List Item */
    'li': ({ options: { bulletMarker }, indentLevel, listKind, listItemNumber }) => {
        const indentationLevel = +(indentLevel || 0);
        return {
            prefix: '   '.repeat(+(indentLevel || 0)) +
                (((listKind === 'OL') && (listItemNumber !== undefined)) ? `${listItemNumber}. ` : `${bulletMarker} `),
            surroundingNewlines: 1,
            postprocess: ({ content }) => (0, utilities_1.isWhiteSpaceOnly)(content)
                ? translator_1.PostProcessResult.RemoveNode
                : content
                    .trim()
                    .replace(/([^\r\n])(?:\r?\n)+/g, `$1  \n${'   '.repeat(indentationLevel)}`)
                    .replace(/(\S+?)[^\S\r\n]+$/gm, '$1  ')
        };
    },
    /* Block Quote */
    'blockquote': {
        postprocess: ({ content }) => (0, utilities_1.trimNewLines)(content).replace(/^(>*)[^\S\r\n]?/gm, `>$1 `)
    },
    /* Code (block / inline) */
    'code': ({ node, parent, options: { codeFence, codeBlockStyle }, visitor }) => {
        var _a, _b;
        const isCodeBlock = ['PRE', 'WRAPPED-PRE'].includes(parent === null || parent === void 0 ? void 0 : parent.tagName) && parent.childNodes.length < 2;
        /* Handle code (non-block) */
        if (!isCodeBlock)
            return {
                spaceIfRepeatingChar: true,
                noEscape: true,
                postprocess: ({ content }) => {
                    var _a, _b;
                    // Find longest occurring sequence of running backticks and add one more (so content is escaped)
                    const delimiter = '`' + (((_b = (_a = content.match(/`+/g)) === null || _a === void 0 ? void 0 : _a.sort((a, b) => b.length - a.length)) === null || _b === void 0 ? void 0 : _b[0]) || '');
                    const padding = delimiter.length > 1 ? ' ' : '';
                    return (0, utilities_1.surround)((0, utilities_1.surround)(content, padding), delimiter);
                }
            };
        /* Handle code block */
        if (codeBlockStyle === 'fenced') {
            const language = ((_b = (_a = node.getAttribute('class')) === null || _a === void 0 ? void 0 : _a.match(/language-(\S+)/)) === null || _b === void 0 ? void 0 : _b[1]) || '';
            return {
                noEscape: true,
                prefix: codeFence + language + '\n',
                postfix: '\n' + codeFence,
                childTranslators: visitor.instance.codeBlockTranslators
            };
        }
        else {
            return {
                noEscape: true,
                postprocess: ({ content }) => content.replace(/^/gm, '    '),
                childTranslators: visitor.instance.codeBlockTranslators
            };
        }
    },
    /* Table */
    'table': ({ visitor }) => ({
        surroundingNewlines: 2,
        childTranslators: visitor.instance.tableTranslators,
        postprocess: ({ content, nodeMetadata, node }) => {
            // Split and trim leading + trailing pipes
            const rawRows = (0, utilities_1.splitSpecial)(content).map(({ text }) => text.replace(/^(?:\|\s+)?(.+)\s*\|\s*$/, '$1'));
            /* Get Row Data */
            const rows = [];
            let colWidth = [];
            for (const row of rawRows) {
                if (!row)
                    continue;
                /* Track columns */
                const cols = row.split(' |').map((c, i) => {
                    c = c.trim();
                    if (colWidth.length < i + 1 || colWidth[i] < c.length)
                        colWidth[i] = c.length;
                    return c;
                });
                rows.push(cols);
            }
            if (rows.length < 1)
                return translator_1.PostProcessResult.RemoveNode;
            /* Compose Table */
            const maxCols = colWidth.length;
            let res = '';
            const caption = nodeMetadata.get(node).tableMeta.caption;
            if (caption)
                res += caption + '\n';
            rows.forEach((cols, rowNumber) => {
                var _a;
                res += '| ';
                /* Add Columns */
                for (let i = 0; i < maxCols; i++) {
                    let c = ((_a = cols[i]) !== null && _a !== void 0 ? _a : '');
                    c += ' '.repeat(Math.max(0, (colWidth[i] - c.length))); // Pad to max length
                    res += c + ' |' + (i < maxCols - 1 ? ' ' : '');
                }
                res += '\n';
                // Add separator row
                if (rowNumber === 0)
                    res += '|' + colWidth.map(w => ' ' + '-'.repeat(w) + ' |').join('') + '\n';
            });
            return res;
        }
    }),
    /* Link */
    'a': ({ node, options, visitor }) => {
        const href = node.getAttribute('href');
        if (!href)
            return {};
        // Encodes symbols that can cause problems in markdown
        let encodedHref = '';
        for (const chr of href) {
            switch (chr) {
                case '(':
                    encodedHref += '%28';
                    break;
                case ')':
                    encodedHref += '%29';
                    break;
                case '_':
                    encodedHref += '%5F';
                    break;
                case '*':
                    encodedHref += '%2A';
                    break;
                default:
                    encodedHref += chr;
            }
        }
        const title = node.getAttribute('title');
        // Inline link, when possible
        // See: https://github.com/crosstype/node-html-markdown/issues/17
        if (node.textContent === href)
            return { content: `<${encodedHref}>` };
        return {
            postprocess: ({ content }) => content.replace(/(?:\r?\n)+/g, ' '),
            childTranslators: visitor.instance.aTagTranslators,
            prefix: '[',
            postfix: ']' + (!options.useLinkReferenceDefinitions
                ? `(${encodedHref}${title ? ` "${title}"` : ''})`
                : `[${visitor.addOrGetUrlDefinition(encodedHref)}]`)
        };
    },
    /* Image */
    'img': ({ node, options }) => {
        const src = node.getAttribute('src') || '';
        if (!src || (!options.keepDataImages && /^data:/i.test(src)))
            return { ignore: true };
        const alt = node.getAttribute('alt') || '';
        const title = node.getAttribute('title') || '';
        return {
            content: `![${alt}](${src}${title && ` "${title}"`})`,
            recurse: false
        };
    },
};
exports.tableTranslatorConfig = {
    /* Table Caption */
    'caption': ({ visitor }) => ({
        surroundingNewlines: false,
        childTranslators: visitor.instance.tableCellTranslators,
        postprocess: ({ content, nodeMetadata, node }) => {
            const caption = content.replace(/(?:\r?\n)+/g, ' ').trim();
            if (caption)
                nodeMetadata.get(node).tableMeta.caption = '__' + caption + '__';
            return translator_1.PostProcessResult.RemoveNode;
        },
    }),
    /* Table row */
    'tr': ({ visitor }) => ({
        surroundingNewlines: false,
        childTranslators: visitor.instance.tableRowTranslators,
        postfix: '\n',
        prefix: '| ',
        postprocess: ({ content }) => !/ \|\s*$/.test(content) ? translator_1.PostProcessResult.RemoveNode : content
    }),
    /* Table cell, (header cell) */
    'th,td': ({ visitor }) => ({
        surroundingNewlines: false,
        childTranslators: visitor.instance.tableCellTranslators,
        prefix: ' ',
        postfix: ' |',
        postprocess: ({ content }) => (0, utilities_1.trimNewLines)(content)
            .replace('|', '\\|')
            .replace(/(?:\r?\n)+/g, ' ')
            .trim()
    }),
};
exports.tableRowTranslatorConfig = {
    'th,td': exports.tableTranslatorConfig['th,td']
};
exports.tableCellTranslatorConfig = {
    'a': exports.defaultTranslators['a'],
    'strong,b': exports.defaultTranslators['strong,b'],
    'del,s,strike': exports.defaultTranslators['del,s,strike'],
    'em,i': exports.defaultTranslators['em,i'],
    'img': exports.defaultTranslators['img']
};
exports.defaultCodeBlockTranslators = {
    'br': { content: `\n`, recurse: false },
    'hr': { content: '---', recurse: false },
    'h1,h2,h3,h4,h5,h6': { prefix: '[', postfix: ']' },
    'ol,ul': exports.defaultTranslators['ol,ul'],
    'li': exports.defaultTranslators['li'],
    'tr': { surroundingNewlines: true },
    'img': { recurse: false }
};
exports.aTagTranslatorConfig = {
    'br': { content: '\n', recurse: false },
    'hr': { content: '\n', recurse: false },
    'pre': exports.defaultTranslators['pre'],
    'strong,b': exports.defaultTranslators['strong,b'],
    'del,s,strike': exports.defaultTranslators['del,s,strike'],
    'em,i': exports.defaultTranslators['em,i'],
    'img': exports.defaultTranslators['img']
};
// endregion
/* ****************************************************************************************************************** */
// region: General
/* ****************************************************************************************************************** */
/**
 * Note: Do not change - values are tuned for performance
 */
exports.nodeHtmlParserConfig = {
    lowerCaseTagName: false,
    comment: false,
    blockTextElements: {
        script: false,
        noscript: false,
        style: false
    }
};
// endregion
//# sourceMappingURL=config.js.map