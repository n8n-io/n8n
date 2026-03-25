import {
    WhiteSpace,
    Comment,
    Semicolon
} from '../../tokenizer/index.js';

function consumeRaw(startToken) {
    return this.Raw(startToken, this.consumeUntilSemicolonIncluded, true);
}

export const name = 'DeclarationList';
export const structure = {
    children: [[
        'Declaration'
    ]]
};

export function parse() {
    const children = this.createList();

    scan:
    while (!this.eof) {
        switch (this.tokenType) {
            case WhiteSpace:
            case Comment:
            case Semicolon:
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

export function generate(node) {
    this.children(node, prev => {
        if (prev.type === 'Declaration') {
            this.token(Semicolon, ';');
        }
    });
}

