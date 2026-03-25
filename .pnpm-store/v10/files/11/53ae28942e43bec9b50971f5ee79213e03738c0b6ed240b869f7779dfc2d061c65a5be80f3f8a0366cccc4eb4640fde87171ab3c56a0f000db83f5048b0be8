var underscore = require('./underscore.js');

// By default, Underscore uses ERB-style template delimiters. Change the
// following template settings to use alternative delimiters.
var templateSettings = underscore.templateSettings = {
  evaluate: /<%([\s\S]+?)%>/g,
  interpolate: /<%=([\s\S]+?)%>/g,
  escape: /<%-([\s\S]+?)%>/g
};

module.exports = templateSettings;
