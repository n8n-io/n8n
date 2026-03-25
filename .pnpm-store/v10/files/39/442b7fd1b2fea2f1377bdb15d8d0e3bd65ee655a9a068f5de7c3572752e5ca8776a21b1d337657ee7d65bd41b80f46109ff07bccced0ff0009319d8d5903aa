'use strict';

const index = require('../tokenizer/index.cjs');
const sourceMap = require('./sourceMap.cjs');
const tokenBefore = require('./token-before.cjs');
const types = require('../tokenizer/types.cjs');

const REVERSESOLIDUS = 0x005c; // U+005C REVERSE SOLIDUS (\)

function processChildren(node, delimeter) {
    if (typeof delimeter === 'function') {
        let prev = null;

        node.children.forEach(node => {
            if (prev !== null) {
                delimeter.call(this, prev);
            }

            this.node(node);
            prev = node;
        });

        return;
    }

    node.children.forEach(this.node, this);
}

function processChunk(chunk) {
    index.tokenize(chunk, (type, start, end) => {
        this.token(type, chunk.slice(start, end));
    });
}

function createGenerator(config) {
    const types$1 = new Map();

    for (let [name, item] of Object.entries(config.node)) {
        const fn = item.generate || item;

        if (typeof fn === 'function') {
            types$1.set(name, item.generate || item);
        }
    }

    return function(node, options) {
        let buffer = '';
        let prevCode = 0;
        let handlers = {
            node(node) {
                if (types$1.has(node.type)) {
                    types$1.get(node.type).call(publicApi, node);
                } else {
                    throw new Error('Unknown node type: ' + node.type);
                }
            },
            tokenBefore: tokenBefore.safe,
            token(type, value) {
                prevCode = this.tokenBefore(prevCode, type, value);

                this.emit(value, type, false);

                if (type === types.Delim && value.charCodeAt(0) === REVERSESOLIDUS) {
                    this.emit('\n', types.WhiteSpace, true);
                }
            },
            emit(value) {
                buffer += value;
            },
            result() {
                return buffer;
            }
        };

        if (options) {
            if (typeof options.decorator === 'function') {
                handlers = options.decorator(handlers);
            }

            if (options.sourceMap) {
                handlers = sourceMap.generateSourceMap(handlers);
            }

            if (options.mode in tokenBefore) {
                handlers.tokenBefore = tokenBefore[options.mode];
            }
        }

        const publicApi = {
            node: (node) => handlers.node(node),
            children: processChildren,
            token: (type, value) => handlers.token(type, value),
            tokenize: processChunk
        };

        handlers.node(node);

        return handlers.result();
    };
}

exports.createGenerator = createGenerator;
