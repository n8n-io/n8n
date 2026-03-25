'use strict';

const crypto = require('crypto');

const hash = crypto.createHash('sha1');
hash.update(__filename, 'utf8');

module.exports = `NODE_PRELOAD_${hash.digest('hex')}`;
