'use strict';

const cssTree = require('css-tree');
const keyframes = require('./atrule/keyframes.cjs');

function Atrule(node) {
    // compress @keyframe selectors
    if (cssTree.keyword(node.name).basename === 'keyframes') {
        keyframes(node);
    }
}

module.exports = Atrule;
