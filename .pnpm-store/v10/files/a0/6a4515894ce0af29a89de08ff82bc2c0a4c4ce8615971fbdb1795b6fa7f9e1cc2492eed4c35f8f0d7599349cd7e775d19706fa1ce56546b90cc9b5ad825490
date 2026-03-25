'use strict';

const cssTree = require('css-tree');

function cleanDeclartion(node, item, list) {
    if (node.value.children && node.value.children.isEmpty) {
        list.remove(item);
        return;
    }

    if (cssTree.property(node.property).custom) {
        if (/\S/.test(node.value.value)) {
            node.value.value = node.value.value.trim();
        }
    }
}

module.exports = cleanDeclartion;
