'use strict';

const cssTree = require('css-tree');
const font = require('./property/font.cjs');
const fontWeight = require('./property/font-weight.cjs');
const background = require('./property/background.cjs');
const border = require('./property/border.cjs');

const handlers = {
    'font': font,
    'font-weight': fontWeight,
    'background': background,
    'border': border,
    'outline': border
};

function compressValue(node) {
    if (!this.declaration) {
        return;
    }

    const property = cssTree.property(this.declaration.property);

    if (handlers.hasOwnProperty(property.basename)) {
        handlers[property.basename](node);
    }
}

module.exports = compressValue;
