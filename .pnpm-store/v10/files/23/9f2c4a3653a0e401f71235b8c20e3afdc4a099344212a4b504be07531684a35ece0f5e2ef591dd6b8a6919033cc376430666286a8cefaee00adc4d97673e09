'use strict';

/**
 * @typedef {import('../lib/types.js').PluginInfo} PluginInfo
 * @typedef {import('../lib/types').XastElement} XastElement
 */

const csstree = require('css-tree');
const { referencesProps } = require('./_collections.js');

exports.name = 'prefixIds';
exports.description = 'prefix IDs';

/**
 * extract basename from path
 * @type {(path: string) => string}
 */
const getBasename = (path) => {
  // extract everything after latest slash or backslash
  const matched = /[/\\]?([^/\\]+)$/.exec(path);
  if (matched) {
    return matched[1];
  }
  return '';
};

/**
 * escapes a string for being used as ID
 * @type {(string: string) => string}
 */
const escapeIdentifierName = (str) => {
  return str.replace(/[. ]/g, '_');
};

/**
 * @type {(string: string) => string}
 */
const unquote = (string) => {
  if (
    (string.startsWith('"') && string.endsWith('"')) ||
    (string.startsWith("'") && string.endsWith("'"))
  ) {
    return string.slice(1, -1);
  }
  return string;
};

/**
 * Prefix the given string, unless it already starts with the generated prefix.
 *
 * @param {(id: string) => string} prefixGenerator Function to generate a prefix.
 * @param {string} body An arbitrary string.
 * @returns {string} The given string with a prefix prepended to it.
 */
const prefixId = (prefixGenerator, body) => {
  const prefix = prefixGenerator(body);
  if (body.startsWith(prefix)) {
    return body;
  }
  return prefix + body;
};

/**
 * Insert the prefix in a reference string. A reference string is already
 * prefixed with #, so the prefix is inserted after the first character.
 *
 * @param {(id: string) => string} prefixGenerator Function to generate a prefix.
 * @param {string} reference An arbitrary string, should start with "#".
 * @returns {?string} The given string with a prefix inserted, or null if the string did not start with "#".
 */
const prefixReference = (prefixGenerator, reference) => {
  if (reference.startsWith('#')) {
    return '#' + prefixId(prefixGenerator, reference.slice(1));
  }
  return null;
};

/**
 * Generates a prefix for the given string.
 *
 * @param {string} body An arbitrary string.
 * @param {XastElement} node XML node that the identifier belongs to.
 * @param {PluginInfo} info
 * @param {((node: XastElement, info: PluginInfo) => string)|string|boolean|undefined} prefixGenerator Some way of obtaining a prefix.
 * @param {string} delim Content to insert between the prefix and original value.
 * @param {Map<string, string>} history Map of previously generated prefixes to IDs.
 * @returns {string} A generated prefix.
 */
const generatePrefix = (body, node, info, prefixGenerator, delim, history) => {
  if (typeof prefixGenerator === 'function') {
    let prefix = history.get(body);

    if (prefix != null) {
      return prefix;
    }

    prefix = prefixGenerator(node, info) + delim;
    history.set(body, prefix);
    return prefix;
  }

  if (typeof prefixGenerator === 'string') {
    return prefixGenerator + delim;
  }

  if (prefixGenerator === false) {
    return '';
  }

  if (info.path != null && info.path.length > 0) {
    return escapeIdentifierName(getBasename(info.path)) + delim;
  }

  return 'prefix' + delim;
};

/**
 * Prefixes identifiers
 *
 * @author strarsis <strarsis@gmail.com>
 * @type {import('./plugins-types').Plugin<'prefixIds'>}
 */
exports.fn = (_root, params, info) => {
  const {
    delim = '__',
    prefix,
    prefixIds = true,
    prefixClassNames = true,
  } = params;

  /** @type {Map<string, string>} */
  const prefixMap = new Map();

  return {
    element: {
      enter: (node) => {
        /**
         * @param {string} id A node identifier or class.
         * @returns {string} Given string with a prefix inserted, or null if the string did not start with "#".
         */
        const prefixGenerator = (id) =>
          generatePrefix(id, node, info, prefix, delim, prefixMap);

        // prefix id/class selectors and url() references in styles
        if (node.name === 'style') {
          // skip empty <style/> elements
          if (node.children.length === 0) {
            return;
          }

          for (const child of node.children) {
            if (child.type !== 'text' && child.type !== 'cdata') {
              continue;
            }

            const cssText = child.value;
            /** @type {?csstree.CssNode} */
            let cssAst = null;
            try {
              cssAst = csstree.parse(cssText, {
                parseValue: true,
                parseCustomProperty: false,
              });
            } catch {
              return;
            }

            csstree.walk(cssAst, (node) => {
              if (
                (prefixIds && node.type === 'IdSelector') ||
                (prefixClassNames && node.type === 'ClassSelector')
              ) {
                node.name = prefixId(prefixGenerator, node.name);
                return;
              }
              if (node.type === 'Url' && node.value.length > 0) {
                const prefixed = prefixReference(
                  prefixGenerator,
                  unquote(node.value),
                );
                if (prefixed != null) {
                  node.value = prefixed;
                }
              }
            });

            child.value = csstree.generate(cssAst);
            return;
          }
        }

        // prefix an ID attribute value
        if (
          prefixIds &&
          node.attributes.id != null &&
          node.attributes.id.length !== 0
        ) {
          node.attributes.id = prefixId(prefixGenerator, node.attributes.id);
        }

        // prefix a class attribute value
        if (
          prefixClassNames &&
          node.attributes.class != null &&
          node.attributes.class.length !== 0
        ) {
          node.attributes.class = node.attributes.class
            .split(/\s+/)
            .map((name) => prefixId(prefixGenerator, name))
            .join(' ');
        }

        // prefix a href attribute value
        // xlink:href is deprecated, must be still supported
        for (const name of ['href', 'xlink:href']) {
          if (
            node.attributes[name] != null &&
            node.attributes[name].length !== 0
          ) {
            const prefixed = prefixReference(
              prefixGenerator,
              node.attributes[name],
            );
            if (prefixed != null) {
              node.attributes[name] = prefixed;
            }
          }
        }

        // prefix a URL attribute value
        for (const name of referencesProps) {
          if (
            node.attributes[name] != null &&
            node.attributes[name].length !== 0
          ) {
            node.attributes[name] = node.attributes[name].replace(
              /\burl\((["'])?(#.+?)\1\)/gi,
              (match, _, url) => {
                const prefixed = prefixReference(prefixGenerator, url);
                if (prefixed == null) {
                  return match;
                }
                return `url(${prefixed})`;
              },
            );
          }
        }

        // prefix begin/end attribute value
        for (const name of ['begin', 'end']) {
          if (
            node.attributes[name] != null &&
            node.attributes[name].length !== 0
          ) {
            const parts = node.attributes[name].split(/\s*;\s+/).map((val) => {
              if (val.endsWith('.end') || val.endsWith('.start')) {
                const [id, postfix] = val.split('.');
                return `${prefixId(prefixGenerator, id)}.${postfix}`;
              }
              return val;
            });
            node.attributes[name] = parts.join('; ');
          }
        }
      },
    },
  };
};
