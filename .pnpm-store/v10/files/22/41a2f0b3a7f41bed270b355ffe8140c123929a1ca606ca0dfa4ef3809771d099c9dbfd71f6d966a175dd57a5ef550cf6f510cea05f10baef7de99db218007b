'use strict';

var os = require('os');
if (typeof os.homedir !== 'undefined') {
  module.exports = os.homedir;
} else {
  module.exports = require('./polyfill.js');
}

