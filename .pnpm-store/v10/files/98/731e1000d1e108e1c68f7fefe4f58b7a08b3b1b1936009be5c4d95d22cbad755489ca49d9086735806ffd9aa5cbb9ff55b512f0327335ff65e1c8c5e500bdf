'use strict';

const cssTree = require('css-tree');
const utils = require('./utils.cjs');

const { hasOwnProperty } = Object.prototype;
const skipUsageFilteringAtrule = new Set(['keyframes']);

function cleanUnused(selectorList, usageData) {
    selectorList.children.forEach((selector, item, list) => {
        let shouldRemove = false;

        cssTree.walk(selector, function(node) {
            // ignore nodes in nested selectors
            if (this.selector === null || this.selector === selectorList) {
                switch (node.type) {
                    case 'SelectorList':
                        // TODO: remove toLowerCase when pseudo selectors will be normalized
                        // ignore selectors inside :not()
                        if (this.function === null || this.function.name.toLowerCase() !== 'not') {
                            if (cleanUnused(node, usageData)) {
                                shouldRemove = true;
                            }
                        }
                        break;

                    case 'ClassSelector':
                        if (usageData.whitelist !== null &&
                            usageData.whitelist.classes !== null &&
                            !hasOwnProperty.call(usageData.whitelist.classes, node.name)) {
                            shouldRemove = true;
                        }
                        if (usageData.blacklist !== null &&
                            usageData.blacklist.classes !== null &&
                            hasOwnProperty.call(usageData.blacklist.classes, node.name)) {
                            shouldRemove = true;
                        }
                        break;

                    case 'IdSelector':
                        if (usageData.whitelist !== null &&
                            usageData.whitelist.ids !== null &&
                            !hasOwnProperty.call(usageData.whitelist.ids, node.name)) {
                            shouldRemove = true;
                        }
                        if (usageData.blacklist !== null &&
                            usageData.blacklist.ids !== null &&
                            hasOwnProperty.call(usageData.blacklist.ids, node.name)) {
                            shouldRemove = true;
                        }
                        break;

                    case 'TypeSelector':
                        // TODO: remove toLowerCase when type selectors will be normalized
                        // ignore universal selectors
                        if (node.name.charAt(node.name.length - 1) !== '*') {
                            if (usageData.whitelist !== null &&
                                usageData.whitelist.tags !== null &&
                                !hasOwnProperty.call(usageData.whitelist.tags, node.name.toLowerCase())) {
                                shouldRemove = true;
                            }
                            if (usageData.blacklist !== null &&
                                usageData.blacklist.tags !== null &&
                                hasOwnProperty.call(usageData.blacklist.tags, node.name.toLowerCase())) {
                                shouldRemove = true;
                            }
                        }
                        break;
                }
            }
        });

        if (shouldRemove) {
            list.remove(item);
        }
    });

    return selectorList.children.isEmpty;
}

function cleanRule(node, item, list, options) {
    if (utils.hasNoChildren(node.prelude) || utils.hasNoChildren(node.block)) {
        list.remove(item);
        return;
    }

    // avoid usage filtering for some at-rules
    if (this.atrule && skipUsageFilteringAtrule.has(cssTree.keyword(this.atrule.name).basename)) {
        return;
    }

    const { usage } = options;

    if (usage && (usage.whitelist !== null || usage.blacklist !== null)) {
        cleanUnused(node.prelude, usage);

        if (utils.hasNoChildren(node.prelude)) {
            list.remove(item);
            return;
        }
    }
}

module.exports = cleanRule;
