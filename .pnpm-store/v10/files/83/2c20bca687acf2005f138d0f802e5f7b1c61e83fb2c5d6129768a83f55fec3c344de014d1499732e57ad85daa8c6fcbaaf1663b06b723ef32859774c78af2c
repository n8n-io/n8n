
/*! markdown-it-emoji 2.0.2 https://github.com/markdown-it/markdown-it-emoji @license MIT */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.markdownitEmoji = factory());
})(this, (function () { 'use strict';

  var render = function emoji_html(tokens, idx /*, options, env */) {
    return tokens[idx].content;
  };

  // Emojies & shortcuts replacement logic.


  var replace = function create_rule(md, emojies, shortcuts, scanRE, replaceRE) {
    var arrayReplaceAt = md.utils.arrayReplaceAt,
        ucm = md.utils.lib.ucmicro,
        ZPCc = new RegExp([ ucm.Z.source, ucm.P.source, ucm.Cc.source ].join('|'));

    function splitTextToken(text, level, Token) {
      var token, last_pos = 0, nodes = [];

      text.replace(replaceRE, function (match, offset, src) {
        var emoji_name;
        // Validate emoji name
        if (shortcuts.hasOwnProperty(match)) {
          // replace shortcut with full name
          emoji_name = shortcuts[match];

          // Don't allow letters before any shortcut (as in no ":/" in http://)
          if (offset > 0 && !ZPCc.test(src[offset - 1])) {
            return;
          }

          // Don't allow letters after any shortcut
          if (offset + match.length < src.length && !ZPCc.test(src[offset + match.length])) {
            return;
          }
        } else {
          emoji_name = match.slice(1, -1);
        }

        // Add new tokens to pending list
        if (offset > last_pos) {
          token         = new Token('text', '', 0);
          token.content = text.slice(last_pos, offset);
          nodes.push(token);
        }

        token         = new Token('emoji', '', 0);
        token.markup  = emoji_name;
        token.content = emojies[emoji_name];
        nodes.push(token);

        last_pos = offset + match.length;
      });

      if (last_pos < text.length) {
        token         = new Token('text', '', 0);
        token.content = text.slice(last_pos);
        nodes.push(token);
      }

      return nodes;
    }

    return function emoji_replace(state) {
      var i, j, l, tokens, token,
          blockTokens = state.tokens,
          autolinkLevel = 0;

      for (j = 0, l = blockTokens.length; j < l; j++) {
        if (blockTokens[j].type !== 'inline') { continue; }
        tokens = blockTokens[j].children;

        // We scan from the end, to keep position when new tags added.
        // Use reversed logic in links start/end match
        for (i = tokens.length - 1; i >= 0; i--) {
          token = tokens[i];

          if (token.type === 'link_open' || token.type === 'link_close') {
            if (token.info === 'auto') { autolinkLevel -= token.nesting; }
          }

          if (token.type === 'text' && autolinkLevel === 0 && scanRE.test(token.content)) {
            // replace current node
            blockTokens[j].children = tokens = arrayReplaceAt(
              tokens, i, splitTextToken(token.content, token.level, state.Token)
            );
          }
        }
      }
    };
  };

  // Convert input options to more useable format


  function quoteRE(str) {
    return str.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
  }


  var normalize_opts = function normalize_opts(options) {
    var emojies = options.defs,
        shortcuts;

    // Filter emojies by whitelist, if needed
    if (options.enabled.length) {
      emojies = Object.keys(emojies).reduce(function (acc, key) {
        if (options.enabled.indexOf(key) >= 0) {
          acc[key] = emojies[key];
        }
        return acc;
      }, {});
    }

    // Flatten shortcuts to simple object: { alias: emoji_name }
    shortcuts = Object.keys(options.shortcuts).reduce(function (acc, key) {
      // Skip aliases for filtered emojies, to reduce regexp
      if (!emojies[key]) { return acc; }

      if (Array.isArray(options.shortcuts[key])) {
        options.shortcuts[key].forEach(function (alias) {
          acc[alias] = key;
        });
        return acc;
      }

      acc[options.shortcuts[key]] = key;
      return acc;
    }, {});

    var keys = Object.keys(emojies),
        names;

    // If no definitions are given, return empty regex to avoid replacements with 'undefined'.
    if (keys.length === 0) {
      names = '^$';
    } else {
      // Compile regexp
      names = keys
        .map(function (name) { return ':' + name + ':'; })
        .concat(Object.keys(shortcuts))
        .sort()
        .reverse()
        .map(function (name) { return quoteRE(name); })
        .join('|');
    }
    var scanRE = RegExp(names);
    var replaceRE = RegExp(names, 'g');

    return {
      defs: emojies,
      shortcuts: shortcuts,
      scanRE: scanRE,
      replaceRE: replaceRE
    };
  };

  var bare = function emoji_plugin(md, options) {
    var defaults = {
      defs: {},
      shortcuts: {},
      enabled: []
    };

    var opts = normalize_opts(md.utils.assign({}, defaults, options || {}));

    md.renderer.rules.emoji = render;

    md.core.ruler.after(
      'linkify',
      'emoji',
      replace(md, opts.defs, opts.shortcuts, opts.scanRE, opts.replaceRE)
    );
  };

  return bare;

}));
