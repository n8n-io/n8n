'use strict';

const cssTree = require('css-tree');
const createDeclarationIndexer = require('./createDeclarationIndexer.cjs');
const processSelector = require('./processSelector.cjs');

function prepare(ast, options) {
    const markDeclaration = createDeclarationIndexer();

    cssTree.walk(ast, {
        visit: 'Rule',
        enter(node) {
            node.block.children.forEach(markDeclaration);
            processSelector(node, options.usage);
        }
    });

    cssTree.walk(ast, {
        visit: 'Atrule',
        enter(node) {
            if (node.prelude) {
                node.prelude.id = null; // pre-init property to avoid multiple hidden class for generate
                node.prelude.id = cssTree.generate(node.prelude);
            }

            // compare keyframe selectors by its values
            // NOTE: still no clarification about problems with keyframes selector grouping (issue #197)
            if (cssTree.keyword(node.name).basename === 'keyframes') {
                node.block.avoidRulesMerge = true;  /* probably we don't need to prevent those merges for @keyframes
                                                       TODO: need to be checked */
                node.block.children.forEach(function(rule) {
                    rule.prelude.children.forEach(function(simpleselector) {
                        simpleselector.compareMarker = simpleselector.id;
                    });
                });
            }
        }
    });

    return {
        declaration: markDeclaration
    };
}

module.exports = prepare;
