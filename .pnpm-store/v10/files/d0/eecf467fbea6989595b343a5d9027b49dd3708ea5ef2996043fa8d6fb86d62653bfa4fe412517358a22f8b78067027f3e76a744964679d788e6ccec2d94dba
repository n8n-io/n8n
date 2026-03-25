'use strict';

const types = require('../../tokenizer/types.cjs');

const importAtrule = {
    parse: {
        prelude() {
            const children = this.createList();

            this.skipSC();

            switch (this.tokenType) {
                case types.String:
                    children.push(this.String());
                    break;

                case types.Url:
                case types.Function:
                    children.push(this.Url());
                    break;

                default:
                    this.error('String or url() is expected');
            }

            if (this.lookupNonWSType(0) === types.Ident ||
                this.lookupNonWSType(0) === types.LeftParenthesis) {
                children.push(this.MediaQueryList());
            }

            return children;
        },
        block: null
    }
};

module.exports = importAtrule;
