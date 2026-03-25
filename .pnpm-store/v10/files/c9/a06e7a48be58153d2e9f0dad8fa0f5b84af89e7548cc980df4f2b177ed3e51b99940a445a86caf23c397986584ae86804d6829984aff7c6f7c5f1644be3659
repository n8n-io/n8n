import { walk } from 'css-tree';
import Atrule from './Atrule.js';
import AttributeSelector from './AttributeSelector.js';
import Value from './Value.js';
import Dimension from './Dimension.js';
import Percentage from './Percentage.js';
import { Number } from './Number.js';
import Url from './Url.js';
import { compressHex, compressIdent, compressFunction } from './color.js';

const handlers = {
    Atrule,
    AttributeSelector,
    Value,
    Dimension,
    Percentage,
    Number,
    Url,
    Hash: compressHex,
    Identifier: compressIdent,
    Function: compressFunction
};

export default function(ast) {
    walk(ast, {
        leave(node, item, list) {
            if (handlers.hasOwnProperty(node.type)) {
                handlers[node.type].call(this, node, item, list);
            }
        }
    });
};
