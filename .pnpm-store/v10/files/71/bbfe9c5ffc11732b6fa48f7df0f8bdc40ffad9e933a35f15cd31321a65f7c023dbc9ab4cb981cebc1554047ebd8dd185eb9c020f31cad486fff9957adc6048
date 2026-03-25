"use strict";
const util_1 = require("util");
const postcss_1 = require("postcss");
const postcss_values_parser_1 = require("postcss-values-parser");
const isUrl = require("is-url");
const debug = (0, util_1.debuglog)('detective-postcss');
function detective(src, options = { url: false }) {
    let references = [];
    let root;
    try {
        root = (0, postcss_1.parse)(src);
    }
    catch {
        throw new detective.MalformedCssError();
    }
    root.walkAtRules((rule) => {
        let file = null;
        if (isImportRule(rule)) {
            const firstNode = parseValue(rule.params).first;
            file = getValueOrUrl(firstNode);
            if (file) {
                debug('found %s of %s', '@import', file);
            }
        }
        if (isValueRule(rule)) {
            const lastNode = parseValue(rule.params).last;
            const prevNode = lastNode.prev();
            if (prevNode && isFrom(prevNode)) {
                file = getValueOrUrl(lastNode);
                if (file) {
                    debug('found %s of %s', '@value with import', file);
                }
            }
            if (options.url && isUrlNode(lastNode)) {
                file = getValueOrUrl(lastNode);
                if (file) {
                    debug('found %s of %s', 'url() with import', file);
                }
            }
        }
        if (file)
            references.push(file);
    });
    if (!options.url)
        return references;
    root.walkDecls((decl) => {
        const { nodes } = parseValue(decl.value);
        const files = nodes
            .filter((node) => isUrlNode(node))
            .map((node) => getValueOrUrl(node));
        if (files) {
            for (const file of files) {
                debug('found %s of %s', 'url() with import', file);
            }
            references = references.concat(files);
        }
    });
    return references;
}
function parseValue(value) {
    return (0, postcss_values_parser_1.parse)(value);
}
function getValueOrUrl(node) {
    // ['file']
    const ret = isUrlNode(node) ? getValue(node.nodes[0]) : getValue(node);
    // is-url sometimes gets data: URLs wrong
    return !isUrl(ret) && !ret.startsWith('data:') && ret;
}
function getValue(node) {
    if (!isNodeWithValue(node)) {
        throw new Error('Unexpectedly found a node without a value');
    }
    return node.type === 'quoted' ? node.contents : node.value;
}
function isNodeWithValue(node) {
    return ['word', 'numeric', 'operator', 'punctuation', 'quoted'].includes(node.type);
}
function isUrlNode(node) {
    return node.type === 'func' && node.name === 'url';
}
function isValueRule(rule) {
    return rule.name === 'value';
}
function isImportRule(rule) {
    return rule.name === 'import';
}
function isFrom(node) {
    return node.type === 'word' && node.value === 'from';
}
(function (detective) {
    class MalformedCssError extends Error {
    }
    detective.MalformedCssError = MalformedCssError;
})(detective || (detective = {}));
module.exports = detective;
