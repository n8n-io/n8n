'use strict';


var emoji_html        = require('./lib/render');
var emoji_replace     = require('./lib/replace');
var normalize_opts    = require('./lib/normalize_opts');


module.exports = function emoji_plugin(md, options) {
  var defaults = {
    defs: {},
    shortcuts: {},
    enabled: []
  };

  var opts = normalize_opts(md.utils.assign({}, defaults, options || {}));

  md.renderer.rules.emoji = emoji_html;

  md.core.ruler.after(
    'linkify',
    'emoji',
    emoji_replace(md, opts.defs, opts.shortcuts, opts.scanRE, opts.replaceRE)
  );
};
