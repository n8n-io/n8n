'use strict';

const types = require('../../tokenizer/types.cjs');

const MediaFeatureToken = new Set([types.Colon, types.RightParenthesis, types.EOF]);

const name = 'MediaCondition';
const structure = {
    children: [[
        'Identifier',
        'MediaFeature',
        'MediaFeatureRange'
    ]]
};

function parse() {
    const children = this.createList();

    scan: while (!this.eof) {
        switch (this.tokenType) {
            case types.Comment:
            case types.WhiteSpace:
                this.next();
                continue;

            case types.Ident:
                children.push(this.Identifier());
                break;

            case types.LeftParenthesis:
                if (this.lookupTypeNonSC(1) === types.Ident && MediaFeatureToken.has(this.lookupTypeNonSC(2))) {
                    children.push(this.MediaFeature());
                } else if (this.lookupTypeNonSC(1) === types.LeftParenthesis || this.lookupTypeNonSC(2) === types.LeftParenthesis) {
                    this.next();
                    children.push(this.MediaCondition());
                    this.eat(types.RightParenthesis);
                } else {
                    children.push(this.MediaFeatureRange());
                }

                break;

            default:
                break scan;
        }
    }

    return {
        type: 'MediaCondition',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    node.children.forEach(child => {
        if (child.type === 'MediaCondition') {
            this.token(types.LeftParenthesis, '(');
            this.node(child);
            this.token(types.RightParenthesis, ')');
        } else {
            this.node(child);
        }
    });
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
