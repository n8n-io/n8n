'use strict';

const types = require('../../tokenizer/types.cjs');

const MediaFeatureToken = new Set([types.Colon, types.RightParenthesis, types.EOF]);
const SupportsFeatureToken = new Set([types.Colon, types.EOF]);

const name = 'Condition';
const structure = {
    kind: String,
    children: [[
        'Identifier',
        'Feature',
        'FeatureRange'
    ]]
};

const conditions = {
    media() {
        if (this.tokenType === types.LeftParenthesis) {
            const firstToken = this.lookupTypeNonSC(1);
            if (firstToken === types.Ident && MediaFeatureToken.has(this.lookupTypeNonSC(2))) {
                return this.Feature('media');
            } else if (firstToken !== types.LeftParenthesis) {
                return this.parseWithFallback(() => this.FeatureRange('media'), (startIndex) => {
                    this.skip(startIndex - this.tokenIndex);
                });
            }
        }
    },
    supports() {
        if (this.tokenType === types.LeftParenthesis) {
            if (this.lookupTypeNonSC(1) === types.Ident && SupportsFeatureToken.has(this.lookupTypeNonSC(2))) {
                return this.Declaration();
            }
        }
    },
    container() {
        if (this.tokenType === types.LeftParenthesis) {
            if (this.lookupTypeNonSC(1) === types.Ident && MediaFeatureToken.has(this.lookupTypeNonSC(2))) {
                return this.Feature('size');
            } else if (this.lookupTypeNonSC(1) !== types.LeftParenthesis) {
                return this.FeatureRange('size');
            }
        }
    }
};

function parse(kind = 'media') {
    const children = this.createList();
    const termParser = conditions[kind];

    scan: while (!this.eof) {
        switch (this.tokenType) {
            case types.Comment:
            case types.WhiteSpace:
                this.next();
                continue;

            case types.Ident:
                children.push(this.Identifier());
                break;

            case types.LeftParenthesis: {
                let term = termParser.call(this);

                if (!term) {
                    term = this.parseWithFallback(() => {
                        this.next();
                        const res = this.Condition(kind);
                        this.eat(types.RightParenthesis);
                        return res;
                    }, (startIndex) => {
                        this.skip(startIndex - this.tokenIndex);
                        return this.GeneralEnclosed();
                    });
                }

                children.push(term);
                break;
            }

            case types.Function: {
                let term = termParser.call(this);

                if (!term) {
                    term = this.GeneralEnclosed();
                }

                children.push(term);
                break;
            }

            default:
                break scan;
        }
    }

    if (children.isEmpty) {
        this.error('Condition can\'t be empty');
    }

    return {
        type: 'Condition',
        loc: this.getLocationFromList(children),
        kind,
        children
    };
}

function generate(node) {
    node.children.forEach(child => {
        if (child.type === 'Condition') {
            this.token(types.LeftParenthesis, '(');
            this.node(child);
            this.token(types.RightParenthesis, ')');
        } else {
            this.node(child);
        }
    });
}

exports.conditions = conditions;
exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
