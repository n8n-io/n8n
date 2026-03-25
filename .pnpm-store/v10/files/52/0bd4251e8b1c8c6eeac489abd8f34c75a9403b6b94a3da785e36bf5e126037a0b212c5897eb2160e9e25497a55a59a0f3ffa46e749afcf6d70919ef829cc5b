'use strict';


var emojies_defs      = require('./lib/data/full.json');
var emojies_shortcuts = require('./lib/data/shortcuts');
var bare_emoji_plugin = require('./bare');


module.exports = function emoji_plugin(md, options) {
  var defaults = {
    defs: emojies_defs,
    shortcuts: emojies_shortcuts,
    enabled: []
  };

  var opts = md.utils.assign({}, defaults, options || {});

  bare_emoji_plugin(md, opts);
};
