'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'Feature';
const structure = {
    kind: String,
    name: String,
    value: ['Identifier', 'Number', 'Dimension', 'Ratio', null]
};

function parse(kind = 'unknown') {
    const start = this.tokenStart;
    let name;
    let value = null;

    this.eat(types.LeftParenthesis);
    this.skipSC();

    name = this.consume(types.Ident);
    this.skipSC();

    if (this.tokenType !== types.RightParenthesis) {
        this.eat(types.Colon);
        this.skipSC();

        switch (this.tokenType) {
            case types.Number:
                if (this.lookupNonWSType(1) === types.Delim) {
                    value = this.Ratio();
                } else {
                    value = this.Number();
                }

                break;

            case types.Dimension:
                value = this.Dimension();
                break;

            case types.Ident:
                value = this.Identifier();
                break;

            default:
                this.error('Number, dimension, ratio or identifier is expected');
        }

        this.skipSC();
    }

    this.eat(types.RightParenthesis);

    return {
        type: 'Feature',
        loc: this.getLocation(start, this.tokenStart),
        kind,
        name,
        value
    };
}

function generate(node) {
    this.token(types.LeftParenthesis, '(');
    this.token(types.Ident, node.name);

    if (node.value !== null) {
        this.token(types.Colon, ':');
        this.node(node.value);
    }

    this.token(types.RightParenthesis, ')');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
