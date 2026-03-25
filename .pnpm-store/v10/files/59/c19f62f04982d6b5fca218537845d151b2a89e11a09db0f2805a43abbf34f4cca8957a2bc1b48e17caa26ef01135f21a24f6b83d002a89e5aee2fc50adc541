'use strict';

const cssTree = require('css-tree');
const Atrule = require('./Atrule.cjs');
const Comment = require('./Comment.cjs');
const Declaration = require('./Declaration.cjs');
const Raw = require('./Raw.cjs');
const Rule = require('./Rule.cjs');
const TypeSelector = require('./TypeSelector.cjs');
const WhiteSpace = require('./WhiteSpace.cjs');

const handlers = {
    Atrule,
    Comment,
    Declaration,
    Raw,
    Rule,
    TypeSelector,
    WhiteSpace
};

function clean(ast, options) {
    cssTree.walk(ast, {
        leave(node, item, list) {
            if (handlers.hasOwnProperty(node.type)) {
                handlers[node.type].call(this, node, item, list, options);
            }
        }
    });
}

module.exports = clean;
