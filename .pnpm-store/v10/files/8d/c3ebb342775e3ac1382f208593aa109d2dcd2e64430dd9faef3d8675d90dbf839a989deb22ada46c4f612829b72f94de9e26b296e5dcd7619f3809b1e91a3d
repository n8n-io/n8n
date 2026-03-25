'use strict';

const { collectStylesheet } = require('../lib/style');
const { detachNodeFromParent, querySelectorAll } = require('../lib/xast');

/**
 * @typedef {import('../lib/types').XastElement} XastElement
 * @typedef {import('../lib/types').XastParent} XastParent
 * @typedef {import('../lib/types').XastNode} XastNode
 */

exports.name = 'reusePaths';
exports.description =
  'Finds <path> elements with the same d, fill, and ' +
  'stroke, and converts them to <use> elements ' +
  'referencing a single <path> def.';

/**
 * Finds <path> elements with the same d, fill, and stroke, and converts them to
 * <use> elements referencing a single <path> def.
 *
 * @author Jacob Howcroft
 *
 * @type {import('./plugins-types').Plugin<'reusePaths'>}
 */
exports.fn = (root) => {
  const stylesheet = collectStylesheet(root);

  /**
   * @type {Map<string, XastElement[]>}
   */
  const paths = new Map();

  /**
   * Reference to the first defs element that is a direct child of the svg
   * element if one exists.
   *
   * @type {XastElement}
   * @see https://developer.mozilla.org/docs/Web/SVG/Element/defs
   */
  let svgDefs;

  /**
   * Set of hrefs that reference the id of another node.
   *
   * @type {Set<string>}
   */
  const hrefs = new Set();

  return {
    element: {
      enter: (node, parentNode) => {
        if (node.name === 'path' && node.attributes.d != null) {
          const d = node.attributes.d;
          const fill = node.attributes.fill || '';
          const stroke = node.attributes.stroke || '';
          const key = d + ';s:' + stroke + ';f:' + fill;
          let list = paths.get(key);
          if (list == null) {
            list = [];
            paths.set(key, list);
          }
          list.push(node);
        }

        if (
          svgDefs == null &&
          node.name === 'defs' &&
          parentNode.type === 'element' &&
          parentNode.name === 'svg'
        ) {
          svgDefs = node;
        }

        if (node.name === 'use') {
          for (const name of ['href', 'xlink:href']) {
            const href = node.attributes[name];

            if (href != null && href.startsWith('#') && href.length > 1) {
              hrefs.add(href.slice(1));
            }
          }
        }
      },

      exit: (node, parentNode) => {
        if (node.name === 'svg' && parentNode.type === 'root') {
          let defsTag = svgDefs;

          if (defsTag == null) {
            defsTag = {
              type: 'element',
              name: 'defs',
              attributes: {},
              children: [],
            };
            // TODO remove legacy parentNode in v4
            Object.defineProperty(defsTag, 'parentNode', {
              writable: true,
              value: node,
            });
          }

          let index = 0;
          for (const list of paths.values()) {
            if (list.length > 1) {
              /** @type {XastElement} */
              const reusablePath = {
                type: 'element',
                name: 'path',
                attributes: {},
                children: [],
              };

              for (const attr of ['fill', 'stroke', 'd']) {
                if (list[0].attributes[attr] != null) {
                  reusablePath.attributes[attr] = list[0].attributes[attr];
                }
              }

              const originalId = list[0].attributes.id;
              if (
                originalId == null ||
                hrefs.has(originalId) ||
                stylesheet.rules.some(
                  (rule) => rule.selector === `#${originalId}`,
                )
              ) {
                reusablePath.attributes.id = 'reuse-' + index++;
              } else {
                reusablePath.attributes.id = originalId;
                delete list[0].attributes.id;
              }
              // TODO remove legacy parentNode in v4
              Object.defineProperty(reusablePath, 'parentNode', {
                writable: true,
                value: defsTag,
              });
              defsTag.children.push(reusablePath);
              // convert paths to <use>
              for (const pathNode of list) {
                delete pathNode.attributes.d;
                delete pathNode.attributes.stroke;
                delete pathNode.attributes.fill;

                if (
                  defsTag.children.includes(pathNode) &&
                  pathNode.children.length === 0
                ) {
                  if (Object.keys(pathNode.attributes).length === 0) {
                    detachNodeFromParent(pathNode, defsTag);
                    continue;
                  }

                  if (
                    Object.keys(pathNode.attributes).length === 1 &&
                    pathNode.attributes.id != null
                  ) {
                    detachNodeFromParent(pathNode, defsTag);
                    const selector = `[xlink\\:href=#${pathNode.attributes.id}], [href=#${pathNode.attributes.id}]`;
                    for (const child of querySelectorAll(node, selector)) {
                      if (child.type !== 'element') {
                        continue;
                      }
                      for (const name of ['href', 'xlink:href']) {
                        if (child.attributes[name] != null) {
                          child.attributes[name] =
                            '#' + reusablePath.attributes.id;
                        }
                      }
                    }
                    continue;
                  }
                }

                pathNode.name = 'use';
                pathNode.attributes['xlink:href'] =
                  '#' + reusablePath.attributes.id;
              }
            }
          }
          if (defsTag.children.length !== 0) {
            if (node.attributes['xmlns:xlink'] == null) {
              node.attributes['xmlns:xlink'] = 'http://www.w3.org/1999/xlink';
            }

            if (svgDefs == null) {
              node.children.unshift(defsTag);
            }
          }
        }
      },
    },
  };
};
