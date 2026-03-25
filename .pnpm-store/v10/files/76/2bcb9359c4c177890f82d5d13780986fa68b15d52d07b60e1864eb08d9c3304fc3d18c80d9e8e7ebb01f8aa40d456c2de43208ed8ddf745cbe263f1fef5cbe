'use strict';

const utils = require('./utils.cjs');

function cleanRaw(node, item, list) {
    // raw in stylesheet or block children
    if (utils.isNodeChildrenList(this.stylesheet, list) ||
        utils.isNodeChildrenList(this.block, list)) {
        list.remove(item);
    }
}

module.exports = cleanRaw;
