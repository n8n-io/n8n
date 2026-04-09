'use strict';
var userAgent = require('../internals/engine-user-agent');

var webkit = userAgent.match(/AppleWebKit\/(\d+)\./);

module.exports = !!webkit && +webkit[1];
