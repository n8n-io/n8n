'use strict';

const csstree = require('css-tree');
const { visit } = require('../lib/xast.js');

exports.name = 'cleanupEnableBackground';
exports.description =
  'remove or cleanup enable-background attribute when possible';

const regEnableBackground =
  /^new\s0\s0\s([-+]?\d*\.?\d+([eE][-+]?\d+)?)\s([-+]?\d*\.?\d+([eE][-+]?\d+)?)$/;

/**
 * Remove or cleanup enable-background attr which coincides with a width/height box.
 *
 * @see https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty
 * @example
 * <svg width="100" height="50" enable-background="new 0 0 100 50">
 *             ⬇
 * <svg width="100" height="50">
 * @author Kir Belevich
 * @type {import('./plugins-types').Plugin<'cleanupEnableBackground'>}
 */
exports.fn = (root) => {
  let hasFilter = false;

  visit(root, {
    element: {
      enter: (node) => {
        if (node.name === 'filter') {
          hasFilter = true;
        }
      },
    },
  });

  return {
    element: {
      enter: (node) => {
        /** @type {?csstree.CssNode} */
        let newStyle = null;
        /** @type {?csstree.ListItem<csstree.CssNode>} */
        let enableBackgroundDeclaration = null;

        if (node.attributes.style != null) {
          newStyle = csstree.parse(node.attributes.style, {
            context: 'declarationList',
          });

          if (newStyle.type === 'DeclarationList') {
            /** @type {csstree.ListItem<csstree.CssNode>[]} */
            const enableBackgroundDeclarations = [];

            csstree.walk(newStyle, (node, nodeItem) => {
              if (
                node.type === 'Declaration' &&
                node.property === 'enable-background'
              ) {
                enableBackgroundDeclarations.push(nodeItem);
                enableBackgroundDeclaration = nodeItem;
              }
            });

            for (let i = 0; i < enableBackgroundDeclarations.length - 1; i++) {
              newStyle.children.remove(enableBackgroundDeclarations[i]);
            }
          }
        }

        if (!hasFilter) {
          delete node.attributes['enable-background'];

          if (newStyle?.type === 'DeclarationList') {
            if (enableBackgroundDeclaration) {
              newStyle.children.remove(enableBackgroundDeclaration);
            }

            if (newStyle.children.isEmpty) {
              delete node.attributes.style;
            } else {
              node.attributes.style = csstree.generate(newStyle);
            }
          }

          return;
        }

        const hasDimensions =
          node.attributes.width != null && node.attributes.height != null;

        if (
          (node.name === 'svg' ||
            node.name === 'mask' ||
            node.name === 'pattern') &&
          hasDimensions
        ) {
          const attrValue = node.attributes['enable-background'];
          const attrCleaned = cleanupValue(
            attrValue,
            node.name,
            node.attributes.width,
            node.attributes.height,
          );

          if (attrCleaned) {
            node.attributes['enable-background'] = attrCleaned;
          } else {
            delete node.attributes['enable-background'];
          }

          if (
            newStyle?.type === 'DeclarationList' &&
            enableBackgroundDeclaration
          ) {
            const styleValue = csstree.generate(
              // @ts-ignore
              enableBackgroundDeclaration.data.value,
            );
            const styleCleaned = cleanupValue(
              styleValue,
              node.name,
              node.attributes.width,
              node.attributes.height,
            );

            if (styleCleaned) {
              // @ts-ignore
              enableBackgroundDeclaration.data.value = {
                type: 'Raw',
                value: styleCleaned,
              };
            } else {
              newStyle.children.remove(enableBackgroundDeclaration);
            }
          }
        }

        if (newStyle?.type === 'DeclarationList') {
          if (newStyle.children.isEmpty) {
            delete node.attributes.style;
          } else {
            node.attributes.style = csstree.generate(newStyle);
          }
        }
      },
    },
  };
};

/**
 * @param {string} value Value of a enable-background attribute or style declaration.
 * @param {string} nodeName Name of the node the value was assigned to.
 * @param {string} width Width of the node the value was assigned to.
 * @param {string} height Height of the node the value was assigned to.
 * @returns {string | undefined} Cleaned up value, or undefined if it's redundant.
 */
const cleanupValue = (value, nodeName, width, height) => {
  const match = regEnableBackground.exec(value);

  if (match != null && width === match[1] && height === match[3]) {
    return nodeName === 'svg' ? undefined : 'new';
  }

  return value;
};
