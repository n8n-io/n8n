import {
    String as StringToken,
    Ident,
    Url,
    Function as FunctionToken,
    LeftParenthesis
} from '../../tokenizer/index.js';

export default {
    parse: {
        prelude() {
            const children = this.createList();

            this.skipSC();

            switch (this.tokenType) {
                case StringToken:
                    children.push(this.String());
                    break;

                case Url:
                case FunctionToken:
                    children.push(this.Url());
                    break;

                default:
                    this.error('String or url() is expected');
            }

            if (this.lookupNonWSType(0) === Ident ||
                this.lookupNonWSType(0) === LeftParenthesis) {
                children.push(this.MediaQueryList());
            }

            return children;
        },
        block: null
    }
};
