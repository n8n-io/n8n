/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

/* eslint no-var: off */
var v = process.versions.node.split('.'),
    highVer = +v[0];

// istanbul ignore next
if (highVer < 14) {

    // From pg-promise v11.0.0, the oldest supported Node.js is v14.0.0

    // Node.js v12.0.0 was supported up to pg-promise v10.15.4
    // Node.js v8.0.0 was supported up to pg-promise v10.14.2
    // Node.js v7.6.0 was supported up to pg-promise v10.3.5
    // Node.js v4.5.0 was supported up to pg-promise v8.7.5
    // Node.js v0.10 was supported up to pg-promise v5.5.8

    throw new Error('Minimum Node.js version supported by pg-promise is 14.0.0');
}

module.exports = require('./main');
