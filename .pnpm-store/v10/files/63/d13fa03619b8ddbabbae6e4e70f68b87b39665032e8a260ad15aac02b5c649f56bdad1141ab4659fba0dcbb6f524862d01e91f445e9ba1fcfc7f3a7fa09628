'use strict';

const OMIT_PLUSSIGN = /^(?:\+|(-))?0*(\d*)(?:\.0*|(\.\d*?)0*)?$/;
const KEEP_PLUSSIGN = /^([\+\-])?0*(\d*)(?:\.0*|(\.\d*?)0*)?$/;
const unsafeToRemovePlusSignAfter = new Set([
    'Dimension',
    'Hash',
    'Identifier',
    'Number',
    'Raw',
    'UnicodeRange'
]);

function packNumber(value, item) {
    // omit plus sign only if no prev or prev is safe type
    const regexp = item && item.prev !== null && unsafeToRemovePlusSignAfter.has(item.prev.data.type)
        ? KEEP_PLUSSIGN
        : OMIT_PLUSSIGN;

    // 100 -> '100'
    // 00100 -> '100'
    // +100 -> '100'
    // -100 -> '-100'
    // 0.123 -> '.123'
    // 0.12300 -> '.123'
    // 0.0 -> ''
    // 0 -> ''
    // -0 -> '-'
    value = String(value).replace(regexp, '$1$2$3');

    if (value === '' || value === '-') {
        value = '0';
    }
    // FIXME: is it solution simplier?
    // value = String(Number(value)).replace(/^(-?)0+\./, '$1.');

    return value;
}

function Number(node) {
    node.value = packNumber(node.value);
}

exports.Number = Number;
exports.packNumber = packNumber;
