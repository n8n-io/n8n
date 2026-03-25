'use strict';

const types = require('../../tokenizer/types.cjs');

const FULLSTOP = 0x002E; // U+002E FULL STOP (.)

const name = 'LayerName';
const structure = {
    name: String
};

function parse() {
    let name = this.consume(types.Ident);

    while (this.isDelim(FULLSTOP)) {
        this.eat(types.Delim);
        name += '.' + this.consume(types.Ident);
    }

    return {
        type: 'LayerName',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        name
    };
}

function generate(node) {
    this.tokenize(node.name);
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
