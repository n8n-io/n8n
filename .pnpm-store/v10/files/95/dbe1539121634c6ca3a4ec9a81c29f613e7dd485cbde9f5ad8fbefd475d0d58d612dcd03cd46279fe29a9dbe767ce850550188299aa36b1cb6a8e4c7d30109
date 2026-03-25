'use strict';

const cssTree = require('css-tree');

class Index {
    constructor() {
        this.map = new Map();
    }
    resolve(str) {
        let index = this.map.get(str);

        if (index === undefined) {
            index = this.map.size + 1;
            this.map.set(str, index);
        }

        return index;
    }
}
function createDeclarationIndexer() {
    const ids = new Index();

    return function markDeclaration(node) {
        const id = cssTree.generate(node);

        node.id = ids.resolve(id);
        node.length = id.length;
        node.fingerprint = null;

        return node;
    };
}

module.exports = createDeclarationIndexer;
