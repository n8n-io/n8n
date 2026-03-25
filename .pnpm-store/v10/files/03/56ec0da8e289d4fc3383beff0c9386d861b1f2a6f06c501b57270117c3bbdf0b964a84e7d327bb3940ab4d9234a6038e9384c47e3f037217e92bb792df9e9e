'use strict';

const cssTree = require('css-tree');
const _Number = require('./Number.cjs');

const blacklist = new Set([
    // see https://github.com/jakubpawlowicz/clean-css/issues/957
    'width',
    'min-width',
    'max-width',
    'height',
    'min-height',
    'max-height',

    // issue #410: Don’t remove units in flex-basis value for (-ms-)flex shorthand
    // issue #362: shouldn't remove unit in -ms-flex since it breaks flex in IE10/11
    // issue #200: shouldn't remove unit in flex since it breaks flex in IE10/11
    'flex',
    '-ms-flex'
]);

function compressPercentage(node, item) {
    node.value = _Number.packNumber(node.value);

    if (node.value === '0' && this.declaration && !blacklist.has(this.declaration.property)) {
        // try to convert a number
        item.data = {
            type: 'Number',
            loc: node.loc,
            value: node.value
        };

        // that's ok only when new value matches on length
        if (!cssTree.lexer.matchDeclaration(this.declaration).isType(item.data, 'length')) {
            // otherwise rollback changes
            item.data = node;
        }
    }
}

module.exports = compressPercentage;
