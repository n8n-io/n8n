import {
    Ident,
    Number,
    Dimension,
    LeftParenthesis,
    RightParenthesis,
    Colon,
    Delim
} from '../../tokenizer/index.js';

export const name = 'MediaFeature';
export const structure = {
    name: String,
    value: ['Identifier', 'Number', 'Dimension', 'Ratio', null]
};

export function parse() {
    const start = this.tokenStart;
    let name;
    let value = null;

    this.eat(LeftParenthesis);
    this.skipSC();

    name = this.consume(Ident);
    this.skipSC();

    if (this.tokenType !== RightParenthesis) {
        this.eat(Colon);
        this.skipSC();

        switch (this.tokenType) {
            case Number:
                if (this.lookupNonWSType(1) === Delim) {
                    value = this.Ratio();
                } else {
                    value = this.Number();
                }

                break;

            case Dimension:
                value = this.Dimension();
                break;

            case Ident:
                value = this.Identifier();
                break;

            default:
                this.error('Number, dimension, ratio or identifier is expected');
        }

        this.skipSC();
    }

    this.eat(RightParenthesis);

    return {
        type: 'MediaFeature',
        loc: this.getLocation(start, this.tokenStart),
        name,
        value
    };
}

export function generate(node) {
    this.token(LeftParenthesis, '(');
    this.token(Ident, node.name);

    if (node.value !== null) {
        this.token(Colon, ':');
        this.node(node.value);
    }

    this.token(RightParenthesis, ')');
}
