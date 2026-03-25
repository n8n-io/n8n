'use strict';

const { elems } = require('./_collections');

/**
 * @typedef {import('../lib/types').XastElement} XastElement
 */

exports.name = 'removeXlink';
exports.description =
  'remove xlink namespace and replaces attributes with the SVG 2 equivalent where applicable';

/** URI indicating the Xlink namespace. */
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

/**
 * Map of `xlink:show` values to the SVG 2 `target` attribute values.
 *
 * @type {Record<string, string>}
 * @see https://developer.mozilla.org/docs/Web/SVG/Attribute/xlink:show#usage_notes
 */
const SHOW_TO_TARGET = {
  new: '_blank',
  replace: '_self',
};

/**
 * Elements that use xlink:href, but were deprecated in SVG 2 and therefore
 * don't support the SVG 2 href attribute.
 *
 * @type {Set<string>}
 * @see https://developer.mozilla.org/docs/Web/SVG/Attribute/xlink:href
 * @see https://developer.mozilla.org/docs/Web/SVG/Attribute/href
 */
const LEGACY_ELEMENTS = new Set([
  'cursor',
  'filter',
  'font-face-uri',
  'glyphRef',
  'tref',
]);

/**
 * @param {XastElement} node
 * @param {string[]} prefixes
 * @param {string} attr
 * @returns {string[]}
 */
const findPrefixedAttrs = (node, prefixes, attr) => {
  return prefixes
    .map((prefix) => `${prefix}:${attr}`)
    .filter((attr) => node.attributes[attr] != null);
};

/**
 * Removes XLink namespace prefixes and converts references to XLink attributes
 * to the native SVG equivalent.
 *
 * The XLink namespace is deprecated in SVG 2.
 *
 * @type {import('./plugins-types').Plugin<'removeXlink'>}
 * @see https://developer.mozilla.org/docs/Web/SVG/Attribute/xlink:href
 */
exports.fn = (_, params) => {
  const { includeLegacy } = params;

  /**
   * XLink namespace prefixes that are currently in the stack.
   *
   * @type {string[]}
   */
  const xlinkPrefixes = [];

  /**
   * Namespace prefixes that exist in {@link xlinkPrefixes} but were overridden
   * in a child element to point to another namespace, and so is not treated as
   * an XLink attribute.
   *
   * @type {string[]}
   */
  const overriddenPrefixes = [];

  /**
   * Namespace prefixes that were used in one of the {@link LEGACY_ELEMENTS}.
   *
   * @type {string[]}
   */
  const usedInLegacyElement = [];

  return {
    element: {
      enter: (node) => {
        for (const [key, value] of Object.entries(node.attributes)) {
          if (key.startsWith('xmlns:')) {
            const prefix = key.split(':', 2)[1];

            if (value === XLINK_NAMESPACE) {
              xlinkPrefixes.push(prefix);
              continue;
            }

            if (xlinkPrefixes.includes(prefix)) {
              overriddenPrefixes.push(prefix);
            }
          }
        }

        if (
          overriddenPrefixes.some((prefix) => xlinkPrefixes.includes(prefix))
        ) {
          return;
        }

        const showAttrs = findPrefixedAttrs(node, xlinkPrefixes, 'show');
        let showHandled = node.attributes.target != null;
        for (let i = showAttrs.length - 1; i >= 0; i--) {
          const attr = showAttrs[i];
          const value = node.attributes[attr];
          const mapping = SHOW_TO_TARGET[value];

          if (showHandled || mapping == null) {
            delete node.attributes[attr];
            continue;
          }

          if (mapping !== elems[node.name]?.defaults?.target) {
            node.attributes.target = mapping;
          }

          delete node.attributes[attr];
          showHandled = true;
        }

        const titleAttrs = findPrefixedAttrs(node, xlinkPrefixes, 'title');
        for (let i = titleAttrs.length - 1; i >= 0; i--) {
          const attr = titleAttrs[i];
          const value = node.attributes[attr];
          const hasTitle = node.children.filter(
            (child) => child.type === 'element' && child.name === 'title',
          );

          if (hasTitle.length > 0) {
            delete node.attributes[attr];
            continue;
          }

          /** @type {XastElement} */
          const titleTag = {
            type: 'element',
            name: 'title',
            attributes: {},
            children: [
              {
                type: 'text',
                value,
              },
            ],
          };

          Object.defineProperty(titleTag, 'parentNode', {
            writable: true,
            value: node,
          });

          node.children.unshift(titleTag);
          delete node.attributes[attr];
        }

        const hrefAttrs = findPrefixedAttrs(node, xlinkPrefixes, 'href');

        if (
          hrefAttrs.length > 0 &&
          LEGACY_ELEMENTS.has(node.name) &&
          !includeLegacy
        ) {
          hrefAttrs
            .map((attr) => attr.split(':', 1)[0])
            .forEach((prefix) => usedInLegacyElement.push(prefix));
          return;
        }

        for (let i = hrefAttrs.length - 1; i >= 0; i--) {
          const attr = hrefAttrs[i];
          const value = node.attributes[attr];

          if (node.attributes.href != null) {
            delete node.attributes[attr];
            continue;
          }

          node.attributes.href = value;
          delete node.attributes[attr];
        }
      },
      exit: (node) => {
        for (const [key, value] of Object.entries(node.attributes)) {
          const [prefix, attr] = key.split(':', 2);

          if (
            xlinkPrefixes.includes(prefix) &&
            !overriddenPrefixes.includes(prefix) &&
            !usedInLegacyElement.includes(prefix) &&
            !includeLegacy
          ) {
            delete node.attributes[key];
            continue;
          }

          if (key.startsWith('xmlns:') && !usedInLegacyElement.includes(attr)) {
            if (value === XLINK_NAMESPACE) {
              const index = xlinkPrefixes.indexOf(attr);
              xlinkPrefixes.splice(index, 1);
              delete node.attributes[key];
              continue;
            }

            if (overriddenPrefixes.includes(prefix)) {
              const index = overriddenPrefixes.indexOf(attr);
              overriddenPrefixes.splice(index, 1);
            }
          }
        }
      },
    },
  };
};
