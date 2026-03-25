'use strict';

const types = require('../../tokenizer/types.cjs');

function consumeRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilSemicolonIncluded, true);
}

const name = 'DeclarationList';
const structure = {
    children: [[
        'Declaration'
    ]]
};

function parse() {
    const children = this.createList();

    while (!this.eof) {
        switch (this.tokenType) {
            case types.WhiteSpace:
            case types.Comment:
            case types.Semicolon:
                this.next();
                break;

            default:
                children.push(this.parseWithFallback(this.Declaration, consumeRaw));
        }
    }

    return {
        type: 'DeclarationList',
        loc: this.getLocationFromList(children),
        children
    };
}

function generate(node) {
    this.children(node, prev => {
        if (prev.type === 'Declaration') {
            this.token(types.Semicolon, ';');
        }
    });
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
