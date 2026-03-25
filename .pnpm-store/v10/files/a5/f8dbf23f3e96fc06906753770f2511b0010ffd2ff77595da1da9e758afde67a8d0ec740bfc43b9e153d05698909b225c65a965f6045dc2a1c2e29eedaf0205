import {
    WhiteSpace,
    Comment,
    Ident,
    Function,
    Colon,
    LeftParenthesis
} from '../../tokenizer/index.js';

function consumeRaw() {
    return this.createSingleNodeList(
        this.Raw(this.tokenIndex, null, false)
    );
}

function parentheses() {
    this.skipSC();

    if (this.tokenType === Ident &&
        this.lookupNonWSType(1) === Colon) {
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
            case Comment:
            case WhiteSpace:
                this.next();
                continue;

            case Function:
                child = this.Function(consumeRaw, this.scope.AtrulePrelude);
                break;

            case Ident:
                child = this.Identifier();
                break;

            case LeftParenthesis:
                child = this.Parentheses(parentheses, this.scope.AtrulePrelude);
                break;

            default:
                break scan;
        }

        children.push(child);
    }

    return children;
}

export default {
    parse: {
        prelude() {
            const children = readSequence.call(this);

            if (this.getFirstListNode(children) === null) {
                this.error('Condition is expected');
            }

            return children;
        },
        block() {
            return this.Block(false);
        }
    }
};
