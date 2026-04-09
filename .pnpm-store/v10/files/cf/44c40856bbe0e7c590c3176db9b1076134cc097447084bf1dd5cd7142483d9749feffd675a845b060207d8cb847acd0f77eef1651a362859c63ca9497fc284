'use strict';
var userAgent = require('../internals/engine-user-agent');

var firefox = userAgent.match(/firefox\/(\d+)/i);

module.exports = !!firefox && +firefox[1];
