'use strict';

const types = require('../../tokenizer/types.cjs');

function consumeRaw() {
    return this.createSingleNodeList(
        this.Raw(this.tokenIndex, null, false)
    );
}

function parentheses() {
    this.skipSC();

    if (this.tokenType === types.Ident &&
        this.lookupNonWSType(1) === types.Colon) {
        return this.createSingleNodeList(
            this.Declaration()
        );
    }

    return readSequence.call(this);
}

function readSequence() {
    const children = this.createList();
    let child;

    this.skipSC();

    scan:
    while (!this.eof) {
        switch (this.tokenType) {
            case types.Comment:
            case types.WhiteSpace:
                this.next();
                continue;

            case types.Function:
                child = this.Function(consumeRaw, this.scope.AtrulePrelude);
                break;

            case types.Ident:
                child = this.Identifier();
                break;

            case types.LeftParenthesis:
                child = this.Parentheses(parentheses, this.scope.AtrulePrelude);
                break;

            default:
                break scan;
        }

        children.push(child);
    }

    return children;
}

const supports = {
    parse: {
        prelude() {
            const children = readSequence.call(this);

            if (this.getFirstListNode(children) === null) {
                this.error('Condition is expected');
            }

            return children;
        },
        block(isStyleBlock = false) {
            return this.Block(isStyleBlock);
        }
    }
};

module.exports = supports;
