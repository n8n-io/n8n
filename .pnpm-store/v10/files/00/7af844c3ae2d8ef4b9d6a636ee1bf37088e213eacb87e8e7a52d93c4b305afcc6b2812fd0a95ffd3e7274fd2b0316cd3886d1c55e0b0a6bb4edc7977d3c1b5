'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'SupportsDeclaration';
const structure = {
    feature: String,
    value: 'Declaration'
};

function parse() {
    const start = this.tokenStart;
    let featureName = 'declaration';
    let valueParser = this.Declaration;

    if (this.tokenType === types.Function) {
        featureName = this.consumeFunctionName();
        valueParser = this.supportsFeature[featureName.toLowerCase()];
        if (!valueParser) {
            this.error(`Unknown supports feature ${featureName.toLowerCase()}()`);
        }
    } else {
        this.eat(types.LeftParenthesis);
    }

    this.skipSC();

    const value = this.parseWithFallback(
        () => {
            const startValueToken = this.tokenIndex;
            const value = valueParser.call(this);

            if (this.eof === false &&
                this.isBalanceEdge(startValueToken) === false) {
                this.error();
            }

            return value;
        },
        (startToken) => this.Raw(startToken, null, false)
    );

    if (!this.eof) {
        this.eat(types.RightParenthesis);
    }

    return {
        type: 'SupportsDeclaration',
        loc: this.getLocation(start, this.tokenStart),
        feature: featureName,
        value
    };
}

function generate(node) {
    if (node.feature !== 'declaration') {
        this.token(types.Function, node.feature + '(');
    } else {
        this.token(types.LeftParenthesis, '(');
    }

    this.node(node.value);
    this.token(types.RightParenthesis, ')');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
