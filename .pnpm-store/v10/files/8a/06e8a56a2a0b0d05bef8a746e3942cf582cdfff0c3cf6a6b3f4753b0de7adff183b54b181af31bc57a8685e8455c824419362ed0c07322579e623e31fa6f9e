'use strict';

const cssTree = require('css-tree');
const Atrule = require('./Atrule.cjs');
const AttributeSelector = require('./AttributeSelector.cjs');
const Value = require('./Value.cjs');
const Dimension = require('./Dimension.cjs');
const Percentage = require('./Percentage.cjs');
const _Number = require('./Number.cjs');
const Url = require('./Url.cjs');
const color = require('./color.cjs');

const handlers = {
    Atrule,
    AttributeSelector,
    Value,
    Dimension,
    Percentage,
    Number: _Number.Number,
    Url,
    Hash: color.compressHex,
    Identifier: color.compressIdent,
    Function: color.compressFunction
};

function replace(ast) {
    cssTree.walk(ast, {
        leave(node, item, list) {
            if (handlers.hasOwnProperty(node.type)) {
                handlers[node.type].call(this, node, item, list);
            }
        }
    });
}

module.exports = replace;
