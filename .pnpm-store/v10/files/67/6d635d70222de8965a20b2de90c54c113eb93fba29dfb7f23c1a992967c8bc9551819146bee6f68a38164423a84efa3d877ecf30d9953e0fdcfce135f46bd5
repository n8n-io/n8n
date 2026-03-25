'use strict';

const cssTree = require('css-tree');

const REPLACE = 1;
const REMOVE = 2;
const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;
const SIDES = ['top', 'right', 'bottom', 'left'];
const SIDE = {
    'margin-top': 'top',
    'margin-right': 'right',
    'margin-bottom': 'bottom',
    'margin-left': 'left',

    'padding-top': 'top',
    'padding-right': 'right',
    'padding-bottom': 'bottom',
    'padding-left': 'left',

    'border-top-color': 'top',
    'border-right-color': 'right',
    'border-bottom-color': 'bottom',
    'border-left-color': 'left',
    'border-top-width': 'top',
    'border-right-width': 'right',
    'border-bottom-width': 'bottom',
    'border-left-width': 'left',
    'border-top-style': 'top',
    'border-right-style': 'right',
    'border-bottom-style': 'bottom',
    'border-left-style': 'left'
};
const MAIN_PROPERTY = {
    'margin': 'margin',
    'margin-top': 'margin',
    'margin-right': 'margin',
    'margin-bottom': 'margin',
    'margin-left': 'margin',

    'padding': 'padding',
    'padding-top': 'padding',
    'padding-right': 'padding',
    'padding-bottom': 'padding',
    'padding-left': 'padding',

    'border-color': 'border-color',
    'border-top-color': 'border-color',
    'border-right-color': 'border-color',
    'border-bottom-color': 'border-color',
    'border-left-color': 'border-color',
    'border-width': 'border-width',
    'border-top-width': 'border-width',
    'border-right-width': 'border-width',
    'border-bottom-width': 'border-width',
    'border-left-width': 'border-width',
    'border-style': 'border-style',
    'border-top-style': 'border-style',
    'border-right-style': 'border-style',
    'border-bottom-style': 'border-style',
    'border-left-style': 'border-style'
};

class TRBL {
    constructor(name) {
        this.name = name;
        this.loc = null;
        this.iehack = undefined;
        this.sides = {
            'top': null,
            'right': null,
            'bottom': null,
            'left': null
        };
    }

    getValueSequence(declaration, count) {
        const values = [];
        let iehack = '';
        const hasBadValues = declaration.value.type !== 'Value' || declaration.value.children.some(function(child) {
            let special = false;

            switch (child.type) {
                case 'Identifier':
                    switch (child.name) {
                        case '\\0':
                        case '\\9':
                            iehack = child.name;
                            return;

                        case 'inherit':
                        case 'initial':
                        case 'unset':
                        case 'revert':
                            special = child.name;
                            break;
                    }
                    break;

                case 'Dimension':
                    switch (child.unit) {
                        // is not supported until IE11
                        case 'rem':

                        // v* units is too buggy across browsers and better
                        // don't merge values with those units
                        case 'vw':
                        case 'vh':
                        case 'vmin':
                        case 'vmax':
                        case 'vm': // IE9 supporting "vm" instead of "vmin".
                            special = child.unit;
                            break;
                    }
                    break;

                case 'Hash': // color
                case 'Number':
                case 'Percentage':
                    break;

                case 'Function':
                    if (child.name === 'var') {
                        return true;
                    }

                    special = child.name;
                    break;

                default:
                    return true;  // bad value
            }

            values.push({
                node: child,
                special,
                important: declaration.important
            });
        });

        if (hasBadValues || values.length > count) {
            return false;
        }

        if (typeof this.iehack === 'string' && this.iehack !== iehack) {
            return false;
        }

        this.iehack = iehack; // move outside

        return values;
    }

    canOverride(side, value) {
        const currentValue = this.sides[side];

        return !currentValue || (value.important && !currentValue.important);
    }

    add(name, declaration) {
        function attemptToAdd() {
            const sides = this.sides;
            const side = SIDE[name];

            if (side) {
                if (side in sides === false) {
                    return false;
                }

                const values = this.getValueSequence(declaration, 1);

                if (!values || !values.length) {
                    return false;
                }

                // can mix only if specials are equal
                for (const key in sides) {
                    if (sides[key] !== null && sides[key].special !== values[0].special) {
                        return false;
                    }
                }

                if (!this.canOverride(side, values[0])) {
                    return true;
                }

                sides[side] = values[0];

                return true;
            } else if (name === this.name) {
                const values = this.getValueSequence(declaration, 4);

                if (!values || !values.length) {
                    return false;
                }

                switch (values.length) {
                    case 1:
                        values[RIGHT] = values[TOP];
                        values[BOTTOM] = values[TOP];
                        values[LEFT] = values[TOP];
                        break;

                    case 2:
                        values[BOTTOM] = values[TOP];
                        values[LEFT] = values[RIGHT];
                        break;

                    case 3:
                        values[LEFT] = values[RIGHT];
                        break;
                }

                // can mix only if specials are equal
                for (let i = 0; i < 4; i++) {
                    for (const key in sides) {
                        if (sides[key] !== null && sides[key].special !== values[i].special) {
                            return false;
                        }
                    }
                }

                for (let i = 0; i < 4; i++) {
                    if (this.canOverride(SIDES[i], values[i])) {
                        sides[SIDES[i]] = values[i];
                    }
                }

                return true;
            }
        }

        if (!attemptToAdd.call(this)) {
            return false;
        }

        // TODO: use it when we can refer to several points in source
        // if (this.loc) {
        //     this.loc = {
        //         primary: this.loc,
        //         merged: declaration.loc
        //     };
        // } else {
        //     this.loc = declaration.loc;
        // }
        if (!this.loc) {
            this.loc = declaration.loc;
        }

        return true;
    }

