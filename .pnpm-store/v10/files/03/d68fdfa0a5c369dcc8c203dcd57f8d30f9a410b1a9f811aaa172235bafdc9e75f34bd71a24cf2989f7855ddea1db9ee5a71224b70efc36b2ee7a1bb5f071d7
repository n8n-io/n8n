'use strict';

const cssTree = require('css-tree');

const { hasOwnProperty } = Object.prototype;

function addRuleToMap(map, item, list, single) {
    const node = item.data;
    const name = cssTree.keyword(node.name).basename;
    const id = node.name.toLowerCase() + '/' + (node.prelude ? node.prelude.id : null);

    if (!hasOwnProperty.call(map, name)) {
        map[name] = Object.create(null);
    }

    if (single) {
        delete map[name][id];
    }

    if (!hasOwnProperty.call(map[name], id)) {
        map[name][id] = new cssTree.List();
    }

    map[name][id].append(list.remove(item));
}

function relocateAtrules(ast, options) {
    const collected = Object.create(null);
    let topInjectPoint = null;

    ast.children.forEach(function(node, item, list) {
        if (node.type === 'Atrule') {
            const name = cssTree.keyword(node.name).basename;

            switch (name) {
                case 'keyframes':
                    addRuleToMap(collected, item, list, true);
                    return;

                case 'media':
                    if (options.forceMediaMerge) {
                        addRuleToMap(collected, item, list, false);
                        return;
                    }
                    break;
            }

            if (topInjectPoint === null &&
                name !== 'charset' &&
                name !== 'import') {
                topInjectPoint = item;
            }
        } else {
            if (topInjectPoint === null) {
                topInjectPoint = item;
            }
        }
    });

    for (const atrule in collected) {
        for (const id in collected[atrule]) {
            ast.children.insertList(
                collected[atrule][id],
                atrule === 'media' ? null : topInjectPoint
            );
        }
    }
}
function isMediaRule(node) {
    return node.type === 'Atrule' && node.name === 'media';
}

function processAtrule(node, item, list) {
    if (!isMediaRule(node)) {
        return;
    }

    const prev = item.prev && item.prev.data;

    if (!prev || !isMediaRule(prev)) {
        return;
    }

    // merge @media with same query
    if (node.prelude &&
        prev.prelude &&
        node.prelude.id === prev.prelude.id) {
        prev.block.children.appendList(node.block.children);
        list.remove(item);

        // TODO: use it when we can refer to several points in source
        // prev.loc = {
        //     primary: prev.loc,
        //     merged: node.loc
        // };
    }
}

function rejoinAtrule(ast, options) {
    relocateAtrules(ast, options);

    cssTree.walk(ast, {
        visit: 'Atrule',
        reverse: true,
        enter: processAtrule
    });
}

module.exports = rejoinAtrule;
