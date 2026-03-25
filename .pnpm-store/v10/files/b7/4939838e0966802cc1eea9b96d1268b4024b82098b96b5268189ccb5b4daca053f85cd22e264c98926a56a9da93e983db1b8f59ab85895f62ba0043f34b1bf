'use strict';

const cssTree = require('css-tree');
const compress = require('./compress.cjs');
const specificity = require('./restructure/prepare/specificity.cjs');

function encodeString(value) {
    const stringApostrophe = cssTree.string.encode(value, true);
    const stringQuote = cssTree.string.encode(value);

    return stringApostrophe.length < stringQuote.length
        ? stringApostrophe
        : stringQuote;
}

const {
    lexer,
    tokenize,
    parse,
    generate,
    walk,
    find,
    findLast,
    findAll,
    fromPlainObject,
    toPlainObject
} = cssTree.fork({
    node: {
        String: {
            generate(node) {
                this.token(cssTree.tokenTypes.String, encodeString(node.value));
            }
        },
        Url: {
            generate(node) {
                const encodedUrl = cssTree.url.encode(node.value);
                const string = encodeString(node.value);

                this.token(cssTree.tokenTypes.Url,
                    encodedUrl.length <= string.length + 5 /* "url()".length */
                        ? encodedUrl
                        : 'url(' + string + ')'
                );
            }
        }
    }
});

exports.compress = compress;
exports.specificity = specificity;
exports.find = find;
exports.findAll = findAll;
exports.findLast = findLast;
exports.fromPlainObject = fromPlainObject;
exports.generate = generate;
exports.lexer = lexer;
exports.parse = parse;
exports.toPlainObject = toPlainObject;
exports.tokenize = tokenize;
exports.walk = walk;
