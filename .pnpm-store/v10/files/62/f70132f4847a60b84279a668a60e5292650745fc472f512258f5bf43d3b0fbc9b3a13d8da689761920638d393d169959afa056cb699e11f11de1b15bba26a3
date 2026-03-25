'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'LayerNameList';
const structure = {
    children: [[
        'MediaQuery'
    ]]
};

function parse() {
    const children = this.createList();

    this.skipSC();

    while (!this.eof) {
        children.push(this.LayerName());

        if (this.tokenType !== types.Comma) {
            break;
        }

        this.next();
        this.skipSC();
    }

    return {
        type: 'LayerNameList',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node, () => this.token(types.Comma, ','));
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
