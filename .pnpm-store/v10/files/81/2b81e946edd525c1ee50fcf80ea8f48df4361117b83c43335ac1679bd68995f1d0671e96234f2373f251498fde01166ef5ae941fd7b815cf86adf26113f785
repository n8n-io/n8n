'use strict';

const _Number = require('./Number.cjs');

const MATH_FUNCTIONS = new Set([
    'calc',
    'min',
    'max',
    'clamp'
]);
const LENGTH_UNIT = new Set([
    // absolute length units
    'px',
    'mm',
    'cm',
    'in',
    'pt',
    'pc',

    // relative length units
    'em',
    'ex',
    'ch',
    'rem',

    // viewport-percentage lengths
    'vh',
    'vw',
    'vmin',
    'vmax',
    'vm'
]);

function compressDimension(node, item) {
    const value = _Number.packNumber(node.value);

    node.value = value;

    if (value === '0' && this.declaration !== null && this.atrulePrelude === null) {
        const unit = node.unit.toLowerCase();

        // only length values can be compressed
        if (!LENGTH_UNIT.has(unit)) {
            return;
        }

        // issue #362: shouldn't remove unit in -ms-flex since it breaks flex in IE10/11
        // issue #200: shouldn't remove unit in flex since it breaks flex in IE10/11
        if (this.declaration.property === '-ms-flex' ||
            this.declaration.property === 'flex') {
            return;
        }

        // issue #222: don't remove units inside calc
        if (this.function && MATH_FUNCTIONS.has(this.function.name)) {
            return;
        }

        item.data = {
            type: 'Number',
            loc: node.loc,
            value
        };
    }
}

module.exports = compressDimension;
