import {
    WhiteSpace,
    Comment,
    Ident,
    LeftParenthesis
} from '../../tokenizer/index.js';

export const name = 'MediaQuery';
export const structure = {
    children: [[
        'Identifier',
        'MediaFeature',
        'WhiteSpace'
    ]]
};

export function parse() {
    const children = this.createList();
    let child = null;

    this.skipSC();

    scan:
    while (!this.eof) {
        switch (this.tokenType) {
            case Comment:
            case WhiteSpace:
                this.next();
                continue;

            case Ident:
                child = this.Identifier();
                break;

            case LeftParenthesis:
                child = this.MediaFeature();
                break;

            default:
                break scan;
        }

        children.push(child);
    }

    if (child === null) {
        this.error('Identifier or parenthesis is expected');
    }

    return {
        type: 'MediaQuery',
        loc: this.getLocationFromList(children),
        children
    };
}

export function generate(node) {
    this.children(node);
}

