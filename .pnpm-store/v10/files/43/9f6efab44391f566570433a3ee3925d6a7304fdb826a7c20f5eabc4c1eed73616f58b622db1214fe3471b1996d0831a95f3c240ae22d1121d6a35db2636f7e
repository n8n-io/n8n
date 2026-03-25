'use strict';

const types = require('../../tokenizer/types.cjs');

const name = 'GeneralEnclosed';
const structure = {
    function: [String, null],
    children: [[]]
};

// <function-token> <any-value> )
// ( <any-value> )
function parse() {
    const start = this.tokenStart;
    let functionName = null;

    if (this.tokenType === types.Function) {
        functionName = this.consumeFunctionName();
    } else {
        this.eat(types.LeftParenthesis);
    }

    const children = this.readSequence(this.scope.Value);

    if (!this.eof) {
        this.eat(types.RightParenthesis);
    }

    return {
        type: 'GeneralEnclosed',
        loc: this.getLocation(start, this.tokenStart),
        function: functionName,
        children
    };
}

function generate(node) {
    if (node.function) {
        this.token(types.Function, node.function + '(');
    } else {
        this.token(types.LeftParenthesis, '(');
    }

    this.children(node);
    this.token(types.RightParenthesis, ')');
}

exports.generate = generate;
exports.name = name;
exports.parse = parse;
exports.structure = structure;
