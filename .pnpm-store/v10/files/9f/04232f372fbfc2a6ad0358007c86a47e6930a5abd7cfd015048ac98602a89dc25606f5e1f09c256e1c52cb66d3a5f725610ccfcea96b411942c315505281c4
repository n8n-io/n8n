import { walk } from 'css-tree';
import Atrule from './Atrule.js';
import Comment from './Comment.js';
import Declaration from './Declaration.js';
import Raw from './Raw.js';
import Rule from './Rule.js';
import TypeSelector from './TypeSelector.js';
import WhiteSpace from './WhiteSpace.js';

const handlers = {
    Atrule,
    Comment,
    Declaration,
    Raw,
    Rule,
    TypeSelector,
    WhiteSpace
};

export default function(ast, options) {
    walk(ast, {
        leave(node, item, list) {
            if (handlers.hasOwnProperty(node.type)) {
                handlers[node.type].call(this, node, item, list, options);
            }
        }
    });
};
