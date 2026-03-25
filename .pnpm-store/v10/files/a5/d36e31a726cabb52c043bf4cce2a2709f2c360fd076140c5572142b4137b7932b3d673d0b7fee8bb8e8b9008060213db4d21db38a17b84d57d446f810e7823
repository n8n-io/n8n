'use strict';

const types = require('../../../tokenizer/types.cjs');

const LESSTHANSIGN = 60;    // <
const EQUALSIGN = 61;       // =
const GREATERTHANSIGN = 62; // >

const structure = {
    left: ['Identifier', 'Number', 'Dimension', 'Ratio'],
    leftComparison: String,
    middle: ['Identifier', 'Number', 'Dimension', 'Ratio'],
    rightComparison: [String, null],
    right: ['Identifier', 'Number', 'Dimension', 'Ratio', null]
};

function readTerm() {
    this.skipSC();

    switch (this.tokenType) {
        case types.Number:
            if (this.lookupNonWSType(1) === types.Delim) {
                return this.Ratio();
            } else {
                return this.Number();
            }

        case types.Dimension:
            return this.Dimension();

        case types.Ident:
            return this.Identifier();

        default:
            this.error('Number, dimension, ratio or identifier is expected');
    }
}

function readComparison(expectColon) {
    this.skipSC();

    if (this.isDelim(LESSTHANSIGN) ||
        this.isDelim(GREATERTHANSIGN)) {
        const value = this.source[this.tokenStart];

        this.next();

        if (this.isDelim(EQUALSIGN)) {
            this.next();
            return value + '=';
        }

        return value;
    }

    if (this.isDelim(EQUALSIGN)) {
        return '=';
    }

    this.error(`Expected ${expectColon ? '":", ' : ''}"<", ">", "=" or ")"`);
}

function createParse(type) {
    return function parse() {
        const start = this.tokenStart;

        this.skipSC();
        this.eat(types.LeftParenthesis);

        const left = readTerm.call(this);
        const leftComparison = readComparison.call(this, left.type === 'Identifier');
        const middle = readTerm.call(this);
        let rightComparison = null;
        let right = null;

        if (this.lookupNonWSType(0) !== types.RightParenthesis) {
            rightComparison = readComparison.call(this);
            right = readTerm.call(this);
        }

        this.skipSC();
        this.eat(types.RightParenthesis);

        return {
            type,
            loc: this.getLocation(start, this.tokenStart),
            left,
            leftComparison,
            middle,
            rightComparison,
            right
        };
    };
}

function generate(node) {
    this.token(types.LeftParenthesis, '(');
    this.node(node.left);
    this.tokenize(node.leftComparison);
    this.node(node.middle);

    if (node.right) {
        this.tokenize(node.rightComparison);
        this.node(node.right);
    }

    this.token(types.RightParenthesis, ')');
}

exports.createParse = createParse;
exports.generate = generate;
exports.structure = structure;
