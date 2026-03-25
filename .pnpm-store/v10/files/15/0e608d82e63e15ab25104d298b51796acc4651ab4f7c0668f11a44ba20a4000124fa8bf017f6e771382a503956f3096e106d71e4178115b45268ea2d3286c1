'use strict';

const cssTree = require('css-tree');
const usage = require('./usage.cjs');
const index = require('./clean/index.cjs');
const index$1 = require('./replace/index.cjs');
const index$2 = require('./restructure/index.cjs');

function readChunk(input, specialComments) {
    const children = new cssTree.List();
    let nonSpaceTokenInBuffer = false;
    let protectedComment;

    input.nextUntil(input.head, (node, item, list) => {
        if (node.type === 'Comment') {
            if (!specialComments || node.value.charAt(0) !== '!') {
                list.remove(item);
                return;
            }

            if (nonSpaceTokenInBuffer || protectedComment) {
                return true;
            }

            list.remove(item);
            protectedComment = node;

            return;
        }

        if (node.type !== 'WhiteSpace') {
            nonSpaceTokenInBuffer = true;
        }

        children.insert(list.remove(item));
    });

    return {
        comment: protectedComment,
        stylesheet: {
            type: 'StyleSheet',
            loc: null,
            children
        }
    };
}

function compressChunk(ast, firstAtrulesAllowed, num, options) {
    options.logger(`Compress block #${num}`, null, true);

    let seed = 1;

    if (ast.type === 'StyleSheet') {
        ast.firstAtrulesAllowed = firstAtrulesAllowed;
        ast.id = seed++;
    }

    cssTree.walk(ast, {
        visit: 'Atrule',
        enter(node) {
            if (node.block !== null) {
                node.block.id = seed++;
            }
        }
    });
    options.logger('init', ast);

    // remove redundant
    index(ast, options);
    options.logger('clean', ast);

    // replace nodes for shortened forms
    index$1(ast);
    options.logger('replace', ast);

    // structure optimisations
    if (options.restructuring) {
        index$2(ast, options);
    }

    return ast;
}

function getCommentsOption(options) {
    let comments = 'comments' in options ? options.comments : 'exclamation';

    if (typeof comments === 'boolean') {
        comments = comments ? 'exclamation' : false;
    } else if (comments !== 'exclamation' && comments !== 'first-exclamation') {
        comments = false;
    }

    return comments;
}

function getRestructureOption(options) {
    if ('restructure' in options) {
        return options.restructure;
    }

    return 'restructuring' in options ? options.restructuring : true;
}

function wrapBlock(block) {
    return new cssTree.List().appendData({
        type: 'Rule',
        loc: null,
        prelude: {
            type: 'SelectorList',
            loc: null,
            children: new cssTree.List().appendData({
                type: 'Selector',
                loc: null,
                children: new cssTree.List().appendData({
                    type: 'TypeSelector',
                    loc: null,
                    name: 'x'
                })
            })
        },
        block
    });
}

function compress(ast, options) {
    ast = ast || { type: 'StyleSheet', loc: null, children: new cssTree.List() };
    options = options || {};

    const compressOptions = {
        logger: typeof options.logger === 'function' ? options.logger : function() {},
        restructuring: getRestructureOption(options),
        forceMediaMerge: Boolean(options.forceMediaMerge),
        usage: options.usage ? usage.buildIndex(options.usage) : false
    };
    const output = new cssTree.List();
    let specialComments = getCommentsOption(options);
    let firstAtrulesAllowed = true;
    let input;
    let chunk;
    let chunkNum = 1;
    let chunkChildren;

    if (options.clone) {
        ast = cssTree.clone(ast);
    }

    if (ast.type === 'StyleSheet') {
        input = ast.children;
        ast.children = output;
    } else {
        input = wrapBlock(ast);
    }

    do {
        chunk = readChunk(input, Boolean(specialComments));
        compressChunk(chunk.stylesheet, firstAtrulesAllowed, chunkNum++, compressOptions);
        chunkChildren = chunk.stylesheet.children;

        if (chunk.comment) {
            // add \n before comment if there is another content in output
            if (!output.isEmpty) {
                output.insert(cssTree.List.createItem({
                    type: 'Raw',
                    value: '\n'
                }));
            }

            output.insert(cssTree.List.createItem(chunk.comment));

            // add \n after comment if chunk is not empty
            if (!chunkChildren.isEmpty) {
                output.insert(cssTree.List.createItem({
                    type: 'Raw',
                    value: '\n'
                }));
            }
        }

        if (firstAtrulesAllowed && !chunkChildren.isEmpty) {
            const lastRule = chunkChildren.last;

            if (lastRule.type !== 'Atrule' ||
               (lastRule.name !== 'import' && lastRule.name !== 'charset')) {
                firstAtrulesAllowed = false;
            }
        }

        if (specialComments !== 'exclamation') {
            specialComments = false;
        }

        output.appendList(chunkChildren);
    } while (!input.isEmpty);

    return {
        ast
    };
}

module.exports = compress;