    isOkToMinimize() {
        const top = this.sides.top;
        const right = this.sides.right;
        const bottom = this.sides.bottom;
        const left = this.sides.left;

        if (top && right && bottom && left) {
            const important =
                top.important +
                right.important +
                bottom.important +
                left.important;

            return important === 0 || important === 4;
        }

        return false;
    }

    getValue() {
        const result = new cssTree.List();
        const sides = this.sides;
        const values = [
            sides.top,
            sides.right,
            sides.bottom,
            sides.left
        ];
        const stringValues = [
            cssTree.generate(sides.top.node),
            cssTree.generate(sides.right.node),
            cssTree.generate(sides.bottom.node),
            cssTree.generate(sides.left.node)
        ];

        if (stringValues[LEFT] === stringValues[RIGHT]) {
            values.pop();
            if (stringValues[BOTTOM] === stringValues[TOP]) {
                values.pop();
                if (stringValues[RIGHT] === stringValues[TOP]) {
                    values.pop();
                }
            }
        }

        for (let i = 0; i < values.length; i++) {
            result.appendData(values[i].node);
        }

        if (this.iehack) {
            result.appendData({
                type: 'Identifier',
                loc: null,
                name: this.iehack
            });
        }

        return {
            type: 'Value',
            loc: null,
            children: result
        };
    }

    getDeclaration() {
        return {
            type: 'Declaration',
            loc: this.loc,
            important: this.sides.top.important,
            property: this.name,
            value: this.getValue()
        };
    }
}

function processRule(rule, shorts, shortDeclarations, lastShortSelector) {
    const declarations = rule.block.children;
    const selector = rule.prelude.children.first.id;

    rule.block.children.forEachRight(function(declaration, item) {
        const property = declaration.property;

        if (!MAIN_PROPERTY.hasOwnProperty(property)) {
            return;
        }

        const key = MAIN_PROPERTY[property];
        let shorthand;
        let operation;

        if (!lastShortSelector || selector === lastShortSelector) {
            if (key in shorts) {
                operation = REMOVE;
                shorthand = shorts[key];
            }
        }

        if (!shorthand || !shorthand.add(property, declaration)) {
            operation = REPLACE;
            shorthand = new TRBL(key);

            // if can't parse value ignore it and break shorthand children
            if (!shorthand.add(property, declaration)) {
                lastShortSelector = null;
                return;
            }
        }

        shorts[key] = shorthand;
        shortDeclarations.push({
            operation,
            block: declarations,
            item,
            shorthand
        });

        lastShortSelector = selector;
    });

    return lastShortSelector;
}

function processShorthands(shortDeclarations, markDeclaration) {
    shortDeclarations.forEach(function(item) {
        const shorthand = item.shorthand;

        if (!shorthand.isOkToMinimize()) {
            return;
        }

        if (item.operation === REPLACE) {
            item.item.data = markDeclaration(shorthand.getDeclaration());
        } else {
            item.block.remove(item.item);
        }
    });
}

function restructBlock(ast, indexer) {
    const stylesheetMap = {};
    const shortDeclarations = [];

    cssTree.walk(ast, {
        visit: 'Rule',
        reverse: true,
        enter(node) {
            const stylesheet = this.block || this.stylesheet;
            const ruleId = (node.pseudoSignature || '') + '|' + node.prelude.children.first.id;
            let ruleMap;
            let shorts;

            if (!stylesheetMap.hasOwnProperty(stylesheet.id)) {
                ruleMap = {
                    lastShortSelector: null
                };
                stylesheetMap[stylesheet.id] = ruleMap;
            } else {
                ruleMap = stylesheetMap[stylesheet.id];
            }

            if (ruleMap.hasOwnProperty(ruleId)) {
                shorts = ruleMap[ruleId];
            } else {
                shorts = {};
                ruleMap[ruleId] = shorts;
            }

            ruleMap.lastShortSelector = processRule.call(this, node, shorts, shortDeclarations, ruleMap.lastShortSelector);
        }
    });

    processShorthands(shortDeclarations, indexer.declaration);
}

module.exports = restructBlock;
